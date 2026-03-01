// server/svc/availabilityService.js
// Pure business-logic and database-access layer for provider availability.
// Every function receives plain parameters and returns data or throws.
// No knowledge of req/res/Express.

const { getPool } = require('../db');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function getProviderIdByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT iduser FROM `user` WHERE u_email = ? AND u_role IN (\'provider\', \'admin\')',
    [email],
  );
  return rows.length > 0 ? rows[0].iduser : null;
}

async function getServiceProviderId(serviceId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT s_provider_id FROM `service` WHERE idservice = ?',
    [serviceId],
  );
  return rows.length > 0 ? rows[0].s_provider_id : null;
}

/**
 * Verify that the provider (by email) owns the given service.
 * Returns the provider's user id, or throws with a 403.
 */
async function verifyServiceOwnership(serviceId, providerEmail) {
  const providerId = await getProviderIdByEmail(providerEmail);
  if (!providerId) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const serviceProviderId = await getServiceProviderId(serviceId);
  if (!serviceProviderId) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (serviceProviderId !== providerId) {
    const err = new Error('You do not own this service');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return providerId;
}

/**
 * Format a Date object to 'YYYY-MM-DD'.
 */
function formatDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ──────────────────────────────────────────────
// Blocked Dates
// ──────────────────────────────────────────────

/**
 * Get provider's blocked dates within a date range.
 */
async function getBlockedDates(providerEmail, startDate, endDate) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);
  if (!providerId) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const [rows] = await pool.query(
    `SELECT id, pbd_date AS date, pbd_reason AS reason, pbd_created_at AS createdAt
     FROM provider_blocked_date
     WHERE pbd_provider_id = ? AND pbd_date BETWEEN ? AND ?
     ORDER BY pbd_date ASC`,
    [providerId, startDate, endDate],
  );
  return rows;
}

/**
 * Block a single date. Handles duplicate key error gracefully.
 */
async function addBlockedDate(providerEmail, date, reason) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);
  if (!providerId) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO provider_blocked_date (pbd_provider_id, pbd_date, pbd_reason)
       VALUES (?, ?, ?)`,
      [providerId, date, reason || null],
    );
    return { id: result.insertId, date, reason };
  } catch (err) {
    // Duplicate key — date is already blocked
    if (err.code === 'ER_DUP_ENTRY') {
      const dupErr = new Error('This date is already blocked');
      dupErr.statusCode = 409;
      dupErr.code = 'DUPLICATE';
      throw dupErr;
    }
    throw err;
  }
}

/**
 * Block a date range (inclusive). Uses INSERT IGNORE to skip duplicates.
 */
async function addBlockedDateRange(providerEmail, startDate, endDate, reason) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);
  if (!providerId) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Build array of dates in range
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(formatDateStr(current));
    current.setDate(current.getDate() + 1);
  }

  if (dates.length === 0) {
    const err = new Error('Invalid date range');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Batch INSERT IGNORE
  const values = dates.map(d => [providerId, d, reason || null]);
  const [result] = await pool.query(
    'INSERT IGNORE INTO provider_blocked_date (pbd_provider_id, pbd_date, pbd_reason) VALUES ?',
    [values],
  );

  return { blockedCount: result.affectedRows, totalDays: dates.length };
}

/**
 * Remove a blocked date. Verifies provider ownership.
 */
async function removeBlockedDate(providerEmail, blockedDateId) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);
  if (!providerId) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const [result] = await pool.query(
    'DELETE FROM provider_blocked_date WHERE id = ? AND pbd_provider_id = ?',
    [blockedDateId, providerId],
  );

  if (result.affectedRows === 0) {
    const err = new Error('Blocked date not found or you do not own it');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { deleted: true };
}

// ──────────────────────────────────────────────
// Weekly Schedule
// ──────────────────────────────────────────────

/**
 * Get weekly schedule entries for a service (where sa_specific_date IS NULL).
 */
async function getSchedule(serviceId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT idavailability AS id, sa_day_of_week AS dayOfWeek,
            sa_start_time AS startTime, sa_end_time AS endTime,
            sa_is_available AS isAvailable, sa_price_override AS priceOverride
     FROM service_availability
     WHERE sa_service_id = ? AND sa_specific_date IS NULL
     ORDER BY sa_day_of_week ASC`,
    [serviceId],
  );
  return rows;
}

/**
 * Replace the weekly schedule for a service.
 * Verifies provider owns the service.
 * Deletes existing weekly entries then inserts new ones in a transaction.
 *
 * @param {number} serviceId
 * @param {string} providerEmail
 * @param {Array<{ dayOfWeek: number, startTime: string, endTime: string, isAvailable?: boolean, priceOverride?: number }>} schedule
 */
async function updateSchedule(serviceId, providerEmail, schedule) {
  await verifyServiceOwnership(serviceId, providerEmail);

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Delete existing weekly entries (sa_specific_date IS NULL)
    await conn.query(
      'DELETE FROM service_availability WHERE sa_service_id = ? AND sa_specific_date IS NULL',
      [serviceId],
    );

    // Insert new entries
    if (schedule && schedule.length > 0) {
      const values = schedule.map(entry => [
        serviceId,
        entry.dayOfWeek,
        null, // sa_specific_date
        entry.startTime,
        entry.endTime,
        entry.isAvailable !== undefined ? (entry.isAvailable ? 1 : 0) : 1,
        entry.priceOverride || null,
      ]);

      await conn.query(
        `INSERT INTO service_availability
         (sa_service_id, sa_day_of_week, sa_specific_date, sa_start_time, sa_end_time, sa_is_available, sa_price_override)
         VALUES ?`,
        [values],
      );
    }

    await conn.commit();
    return { updated: true, entries: schedule ? schedule.length : 0 };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ──────────────────────────────────────────────
// Availability Checks
// ──────────────────────────────────────────────

/**
 * Check availability for a specific service on a specific date.
 *
 * Logic:
 * 1. Get service's provider_id
 * 2. Check provider blocked dates
 * 3. Check specific date override in service_availability
 * 4. If no override, check day-of-week schedule
 * 5. Check booking conflict
 *
 * Returns: { available: boolean, reason?: string, schedule?: { startTime, endTime } }
 */
async function checkAvailability(serviceId, date) {
  const pool = getPool();

  // 1. Get service's provider_id
  const providerId = await getServiceProviderId(serviceId);
  if (!providerId) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // 2. Check blocked dates
  const [blocked] = await pool.query(
    'SELECT 1 FROM provider_blocked_date WHERE pbd_provider_id = ? AND pbd_date = ? LIMIT 1',
    [providerId, date],
  );
  if (blocked.length > 0) {
    return { available: false, reason: 'Provider has blocked this date' };
  }

  // 3. Check specific date override
  const [specificOverride] = await pool.query(
    `SELECT sa_start_time AS startTime, sa_end_time AS endTime,
            sa_is_available AS isAvailable, sa_price_override AS priceOverride
     FROM service_availability
     WHERE sa_service_id = ? AND sa_specific_date = ?
     LIMIT 1`,
    [serviceId, date],
  );

  let scheduleEntry = null;

  if (specificOverride.length > 0) {
    // Specific date override found
    const override = specificOverride[0];
    if (!override.isAvailable) {
      return { available: false, reason: 'Service is unavailable on this date (specific override)' };
    }
    scheduleEntry = { startTime: override.startTime, endTime: override.endTime };
    if (override.priceOverride != null) {
      scheduleEntry.priceOverride = override.priceOverride;
    }
  } else {
    // 4. Check day-of-week schedule
    const dayOfWeek = new Date(date).getDay(); // 0=Sunday
    const [weeklySchedule] = await pool.query(
      `SELECT sa_start_time AS startTime, sa_end_time AS endTime,
              sa_is_available AS isAvailable, sa_price_override AS priceOverride
       FROM service_availability
       WHERE sa_service_id = ? AND sa_day_of_week = ? AND sa_specific_date IS NULL
       LIMIT 1`,
      [serviceId, dayOfWeek],
    );

    if (weeklySchedule.length === 0) {
      return { available: false, reason: 'No schedule set for this day of the week' };
    }

    const entry = weeklySchedule[0];
    if (!entry.isAvailable) {
      return { available: false, reason: 'Service is unavailable on this day of the week' };
    }
    scheduleEntry = { startTime: entry.startTime, endTime: entry.endTime };
    if (entry.priceOverride != null) {
      scheduleEntry.priceOverride = entry.priceOverride;
    }
  }

  // 5. Check booking conflict
  const [bookingConflict] = await pool.query(
    `SELECT 1 FROM booking b
     JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
     JOIN service s ON bs.bs_service_id = s.idservice
     WHERE s.s_provider_id = ? AND b.b_event_date = ? AND b.b_status IN ('pending', 'confirmed')
     LIMIT 1`,
    [providerId, date],
  );

  if (bookingConflict.length > 0) {
    return { available: false, reason: 'Provider already has a booking on this date', schedule: scheduleEntry };
  }

  return { available: true, schedule: scheduleEntry };
}

/**
 * Get a month-view calendar of availability for a service.
 * Uses batch queries for performance.
 *
 * Returns: [{ date: 'YYYY-MM-DD', available: boolean, reason?: string }]
 */
async function getMonthCalendar(serviceId, year, month) {
  const pool = getPool();

  // Get service's provider_id
  const providerId = await getServiceProviderId(serviceId);
  if (!providerId) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Compute first and last day of month
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDate = new Date(year, month, 0); // last day of month
  const lastDay = formatDateStr(lastDate);

  // Batch queries in parallel
  const [
    [blockedDates],
    [weeklySchedule],
    [specificOverrides],
    [bookings],
  ] = await Promise.all([
    // 1. All blocked dates for provider in month
    pool.query(
      'SELECT pbd_date AS date FROM provider_blocked_date WHERE pbd_provider_id = ? AND pbd_date BETWEEN ? AND ?',
      [providerId, firstDay, lastDay],
    ),
    // 2. All weekly schedule entries
    pool.query(
      `SELECT sa_day_of_week AS dayOfWeek, sa_is_available AS isAvailable,
              sa_start_time AS startTime, sa_end_time AS endTime
       FROM service_availability
       WHERE sa_service_id = ? AND sa_specific_date IS NULL`,
      [serviceId],
    ),
    // 3. All specific date overrides in month
    pool.query(
      `SELECT sa_specific_date AS date, sa_is_available AS isAvailable,
              sa_start_time AS startTime, sa_end_time AS endTime
       FROM service_availability
       WHERE sa_service_id = ? AND sa_specific_date BETWEEN ? AND ?`,
      [serviceId, firstDay, lastDay],
    ),
    // 4. All bookings for provider in month
    pool.query(
      `SELECT DISTINCT b.b_event_date AS date
       FROM booking b
       JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
       JOIN service s ON bs.bs_service_id = s.idservice
       WHERE s.s_provider_id = ? AND b.b_event_date BETWEEN ? AND ? AND b.b_status IN ('pending', 'confirmed')`,
      [providerId, firstDay, lastDay],
    ),
  ]);

  // Build lookup sets/maps for O(1) access
  const blockedSet = new Set(
    blockedDates.map(r => formatDateStr(new Date(r.date))),
  );
  const overrideMap = new Map(
    specificOverrides.map(r => [formatDateStr(new Date(r.date)), r]),
  );
  const bookingSet = new Set(
    bookings.map(r => formatDateStr(new Date(r.date))),
  );
  const weeklyMap = new Map(
    weeklySchedule.map(r => [r.dayOfWeek, r]),
  );

  // Loop through each day of the month
  const calendar = [];
  const daysInMonth = lastDate.getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayObj = new Date(year, month - 1, day);
    const dayOfWeek = dayObj.getDay();

    // Check blocked
    if (blockedSet.has(dateStr)) {
      calendar.push({ date: dateStr, available: false, reason: 'Provider has blocked this date' });
      continue;
    }

    // Check specific override
    const override = overrideMap.get(dateStr);
    if (override) {
      if (!override.isAvailable) {
        calendar.push({ date: dateStr, available: false, reason: 'Service is unavailable on this date (specific override)' });
        continue;
      }
      // Override says available — check booking conflict
      if (bookingSet.has(dateStr)) {
        calendar.push({ date: dateStr, available: false, reason: 'Provider already has a booking on this date' });
        continue;
      }
      calendar.push({ date: dateStr, available: true });
      continue;
    }

    // Check weekly schedule
    const weekly = weeklyMap.get(dayOfWeek);
    if (!weekly) {
      calendar.push({ date: dateStr, available: false, reason: 'No schedule set for this day of the week' });
      continue;
    }
    if (!weekly.isAvailable) {
      calendar.push({ date: dateStr, available: false, reason: 'Service is unavailable on this day of the week' });
      continue;
    }

    // Check booking conflict
    if (bookingSet.has(dateStr)) {
      calendar.push({ date: dateStr, available: false, reason: 'Provider already has a booking on this date' });
      continue;
    }

    calendar.push({ date: dateStr, available: true });
  }

  return calendar;
}

// ──────────────────────────────────────────────
module.exports = {
  // Helpers
  getProviderIdByEmail,
  // Blocked dates
  getBlockedDates,
  addBlockedDate,
  addBlockedDateRange,
  removeBlockedDate,
  // Weekly schedule
  getSchedule,
  updateSchedule,
  // Availability checks
  checkAvailability,
  getMonthCalendar,
};
