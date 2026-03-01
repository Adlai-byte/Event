// server/svc/bookingService.js
// Pure business-logic and database-access layer for bookings.
// Every function receives plain parameters and returns data or throws.
// No knowledge of req/res/Express.

const { getPool } = require('../db');
const { createPaymentLink, createCheckoutSession } = require('../services/paymongo');
const { generateInvoicePDF } = require('../services/invoice');
const availabilityService = require('./availabilityService');

// ──────────────────────────────────────────────
// Helpers (shared across multiple service fns)
// ──────────────────────────────────────────────

async function getUserIdByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
  return rows.length > 0 ? rows[0].iduser : null;
}

async function getUserByEmail(email, extraCols = '') {
  const pool = getPool();
  const cols = extraCols ? `, ${extraCols}` : '';
  const [rows] = await pool.query(`SELECT iduser${cols} FROM \`user\` WHERE u_email = ?`, [email]);
  return rows.length > 0 ? rows[0] : null;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const time = timeStr.toString().slice(0, 5);
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

const ENSURE_NOTIFICATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS \`notification\` (
    \`idnotification\` INT(11) NOT NULL AUTO_INCREMENT,
    \`n_user_id\` INT(11) NOT NULL,
    \`n_title\` VARCHAR(255) NOT NULL,
    \`n_message\` TEXT NOT NULL,
    \`n_type\` VARCHAR(50) NOT NULL DEFAULT 'info',
    \`n_is_read\` TINYINT(1) NOT NULL DEFAULT 0,
    \`n_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`idnotification\`),
    INDEX \`idx_user\` (\`n_user_id\`),
    INDEX \`idx_read\` (\`n_is_read\`),
    INDEX \`idx_created\` (\`n_created_at\`),
    FOREIGN KEY (\`n_user_id\`) REFERENCES \`user\`(\`iduser\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ──────────────────────────────────────────────
// Bookings CRUD
// ──────────────────────────────────────────────

async function listBookings() {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT b.*,
           CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
           u.u_email as client_email
    FROM booking b
    LEFT JOIN user u ON b.b_client_id = u.iduser
    ORDER BY b.b_created_at DESC
  `);

  if (rows.length > 0) {
    const bookingIds = rows.map(b => b.idbooking);
    const [allServices] = await pool.query(`
      SELECT bs.bs_booking_id, s.s_name
      FROM booking_service bs
      LEFT JOIN service s ON bs.bs_service_id = s.idservice
      WHERE bs.bs_booking_id IN (?)
    `, [bookingIds]);
    const servicesByBooking = {};
    for (const s of allServices) {
      if (!servicesByBooking[s.bs_booking_id]) servicesByBooking[s.bs_booking_id] = [];
      servicesByBooking[s.bs_booking_id].push(s.s_name);
    }
    for (const booking of rows) {
      booking.services = servicesByBooking[booking.idbooking] || [];
    }
  }

  return rows;
}

async function getUserBookings(email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  if (!userId) return [];

  const [rows] = await pool.query(`
    SELECT b.*,
           CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
           u.u_email as client_email,
           CASE WHEN EXISTS (
               SELECT 1 FROM payment p
               WHERE p.p_booking_id = b.idbooking
               AND p.p_status = 'completed'
           ) THEN 1 ELSE 0 END as is_paid
    FROM booking b
    LEFT JOIN user u ON b.b_client_id = u.iduser
    WHERE b.b_client_id = ?
    ORDER BY b.b_event_date DESC, b.b_created_at DESC
  `, [userId]);

  if (rows.length > 0) {
    const bookingIds = rows.map(b => b.idbooking);
    const [allServices] = await pool.query(`
      SELECT bs.bs_booking_id, s.idservice, s.s_name, s.s_description, s.s_base_price, s.s_category,
             s.s_duration, s.s_max_capacity, s.s_city, s.s_state, s.s_address,
             bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price,
             (SELECT si.si_image_url
              FROM service_image si
              WHERE si.si_service_id = s.idservice
              AND si.si_is_primary = 1
              LIMIT 1) as primary_image
      FROM booking_service bs
      LEFT JOIN service s ON bs.bs_service_id = s.idservice
      WHERE bs.bs_booking_id IN (?)
    `, [bookingIds]);

    const servicesByBooking = {};
    for (const s of allServices) {
      if (!servicesByBooking[s.bs_booking_id]) servicesByBooking[s.bs_booking_id] = [];
      servicesByBooking[s.bs_booking_id].push(s);
    }
    for (const booking of rows) {
      const services = servicesByBooking[booking.idbooking] || [];
      booking.services = services.map(s => s.s_name);
      booking.serviceDetails = services.map(s => ({
        serviceId: s.idservice,
        name: s.s_name,
        description: s.s_description,
        price: s.s_base_price,
        category: s.s_category,
        duration: s.s_duration,
        capacity: s.s_max_capacity,
        location: s.s_city ? `${s.s_city}${s.s_state ? ', ' + s.s_state : ''}` : (s.s_address || ''),
        quantity: s.bs_quantity,
        unitPrice: s.bs_unit_price,
        totalPrice: s.bs_total_price,
        image: s.primary_image
      }));
      if (services.length > 0 && services[0].primary_image) {
        booking.primary_image = services[0].primary_image;
      }
    }
  }

  return rows;
}

async function getUserBookingsCount(email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  if (!userId) return 0;
  const [countRows] = await pool.query(
    'SELECT COUNT(*) as count FROM booking WHERE b_client_id = ? AND b_status != ?',
    [userId, 'cancelled']
  );
  return countRows[0].count || 0;
}

async function getBookingById(id) {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT b.*,
           CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
           u.u_email as client_email
    FROM booking b
    LEFT JOIN user u ON b.b_client_id = u.iduser
    WHERE b.idbooking = ?
  `, [id]);
  if (rows.length === 0) return null;
  const booking = rows[0];

  const [services] = await pool.query(`
    SELECT s.s_name, bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price
    FROM booking_service bs
    LEFT JOIN service s ON bs.bs_service_id = s.idservice
    WHERE bs.bs_booking_id = ?
  `, [id]);
  booking.services = services;

  return booking;
}

async function createBooking({ clientEmail, serviceId, eventName, eventDate, startTime, endTime, location, attendees, notes }) {
  const pool = getPool();

  const userId = await getUserIdByEmail(clientEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const clientId = userId;

  // Parse date range from notes if multi-day
  let dateRangeInfo = null;
  let checkDates = [eventDate];
  if (notes) {
    try {
      dateRangeInfo = JSON.parse(notes);
      if (dateRangeInfo.startDate && dateRangeInfo.endDate && dateRangeInfo.allDates) {
        checkDates = dateRangeInfo.allDates;
        console.log(`Multi-day booking detected: ${dateRangeInfo.startDate} to ${dateRangeInfo.endDate} (${checkDates.length} days)`);
      }
    } catch (e) { /* notes is plain text */ }
  }

  // Check provider availability before proceeding
  for (const checkDate of checkDates) {
    const availability = await availabilityService.checkAvailability(serviceId, checkDate);
    if (!availability.available) {
      const err = new Error(`Provider is not available on ${checkDate}: ${availability.reason}`);
      err.statusCode = 409; err.code = 'CONFLICT'; throw err;
    }
  }

  // Check for overlapping bookings
  const [overlappingBookings] = await pool.query(
    `SELECT b.b_event_date, b.b_start_time, b.b_end_time, b.b_event_name, b.b_status
     FROM booking b
     INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
     WHERE bs.bs_service_id = ?
     AND b.b_event_date IN (?)
     AND b.b_status IN ('pending', 'confirmed')
     AND (
         (b.b_start_time < ? AND b.b_end_time > ?) OR
         (b.b_start_time < ? AND b.b_end_time > ?) OR
         (b.b_start_time >= ? AND b.b_end_time <= ?) OR
         (b.b_start_time = '00:00:00' AND b.b_end_time = '23:59:59' AND ? = '00:00:00' AND ? = '23:59:59')
     )
     LIMIT 1`,
    [serviceId, checkDates, endTime, startTime, startTime, endTime, startTime, endTime, startTime, endTime]
  );

  if (overlappingBookings.length > 0) {
    const conflict = overlappingBookings[0];
    const conflictStart = conflict.b_start_time.toString().slice(0, 5);
    const conflictEnd = conflict.b_end_time.toString().slice(0, 5);
    const conflictDate = new Date(conflict.b_event_date).toLocaleDateString();
    console.log(`Overlap detected for service ${serviceId} on ${conflict.b_event_date}: ${conflictStart} - ${conflictEnd}`);
    const err = new Error(`This time slot overlaps with an existing booking on ${conflictDate} (${conflictStart} - ${conflictEnd}). Please select a different time.`);
    err.statusCode = 409; err.code = 'CONFLICT'; throw err;
  }

  console.log(`No overlap detected for service ${serviceId} on date range: ${checkDates.join(', ')} (${startTime} - ${endTime})`);

  // Get service details for pricing and provider info
  const [serviceRows] = await pool.query(`
    SELECT s.s_base_price, s.s_duration, s.s_category, s.s_provider_id, s.s_name,
           u.iduser as provider_user_id, u.u_email as provider_email, u.u_fname as provider_fname, u.u_lname as provider_lname
    FROM service s
    LEFT JOIN user u ON s.s_provider_id = u.iduser
    WHERE s.idservice = ?
  `, [serviceId]);
  if (serviceRows.length === 0) {
    const err = new Error('Service not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const basePrice = parseFloat(serviceRows[0].s_base_price) || 0;
  const serviceDuration = parseInt(serviceRows[0].s_duration) || 60;
  const serviceCategory = serviceRows[0].s_category || '';
  const providerUserId = serviceRows[0].provider_user_id;
  const providerEmail = serviceRows[0].provider_email;
  const providerName = `${serviceRows[0].provider_fname || ''} ${serviceRows[0].provider_lname || ''}`.trim() || 'Provider';
  const serviceName = serviceRows[0].s_name || 'Service';

  let calculatedCost = 0;

  if (serviceCategory.toLowerCase() === 'catering') {
    const numAttendees = parseInt(attendees) || 1;
    calculatedCost = basePrice * numAttendees;
  } else {
    const MINUTES_PER_DAY = 1440;
    if (dateRangeInfo && dateRangeInfo.totalDays) {
      calculatedCost = basePrice * dateRangeInfo.totalDays;
      console.log(`Multi-day booking cost: ${basePrice} * ${dateRangeInfo.totalDays} = ${calculatedCost}`);
    } else if (serviceDuration >= MINUTES_PER_DAY) {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      const selectedDurationMinutes = endMinutes - startMinutes;
      const selectedDays = Math.ceil(selectedDurationMinutes / MINUTES_PER_DAY);
      calculatedCost = basePrice * selectedDays;
      console.log(`Per-day booking cost: ${basePrice} * ${selectedDays} = ${calculatedCost} (duration: ${selectedDurationMinutes} minutes)`);
    } else {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      const selectedDurationMinutes = endMinutes - startMinutes;
      calculatedCost = (selectedDurationMinutes / serviceDuration) * basePrice;
      console.log(`Hourly booking cost: (${selectedDurationMinutes} / ${serviceDuration}) * ${basePrice} = ${calculatedCost}`);
    }
  }

  // Transaction: create booking + link service
  const connection = await pool.getConnection();
  let bookingId;
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO booking
       (b_client_id, b_event_name, b_event_date, b_start_time, b_end_time, b_location, b_total_cost, b_attendees, b_notes, b_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [clientId, eventName, eventDate, startTime, endTime, location, calculatedCost, attendees || null, notes || null]
    );
    bookingId = result.insertId;
    await connection.query(
      `INSERT INTO booking_service
       (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price)
       VALUES (?, ?, 1, ?, ?)`,
      [bookingId, serviceId, basePrice, calculatedCost]
    );
    await connection.commit();
  } catch (txErr) {
    await connection.rollback();
    throw txErr;
  } finally {
    connection.release();
  }

  // ── Payment schedule creation ──────────────────────────────────
  // After booking insert, look up the service's deposit config
  const [serviceConfig] = await pool.query(
    `SELECT s_deposit_percent, s_cancellation_policy_id FROM service WHERE idservice = ?`,
    [serviceId]
  );

  const depositPercent = serviceConfig[0]?.s_deposit_percent ?? 100;
  const cancellationPolicyId = serviceConfig[0]?.s_cancellation_policy_id;

  if (depositPercent < 100 && depositPercent > 0) {
    // Split payment
    const depositAmount = Math.round(calculatedCost * (depositPercent / 100) * 100) / 100;
    const balanceAmount = Math.round((calculatedCost - depositAmount) * 100) / 100;

    // Balance due 3 days before event
    const eventDateObj = new Date(eventDate + 'T00:00:00');
    eventDateObj.setDate(eventDateObj.getDate() - 3);
    const balanceDueDate = eventDateObj.toISOString().split('T')[0];

    // Create payment schedule entries
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      'INSERT INTO payment_schedule (ps_booking_id, ps_type, ps_amount, ps_due_date) VALUES (?, ?, ?, ?)',
      [bookingId, 'deposit', depositAmount, today]
    );
    await pool.query(
      'INSERT INTO payment_schedule (ps_booking_id, ps_type, ps_amount, ps_due_date) VALUES (?, ?, ?, ?)',
      [bookingId, 'balance', balanceAmount, balanceDueDate]
    );

    // Update booking with balance due date
    await pool.query(
      'UPDATE booking SET b_balance_due_date = ? WHERE idbooking = ?',
      [balanceDueDate, bookingId]
    );

    // Snapshot the cancellation policy onto the booking
    if (cancellationPolicyId) {
      const cancellationPolicyService = require('./cancellationPolicyService');
      const policy = await cancellationPolicyService.getPolicy(cancellationPolicyId);
      await pool.query(
        'UPDATE booking SET b_cancellation_policy_snapshot = ? WHERE idbooking = ?',
        [JSON.stringify({ name: policy.name, depositPercent: policy.depositPercent, rules: policy.rules }), bookingId]
      );
    }
  } else {
    // Full payment (100% deposit or 0%) — single schedule entry
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      'INSERT INTO payment_schedule (ps_booking_id, ps_type, ps_amount, ps_due_date) VALUES (?, ?, ?, ?)',
      [bookingId, 'deposit', calculatedCost, today]
    );
  }

  // Create notification for provider
  if (providerUserId) {
    try {
      await pool.query(ENSURE_NOTIFICATION_TABLE_SQL);
      const [clientRows] = await pool.query(
        'SELECT CONCAT(u_fname, " ", u_lname) as client_name FROM `user` WHERE iduser = ?',
        [clientId]
      );
      const clientName = clientRows.length > 0 ? clientRows[0].client_name : 'A client';

      const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedStartTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const formattedEndTime = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const notificationTitle = 'New Booking Received';
      const notificationMessage = `${clientName} has booked "${serviceName}" for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.\n\nEvent: ${eventName}\nLocation: ${location}${attendees ? `\nAttendees: ${attendees}` : ''}`;

      await pool.query(
        'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
        [providerUserId, notificationTitle, notificationMessage, 'new_booking', 0]
      );
      console.log(`Notification created for provider user ID ${providerUserId}`);

      // Push notification
      try {
        if (global.sendPushNotification && providerEmail) {
          await global.sendPushNotification(
            providerEmail,
            notificationTitle,
            `${clientName} booked "${serviceName}" for ${formattedDate}`,
            {
              type: 'new_booking',
              bookingId: bookingId.toString(),
              serviceId: serviceId.toString(),
            }
          );
          console.log(`Push notification sent to provider ${providerEmail}`);
        }
      } catch (pushErr) {
        console.error('Failed to send push notification to provider (non-critical):', pushErr);
      }
    } catch (notifErr) {
      console.error('Failed to create notification for provider (non-critical):', notifErr);
    }
  }

  return { id: bookingId, message: 'Booking created successfully' };
}

async function updateBooking(id, { userEmail, eventName, eventDate, startTime, endTime, location, attendees, notes }) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [bookingRows] = await pool.query(
    'SELECT idbooking, b_status, b_event_date, b_start_time, b_end_time FROM booking WHERE idbooking = ? AND b_client_id = ?',
    [id, userId]
  );
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [paymentRows] = await pool.query(
    'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
    [id]
  );
  if (paymentRows.length > 0) {
    const err = new Error('Cannot edit a booking that has been paid'); err.statusCode = 400; err.code = 'VALIDATION_ERROR'; throw err;
  }

  const updateFields = [];
  const updateValues = [];
  if (eventName !== undefined) { updateFields.push('b_event_name = ?'); updateValues.push(eventName); }
  if (eventDate !== undefined) { updateFields.push('b_event_date = ?'); updateValues.push(eventDate); }
  if (startTime !== undefined) { updateFields.push('b_start_time = ?'); updateValues.push(startTime); }
  if (endTime !== undefined) { updateFields.push('b_end_time = ?'); updateValues.push(endTime); }
  if (location !== undefined) { updateFields.push('b_location = ?'); updateValues.push(location); }
  if (attendees !== undefined) { updateFields.push('b_attendees = ?'); updateValues.push(attendees || null); }
  if (notes !== undefined) { updateFields.push('b_notes = ?'); updateValues.push(notes || null); }

  if (updateFields.length === 0) {
    const err = new Error('No fields to update'); err.statusCode = 400; err.code = 'VALIDATION_ERROR'; throw err;
  }

  // Check for overlapping bookings if date/time is being updated
  if (eventDate !== undefined || startTime !== undefined || endTime !== undefined) {
    const finalDate = eventDate || bookingRows[0].b_event_date;
    const finalStartTime = startTime || bookingRows[0].b_start_time;
    const finalEndTime = endTime || bookingRows[0].b_end_time;

    const [serviceRows] = await pool.query(
      'SELECT bs_service_id FROM booking_service WHERE bs_booking_id = ?',
      [id]
    );

    if (serviceRows.length > 0) {
      const serviceIds = serviceRows.map((r) => r.bs_service_id);
      const [overlappingBookings] = await pool.query(`
        SELECT b.b_start_time, b.b_end_time, b.b_event_name, b.b_status
        FROM booking b
        INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
        WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
        AND b.idbooking != ?
        AND b.b_event_date = ?
        AND b.b_status IN ('pending', 'confirmed')
        AND (
            (b.b_start_time < ? AND b.b_end_time > ?) OR
            (b.b_start_time < ? AND b.b_end_time > ?) OR
            (b.b_start_time >= ? AND b.b_end_time <= ?)
        )
      `, [...serviceIds, id, finalDate, finalStartTime, finalEndTime, finalStartTime, finalEndTime, finalStartTime, finalEndTime]);

      if (overlappingBookings.length > 0) {
        const conflict = overlappingBookings[0];
        const conflictStart = conflict.b_start_time.toString().slice(0, 5);
        const conflictEnd = conflict.b_end_time.toString().slice(0, 5);
        const err = new Error(`This time slot overlaps with an existing booking (${conflictStart} - ${conflictEnd}). Please select a different time.`);
        err.statusCode = 409; err.code = 'CONFLICT'; throw err;
      }
    }
  }

  updateFields.push('b_updated_at = NOW()');
  updateValues.push(id);
  const query = `UPDATE booking SET ${updateFields.join(', ')} WHERE idbooking = ?`;
  await pool.query(query, updateValues);

  return { message: 'Booking updated successfully' };
}

// ──────────────────────────────────────────────
// Booking Status
// ──────────────────────────────────────────────

/**
 * Updates a booking status and creates notifications/push.
 * Returns { finalStatus, bookingDetails } so the controller can emit socket events.
 */
async function updateBookingStatus(id, { status, userEmail, cancellation_reason }) {
  const pool = getPool();

  // If userEmail provided, verify ownership
  if (userEmail) {
    const userId = await getUserIdByEmail(userEmail);
    if (!userId) {
      const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
    }
    const [bookingRows] = await pool.query(
      'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
      [id, userId]
    );
    if (bookingRows.length === 0) {
      const err = new Error('You do not have permission to update this booking'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
    }
  }

  // If completing, verify payment
  let finalStatus = status;
  if (status === 'completed') {
    const [paymentRows] = await pool.query(
      'SELECT p_status FROM payment WHERE p_booking_id = ? AND p_status = ? LIMIT 1',
      [id, 'completed']
    );
    if (paymentRows.length === 0) {
      const [bookingCheck] = await pool.query(
        'SELECT is_paid FROM booking WHERE idbooking = ?',
        [id]
      );
      if (bookingCheck.length > 0 && bookingCheck[0].is_paid !== 1) {
        finalStatus = 'cancelled';
        console.log(`Booking ${id} is completed but not paid, changing status to cancelled`);
      }
    }
  }

  if (finalStatus === 'cancelled' && cancellation_reason) {
    await pool.query('UPDATE booking SET b_status = ?, b_notes = ? WHERE idbooking = ?',
      [finalStatus, cancellation_reason, id]);
  } else {
    await pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', [finalStatus, id]);
  }

  // Fetch booking details for notifications
  const [bookingDetails] = await pool.query(`
    SELECT b.b_event_name, b.b_client_id, b.b_event_date,
           CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
           u.u_email as client_email,
           u.iduser as client_user_id,
           s.s_provider_id,
           CONCAT(p.u_fname, ' ', p.u_lname) as provider_name,
           p.u_email as provider_email,
           p.iduser as provider_user_id
    FROM booking b
    INNER JOIN user u ON b.b_client_id = u.iduser
    INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    INNER JOIN user p ON s.s_provider_id = p.iduser
    WHERE b.idbooking = ?
    LIMIT 1
  `, [id]);

  if (bookingDetails.length > 0) {
    const booking = bookingDetails[0];

    await pool.query(ENSURE_NOTIFICATION_TABLE_SQL);

    if (finalStatus === 'cancelled') {
      const cancellationMessage = cancellation_reason
        ? `Your booking "${booking.b_event_name}" has been cancelled.\n\nReason: ${cancellation_reason}`
        : `Your booking "${booking.b_event_name}" has been cancelled.`;
      const providerCancellationMessage = cancellation_reason
        ? `${booking.client_name}'s booking "${booking.b_event_name}" has been cancelled.\n\nReason: ${cancellation_reason}`
        : `${booking.client_name}'s booking "${booking.b_event_name}" has been cancelled.`;

      if (booking.client_user_id) {
        try {
          await pool.query(
            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
            [booking.client_user_id, 'Booking Cancelled', cancellationMessage, 'booking_cancelled', 0]
          );
        } catch (notifErr) { console.error('Failed to create notification for client (non-critical):', notifErr); }
      }
      if (booking.provider_user_id && booking.provider_user_id !== booking.client_user_id) {
        try {
          await pool.query(
            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
            [booking.provider_user_id, 'Booking Cancelled', providerCancellationMessage, 'booking_cancelled', 0]
          );
        } catch (notifErr) { console.error('Failed to create notification for provider (non-critical):', notifErr); }
      }

      // Push notifications
      if (booking.client_email && global.sendPushNotification) {
        global.sendPushNotification(booking.client_email, 'Booking Cancelled', cancellationMessage,
          { type: 'booking_cancelled', bookingId: id.toString(), status: 'cancelled' }
        ).catch(err => console.error('Failed to send push notification to client:', err));
      }
      if (booking.provider_email && booking.provider_email !== booking.client_email && global.sendPushNotification) {
        global.sendPushNotification(booking.provider_email, 'Booking Cancelled', providerCancellationMessage,
          { type: 'booking_cancelled', bookingId: id.toString(), status: 'cancelled' }
        ).catch(err => console.error('Failed to send push notification to provider:', err));
      }
    } else if (finalStatus === 'confirmed') {
      const confirmationMessage = `Your booking "${booking.b_event_name}" has been confirmed!`;
      const providerConfirmationMessage = `${booking.client_name}'s booking "${booking.b_event_name}" has been confirmed.`;

      if (booking.client_user_id) {
        try {
          await pool.query(
            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
            [booking.client_user_id, 'Booking Confirmed', confirmationMessage, 'booking_confirmed', 0]
          );
        } catch (notifErr) { console.error('Failed to create notification for client (non-critical):', notifErr); }
      }
      if (booking.provider_user_id && booking.provider_user_id !== booking.client_user_id) {
        try {
          await pool.query(
            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
            [booking.provider_user_id, 'Booking Confirmed', providerConfirmationMessage, 'booking_confirmed', 0]
          );
        } catch (notifErr) { console.error('Failed to create notification for provider (non-critical):', notifErr); }
      }

      if (booking.client_email && global.sendPushNotification) {
        global.sendPushNotification(booking.client_email, 'Booking Confirmed', confirmationMessage,
          { type: 'booking_confirmed', bookingId: id.toString(), status: 'confirmed' }
        ).catch(err => console.error('Failed to send push notification to client:', err));
      }
      if (booking.provider_email && booking.provider_email !== booking.client_email && global.sendPushNotification) {
        global.sendPushNotification(booking.provider_email, 'Booking Confirmed', providerConfirmationMessage,
          { type: 'booking_confirmed', bookingId: id.toString(), status: 'confirmed' }
        ).catch(err => console.error('Failed to send push notification to provider:', err));
      }
    } else {
      // Other statuses (completed, pending)
      const statusMessages = {
        'completed': 'Your booking has been completed.',
        'pending': 'Your booking is pending confirmation.'
      };
      if (booking.client_email && global.sendPushNotification) {
        global.sendPushNotification(
          booking.client_email,
          `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}`,
          statusMessages[finalStatus] || `Your booking status has been updated to ${finalStatus}`,
          { type: 'booking', bookingId: id.toString(), status: finalStatus }
        ).catch(err => console.error('Failed to send push notification to client:', err));
      }
      if (booking.provider_email && booking.provider_email !== booking.client_email && global.sendPushNotification) {
        global.sendPushNotification(
          booking.provider_email,
          `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}`,
          `${booking.client_name}'s booking has been ${finalStatus}`,
          { type: 'booking', bookingId: id.toString(), status: finalStatus }
        ).catch(err => console.error('Failed to send push notification to provider:', err));
      }
    }
  }

  return { finalStatus, bookingDetails: bookingDetails.length > 0 ? bookingDetails[0] : null };
}

// ──────────────────────────────────────────────
// Payment Methods
// ──────────────────────────────────────────────

async function getPaymentMethods(email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [paymentMethods] = await pool.query(
    `SELECT
        idpayment_method as id,
        pm_type as type,
        pm_account_name as account_name,
        pm_account_number as account_number,
        pm_is_default as is_default,
        pm_created_at as created_at
     FROM payment_method
     WHERE pm_user_id = ?
     ORDER BY pm_is_default DESC, pm_created_at DESC`,
    [userId]
  );
  return paymentMethods;
}

async function addPaymentMethod({ userEmail, type, account_name, account_number, is_default }) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  if (is_default) {
    await pool.query('UPDATE payment_method SET pm_is_default = 0 WHERE pm_user_id = ?', [userId]);
  }

  await pool.query(
    `INSERT INTO payment_method
     (pm_user_id, pm_type, pm_account_name, pm_account_number, pm_is_default)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, account_name.trim(), account_number.trim(), is_default ? 1 : 0]
  );

  return { message: 'Payment method added successfully' };
}

async function setDefaultPaymentMethod(id, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [pmRows] = await pool.query(
    'SELECT idpayment_method FROM payment_method WHERE idpayment_method = ? AND pm_user_id = ?',
    [id, userId]
  );
  if (pmRows.length === 0) {
    const err = new Error('Payment method not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  await pool.query('UPDATE payment_method SET pm_is_default = 0 WHERE pm_user_id = ?', [userId]);
  await pool.query('UPDATE payment_method SET pm_is_default = 1 WHERE idpayment_method = ?', [id]);

  return { message: 'Default payment method updated' };
}

async function deletePaymentMethod(id, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [pmRows] = await pool.query(
    'SELECT idpayment_method FROM payment_method WHERE idpayment_method = ? AND pm_user_id = ?',
    [id, userId]
  );
  if (pmRows.length === 0) {
    const err = new Error('Payment method not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  await pool.query('DELETE FROM payment_method WHERE idpayment_method = ?', [id]);

  return { message: 'Payment method deleted successfully' };
}

// ──────────────────────────────────────────────
// Payment Processing
// ──────────────────────────────────────────────

async function createPaymongoPayment(bookingId, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [bookingRows] = await pool.query(
    'SELECT idbooking, b_total_cost, b_status, b_event_name FROM booking WHERE idbooking = ? AND b_client_id = ?',
    [bookingId, userId]
  );
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const booking = bookingRows[0];
  if (booking.b_status !== 'confirmed') {
    const err = new Error('Booking must be confirmed before payment'); err.statusCode = 400; err.code = 'VALIDATION_ERROR'; throw err;
  }

  const [existingPayment] = await pool.query(
    'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
    [bookingId]
  );
  if (existingPayment.length > 0) {
    const err = new Error('This booking has already been paid'); err.statusCode = 400; err.code = 'DUPLICATE'; throw err;
  }

  const amount = parseFloat(booking.b_total_cost);
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  const successUrl = `${apiBaseUrl}/api/payments/paymongo/success?bookingId=${bookingId}&userEmail=${encodeURIComponent(userEmail)}`;
  const failedUrl = `${apiBaseUrl}/api/payments/paymongo/failed?bookingId=${bookingId}&userEmail=${encodeURIComponent(userEmail)}`;

  const transactionId = `EVT-${bookingId}-${Date.now()}`;
  const connection = await pool.getConnection();
  let paymentId = null;

  try {
    await connection.beginTransaction();
    const [existingPendingPayment] = await connection.query(
      'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status IN ("pending", "processing")',
      [bookingId]
    );
    if (existingPendingPayment.length === 0) {
      const [paymentResult] = await connection.query(
        `INSERT INTO payment
         (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
         VALUES (?, ?, ?, 'PHP', 'pending', 'PayMongo GCash', ?)`,
        [bookingId, userId, amount, transactionId]
      );
      paymentId = paymentResult.insertId;
    } else {
      paymentId = existingPendingPayment[0].idpayment;
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Get provider's PayMongo credentials
  const [providerRows] = await pool.query(`
    SELECT DISTINCT u.u_paymongo_secret_key, u.u_paymongo_public_key, u.u_paymongo_mode, u.u_email, u.u_fname, u.u_lname
    FROM booking_service bs
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    INNER JOIN user u ON s.s_provider_id = u.iduser
    WHERE bs.bs_booking_id = ?
  `, [bookingId]);

  console.log(`[Payment] Found ${providerRows.length} provider(s) for booking ${bookingId}`);

  let providerCredentials = null;
  if (providerRows.length > 0) {
    const providerWithCredentials = providerRows.find(p => p.u_paymongo_secret_key) || providerRows[0];
    if (providerWithCredentials.u_paymongo_secret_key) {
      providerCredentials = {
        secretKey: providerWithCredentials.u_paymongo_secret_key,
        publicKey: providerWithCredentials.u_paymongo_public_key,
        mode: providerWithCredentials.u_paymongo_mode || (providerWithCredentials.u_paymongo_secret_key.startsWith('sk_test_') ? 'test' : 'live'),
        providerEmail: providerWithCredentials.u_email,
        providerName: `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim(),
      };
      console.log('Using provider PayMongo credentials:', {
        providerName: providerCredentials.providerName,
        providerEmail: providerCredentials.providerEmail,
        mode: providerCredentials.mode,
        secretKeyPrefix: providerCredentials.secretKey.substring(0, 10) + '...',
      });
    } else {
      const providerName = `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim() || providerWithCredentials.u_email;
      console.log('Provider found but no PayMongo credentials configured:', {
        providerEmail: providerWithCredentials.u_email,
        providerName: providerName,
      });
      const err = new Error('Provider not yet set up his payment'); err.statusCode = 400; err.code = 'PAYMENT_ERROR'; throw err;
    }
  } else {
    console.log('No provider found for booking');
    const err = new Error('Provider not yet set up his payment'); err.statusCode = 400; err.code = 'PAYMENT_ERROR'; throw err;
  }

  let paymentData;
  let paymentMethod = 'PayMongo Checkout Session';

  try {
    paymentData = await createCheckoutSession({
      amount: amount,
      description: `Payment for booking: ${booking.b_event_name || 'Event Booking'}`,
      successUrl: successUrl,
      failedUrl: failedUrl,
      metadata: {
        booking_id: bookingId.toString(),
        user_id: userId.toString(),
        payment_id: paymentId?.toString(),
        transaction_id: transactionId,
      },
      secretKey: providerCredentials?.secretKey,
      mode: providerCredentials?.mode,
    });

    if (paymentId && paymentData.sessionId) {
      await pool.query(
        'UPDATE payment SET p_transaction_id = ?, p_payment_method = ? WHERE idpayment = ?',
        [`${transactionId}|${paymentData.sessionId}`, paymentMethod, paymentId]
      );
    }

    console.log('PayMongo Checkout Session created:', {
      bookingId, amount,
      checkoutUrl: paymentData.checkoutUrl,
      sessionId: paymentData.sessionId,
    });
  } catch (checkoutError) {
    console.error('Checkout Session creation failed, trying Payment Link:', checkoutError.message);

    try {
      paymentData = await createPaymentLink({
        amount: amount,
        description: `Payment for booking: ${booking.b_event_name || 'Event Booking'}`,
        successUrl: successUrl,
        failedUrl: failedUrl,
        metadata: {
          booking_id: bookingId.toString(),
          user_id: userId.toString(),
          payment_id: paymentId?.toString(),
          transaction_id: transactionId,
        },
        secretKey: providerCredentials?.secretKey,
        mode: providerCredentials?.mode,
      });

      paymentMethod = 'PayMongo Payment Link';

      if (paymentId && paymentData.linkId) {
        await pool.query(
          'UPDATE payment SET p_transaction_id = ?, p_payment_method = ? WHERE idpayment = ?',
          [`${transactionId}|${paymentData.linkId}`, paymentMethod, paymentId]
        );
      }

      console.log('PayMongo Payment Link created:', {
        bookingId, amount,
        checkoutUrl: paymentData.checkoutUrl,
        linkId: paymentData.linkId,
      });
    } catch (linkError) {
      console.error('Payment Link API creation failed, trying provider payment link:', linkError.message);

      let providerLinkRows = providerRows;
      if (!providerLinkRows || providerLinkRows.length === 0) {
        [providerLinkRows] = await pool.query(`
          SELECT DISTINCT u.u_paymongo_payment_link
          FROM booking_service bs
          INNER JOIN service s ON bs.bs_service_id = s.idservice
          INNER JOIN user u ON s.s_provider_id = u.iduser
          WHERE bs.bs_booking_id = ?
          LIMIT 1
        `, [bookingId]);
      }

      if (providerLinkRows.length > 0 && providerLinkRows[0].u_paymongo_payment_link) {
        const providerLink = providerLinkRows[0].u_paymongo_payment_link;
        paymentMethod = 'PayMongo Provider Link';

        let finalLink = providerLink;
        try {
          const url = new URL(providerLink);
          url.searchParams.set('amount', amount.toString());
          finalLink = url.toString();
        } catch (e) {
          const separator = providerLink.includes('?') ? '&' : '?';
          finalLink = `${providerLink}${separator}amount=${amount}`;
        }

        paymentData = {
          linkId: null,
          sessionId: null,
          checkoutUrl: finalLink,
          status: 'pending',
          amount: amount * 100,
          currency: 'PHP',
        };

        console.log('Using provider payment link as final fallback:', {
          bookingId, amount, checkoutUrl: finalLink,
        });
      } else {
        throw new Error(`Payment creation failed. Checkout Session: ${checkoutError.message}, Payment Link: ${linkError.message}. Provider payment link also not configured.`);
      }
    }
  }

  return {
    paymentUrl: paymentData.checkoutUrl,
    sessionId: paymentData.sessionId || null,
    linkId: paymentData.linkId || null,
    sourceId: paymentData.sourceId || null,
    paymentIntentId: paymentData.paymentIntentId || null,
    amount: amount,
    paymentId: paymentId,
  };
}

async function processCashPayment(bookingId, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [bookingRows] = await pool.query(
    'SELECT b_client_id, b_total_cost, b_status FROM booking WHERE idbooking = ?',
    [bookingId]
  );
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const booking = bookingRows[0];
  if (booking.b_client_id !== userId) {
    const err = new Error('You can only pay for your own bookings'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }

  const [existingPayment] = await pool.query(
    'SELECT idpayment, p_status FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
    [bookingId]
  );
  if (existingPayment.length > 0) {
    const err = new Error('This booking has already been paid'); err.statusCode = 400; err.code = 'DUPLICATE'; throw err;
  }

  const amount = parseFloat(booking.b_total_cost) || 0;

  const connection = await pool.getConnection();
  let paymentId = null;
  try {
    await connection.beginTransaction();
    const [existingPendingPayment] = await connection.query(
      'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status IN ("pending", "processing") AND p_payment_method = "Cash on Hand"',
      [bookingId]
    );
    if (existingPendingPayment.length === 0) {
      const [paymentResult] = await connection.query(
        `INSERT INTO payment
         (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
         VALUES (?, ?, ?, 'PHP', 'pending', 'Cash on Hand', ?)`,
        [bookingId, userId, amount, `CASH-${Date.now()}-${bookingId}`]
      );
      paymentId = paymentResult.insertId;
    } else {
      paymentId = existingPendingPayment[0].idpayment;
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  console.log(`Cash payment recorded for booking ${bookingId} (Payment ID: ${paymentId})`);
  return { message: 'Cash payment recorded successfully', paymentId };
}

async function handlePaymongoSuccess(bookingId, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return { found: false };

  const [updateResult] = await pool.query(
    `UPDATE payment
     SET p_status = 'completed', p_paid_at = NOW()
     WHERE p_booking_id = ? AND p_user_id = ? AND p_status IN ('pending', 'processing')`,
    [parseInt(bookingId), userId]
  );

  if (updateResult.affectedRows > 0) {
    console.log('Payment marked as completed for booking:', bookingId);
  }

  return { found: true };
}

async function handlePaymongoFailed(bookingId, userEmail) {
  const pool = getPool();
  if (!bookingId || !userEmail) return;

  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return;

  await pool.query(
    `UPDATE payment
     SET p_status = 'failed'
     WHERE p_booking_id = ? AND p_user_id = ? AND p_status IN ('pending', 'processing')`,
    [parseInt(bookingId), userId]
  );
  console.log('Payment marked as failed for booking:', bookingId);
}

async function markPaymentComplete(bookingId, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [bookingRows] = await pool.query(
    'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
    [bookingId, userId]
  );
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [updateResult] = await pool.query(
    `UPDATE payment
     SET p_status = 'completed', p_paid_at = NOW()
     WHERE p_booking_id = ? AND p_user_id = ? AND p_status IN ('pending', 'processing')`,
    [bookingId, userId]
  );
  if (updateResult.affectedRows === 0) {
    const err = new Error('No pending payment found for this booking'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  console.log('Payment marked as completed for booking:', bookingId);

  // Check if any completed payments are linked to payment_schedule entries
  const [scheduleLinks] = await pool.query(
    `SELECT ps.* FROM payment_schedule ps
     INNER JOIN payment p ON ps.ps_payment_id = p.idpayment
     WHERE p.p_booking_id = ? AND p.p_user_id = ? AND p.p_status = 'completed'`,
    [bookingId, userId]
  );
  for (const sl of scheduleLinks) {
    if (sl.ps_type === 'deposit' && sl.ps_status !== 'paid') {
      // Mark schedule as paid
      await pool.query('UPDATE payment_schedule SET ps_status = ? WHERE id = ?', ['paid', sl.id]);
      // Auto-confirm booking
      await pool.query(
        'UPDATE booking SET b_deposit_paid = 1, b_status = ? WHERE idbooking = ? AND b_status = ?',
        ['confirmed', sl.ps_booking_id, 'pending']
      );
    }
    if (sl.ps_type === 'balance' && sl.ps_status !== 'paid') {
      await pool.query('UPDATE payment_schedule SET ps_status = ? WHERE id = ?', ['paid', sl.id]);
    }
  }

  // Get provider email for socket notification
  const [providerRow] = await pool.query(`
    SELECT DISTINCT p.u_email as provider_email
    FROM booking_service bs
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    INNER JOIN user p ON s.s_provider_id = p.iduser
    WHERE bs.bs_booking_id = ?
    LIMIT 1
  `, [bookingId]);

  const providerEmail = (providerRow.length > 0) ? providerRow[0].provider_email : null;

  return { bookingId, providerEmail };
}

// ──────────────────────────────────────────────
// Provider Bookings
// ──────────────────────────────────────────────

async function getProviderBookings({ providerId, providerEmail }) {
  const pool = getPool();

  let userId;
  if (providerEmail) {
    userId = await getUserIdByEmail(providerEmail);
    if (!userId) return [];
  } else if (providerId) {
    if (providerId.includes('@')) {
      userId = await getUserIdByEmail(providerId);
      if (!userId) return [];
    } else {
      return [];
    }
  }

  const [rows] = await pool.query(`
    SELECT DISTINCT
        b.idbooking,
        b.b_event_name,
        b.b_event_date,
        b.b_start_time,
        b.b_end_time,
        b.b_location,
        b.b_total_cost,
        b.b_status,
        b.b_created_at,
        b.b_deposit_paid,
        b.b_balance_due_date,
        CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
        u.u_email as client_email,
        u.u_phone as client_phone,
        CONCAT(
            COALESCE(u.u_address, ''),
            CASE WHEN u.u_address IS NOT NULL AND u.u_address != '' AND u.u_city IS NOT NULL AND u.u_city != '' THEN ', ' ELSE '' END,
            COALESCE(u.u_city, ''),
            CASE WHEN u.u_city IS NOT NULL AND u.u_city != '' AND u.u_state IS NOT NULL AND u.u_state != '' THEN ', ' ELSE '' END,
            COALESCE(u.u_state, ''),
            CASE WHEN u.u_zip_code IS NOT NULL AND u.u_zip_code != '' THEN ' ' ELSE '' END,
            COALESCE(u.u_zip_code, '')
        ) as client_address,
        GROUP_CONCAT(DISTINCT s.s_name SEPARATOR ', ') as service_name,
        MAX(CASE WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN p.p_payment_method ELSE NULL END) as payment_method,
        MAX(CASE WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN p.p_status ELSE NULL END) as payment_status,
        MAX(CASE
            WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN 1
            ELSE 0
        END) as has_pending_cash_payment,
        MAX(CASE WHEN p.p_status = 'completed' THEN 1 ELSE 0 END) as is_paid
    FROM booking b
    INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    LEFT JOIN user u ON b.b_client_id = u.iduser
    LEFT JOIN payment p ON b.idbooking = p.p_booking_id
    WHERE s.s_provider_id = ?
    GROUP BY b.idbooking, b.b_event_name, b.b_event_date, b.b_start_time, b.b_end_time,
             b.b_location, b.b_total_cost, b.b_status, b.b_created_at, b.b_deposit_paid, b.b_balance_due_date,
             u.u_fname, u.u_lname, u.u_email, u.u_phone, u.u_address, u.u_city, u.u_state, u.u_zip_code
    ORDER BY b.b_event_date DESC, b.b_created_at DESC
  `, [userId]);

  // Process: if completed but not paid, cancel
  const processedRows = rows.map(row => {
    if (row.b_status === 'completed' && row.is_paid !== 1) {
      pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', ['cancelled', row.idbooking]).catch(err => {
        console.error('Error updating booking status:', err);
      });
      return { ...row, b_status: 'cancelled' };
    }
    return row;
  });

  return processedRows;
}

async function markCashPaymentPaid(bookingId, providerEmail) {
  const pool = getPool();
  const providerUserId = await getUserIdByEmail(providerEmail);
  if (!providerUserId) {
    const err = new Error('Provider not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [bookingRows] = await pool.query(`
    SELECT b.idbooking
    FROM booking b
    INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    WHERE b.idbooking = ? AND s.s_provider_id = ?
    LIMIT 1
  `, [bookingId, providerUserId]);

  if (bookingRows.length === 0) {
    const err = new Error('You can only mark payments for your own bookings'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }

  const [updateResult] = await pool.query(
    `UPDATE payment
     SET p_status = 'completed', p_paid_at = NOW()
     WHERE p_booking_id = ? AND p_payment_method = 'Cash on Hand' AND p_status = 'pending'`,
    [bookingId]
  );
  if (updateResult.affectedRows === 0) {
    const err = new Error('No pending cash payment found for this booking'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  console.log(`Cash payment marked as paid for booking ${bookingId} by provider ${providerEmail}`);

  // Get client email for socket notification
  const [clientRow] = await pool.query(`
    SELECT u.u_email as client_email
    FROM booking b
    INNER JOIN user u ON b.b_client_id = u.iduser
    WHERE b.idbooking = ?
    LIMIT 1
  `, [bookingId]);

  const clientEmail = (clientRow.length > 0) ? clientRow[0].client_email : null;

  // Get payment details for response
  const [paymentRows] = await pool.query(
    'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
    [bookingId]
  );

  return {
    message: 'Payment marked as paid successfully',
    payment: paymentRows.length > 0 ? paymentRows[0] : null,
    clientEmail,
  };
}

// ──────────────────────────────────────────────
// Invoices
// ──────────────────────────────────────────────

async function generateProviderInvoice(bookingId, providerEmail) {
  const pool = getPool();
  const [providerRows] = await pool.query(
    'SELECT iduser, u_fname, u_lname, u_email, u_address, u_city, u_state FROM `user` WHERE u_email = ?',
    [providerEmail]
  );
  if (providerRows.length === 0) {
    const err = new Error('Provider not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const provider = providerRows[0];

  const [bookingRows] = await pool.query(`
    SELECT b.*,
           CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
           u.u_email as client_email,
           u.u_address as client_address,
           u.u_city as client_city,
           u.u_state as client_state
    FROM booking b
    LEFT JOIN user u ON b.b_client_id = u.iduser
    WHERE b.idbooking = ?
  `, [bookingId]);
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const booking = bookingRows[0];

  const [serviceRows] = await pool.query(`
    SELECT s.idservice
    FROM booking_service bs
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    WHERE bs.bs_booking_id = ? AND s.s_provider_id = ?
    LIMIT 1
  `, [bookingId, provider.iduser]);
  if (serviceRows.length === 0) {
    const err = new Error('You can only generate invoices for your own bookings'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }

  const [services] = await pool.query(`
    SELECT s.s_name as name,
           bs.bs_quantity as quantity,
           bs.bs_unit_price as unitPrice,
           bs.bs_total_price as totalPrice
    FROM booking_service bs
    LEFT JOIN service s ON bs.bs_service_id = s.idservice
    WHERE bs.bs_booking_id = ?
  `, [bookingId]);

  const [paymentRows] = await pool.query(
    'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
    [bookingId]
  );
  if (paymentRows.length === 0) {
    const err = new Error('No completed payment found for this booking'); err.statusCode = 400; err.code = 'VALIDATION_ERROR'; throw err;
  }
  const payment = paymentRows[0];

  const invoiceData = {
    booking: {
      id: booking.idbooking,
      eventName: booking.b_event_name,
      date: formatDate(booking.b_event_date),
      time: `${formatTime(booking.b_start_time)} - ${formatTime(booking.b_end_time)}`,
      location: booking.b_location,
      totalCost: parseFloat(booking.b_total_cost) || 0,
    },
    client: {
      name: booking.client_name || 'Client',
      email: booking.client_email || '',
      address: [booking.client_address, booking.client_city, booking.client_state].filter(Boolean).join(', ') || '',
    },
    provider: {
      name: `${provider.u_fname} ${provider.u_lname}`.trim() || 'Service Provider',
      email: provider.u_email || '',
      address: [provider.u_address, provider.u_city, provider.u_state].filter(Boolean).join(', ') || '',
    },
    payment: {
      method: payment.p_payment_method || 'Cash on Hand',
      status: payment.p_status || 'completed',
      paidAt: formatDate(payment.p_paid_at),
      transactionId: payment.p_transaction_id || '',
    },
    services: services.map(s => ({
      name: s.name || 'Service',
      quantity: s.quantity || 1,
      unitPrice: parseFloat(s.unitPrice) || 0,
      totalPrice: parseFloat(s.totalPrice) || 0,
    })),
  };

  const pdfBuffer = await generateInvoicePDF(invoiceData);
  return pdfBuffer;
}

async function generateUserInvoice(bookingId, userEmail) {
  const pool = getPool();
  const [userRows] = await pool.query(
    'SELECT iduser, u_fname, u_lname, u_email, u_address, u_city, u_state FROM `user` WHERE u_email = ?',
    [userEmail]
  );
  if (userRows.length === 0) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const user = userRows[0];

  const [bookingRows] = await pool.query(`
    SELECT b.*
    FROM booking b
    WHERE b.idbooking = ? AND b.b_client_id = ?
  `, [bookingId, user.iduser]);
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found or does not belong to you'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const booking = bookingRows[0];

  const [providerRows] = await pool.query(`
    SELECT DISTINCT u.u_fname, u.u_lname, u.u_email, u.u_address, u.u_city, u.u_state
    FROM booking_service bs
    INNER JOIN service s ON bs.bs_service_id = s.idservice
    INNER JOIN user u ON s.s_provider_id = u.iduser
    WHERE bs.bs_booking_id = ?
    LIMIT 1
  `, [bookingId]);
  const provider = providerRows.length > 0 ? providerRows[0] : {
    u_fname: 'Service', u_lname: 'Provider', u_email: '', u_address: '', u_city: '', u_state: ''
  };

  const [services] = await pool.query(`
    SELECT s.s_name as name,
           bs.bs_quantity as quantity,
           bs.bs_unit_price as unitPrice,
           bs.bs_total_price as totalPrice
    FROM booking_service bs
    LEFT JOIN service s ON bs.bs_service_id = s.idservice
    WHERE bs.bs_booking_id = ?
  `, [bookingId]);

  const [paymentRows] = await pool.query(
    'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
    [bookingId]
  );
  if (paymentRows.length === 0) {
    const err = new Error('No completed payment found for this booking'); err.statusCode = 400; err.code = 'VALIDATION_ERROR'; throw err;
  }
  const payment = paymentRows[0];

  const invoiceData = {
    booking: {
      id: booking.idbooking,
      eventName: booking.b_event_name,
      date: formatDate(booking.b_event_date),
      time: `${formatTime(booking.b_start_time)} - ${formatTime(booking.b_end_time)}`,
      location: booking.b_location,
      totalCost: parseFloat(booking.b_total_cost) || 0,
    },
    client: {
      name: `${user.u_fname} ${user.u_lname}`.trim() || 'Client',
      email: user.u_email || '',
      address: [user.u_address, user.u_city, user.u_state].filter(Boolean).join(', ') || '',
    },
    provider: {
      name: `${provider.u_fname} ${provider.u_lname}`.trim() || 'Service Provider',
      email: provider.u_email || '',
      address: [provider.u_address, provider.u_city, provider.u_state].filter(Boolean).join(', ') || '',
    },
    payment: {
      method: payment.p_payment_method || 'Cash on Hand',
      status: payment.p_status || 'completed',
      paidAt: formatDate(payment.p_paid_at),
      transactionId: payment.p_transaction_id || '',
    },
    services: services.map(s => ({
      name: s.name || 'Service',
      quantity: s.quantity || 1,
      unitPrice: parseFloat(s.unitPrice) || 0,
      totalPrice: parseFloat(s.totalPrice) || 0,
    })),
  };

  const pdfBuffer = await generateInvoicePDF(invoiceData);
  return pdfBuffer;
}

// ──────────────────────────────────────────────
// Ratings
// ──────────────────────────────────────────────

async function submitRating(bookingId, serviceId, { userEmail, rating, comment }) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) {
    const err = new Error('User not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [bookingRows] = await pool.query(
    'SELECT b_client_id, b_status FROM booking WHERE idbooking = ?',
    [bookingId]
  );
  if (bookingRows.length === 0) {
    const err = new Error('Booking not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const booking = bookingRows[0];
  if (booking.b_client_id !== userId) {
    const err = new Error('You can only rate services for your own bookings'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }
  if (booking.b_status !== 'completed') {
    const err = new Error('You can only rate services for completed bookings'); err.statusCode = 400; err.code = 'VALIDATION_ERROR'; throw err;
  }

  const [serviceRows] = await pool.query(
    'SELECT bs_service_id FROM booking_service WHERE bs_booking_id = ? AND bs_service_id = ?',
    [bookingId, serviceId]
  );
  if (serviceRows.length === 0) {
    const err = new Error('Service not found in this booking'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const [existingRating] = await pool.query(
    'SELECT idreview FROM service_review WHERE sr_booking_id = ? AND sr_service_id = ? AND sr_user_id = ?',
    [bookingId, serviceId, userId]
  );

  if (existingRating.length > 0) {
    await pool.query(
      'UPDATE service_review SET sr_rating = ?, sr_comment = ?, sr_updated_at = NOW() WHERE idreview = ?',
      [rating, comment || null, existingRating[0].idreview]
    );
  } else {
    await pool.query(
      'INSERT INTO service_review (sr_service_id, sr_booking_id, sr_user_id, sr_rating, sr_comment) VALUES (?, ?, ?, ?, ?)',
      [serviceId, bookingId, userId, rating, comment || null]
    );
  }

  // Update service average
  const [ratingStats] = await pool.query(`
    SELECT AVG(sr_rating) as avg_rating, COUNT(*) as review_count
    FROM service_review
    WHERE sr_service_id = ?
  `, [serviceId]);

  if (ratingStats.length > 0) {
    const avgRating = parseFloat(ratingStats[0].avg_rating) || 0;
    const reviewCount = parseInt(ratingStats[0].review_count) || 0;
    await pool.query(
      'UPDATE service SET s_rating = ?, s_review_count = ? WHERE idservice = ?',
      [avgRating, reviewCount, serviceId]
    );
  }

  return { message: 'Rating submitted successfully' };
}

async function getRating(bookingId, serviceId, userEmail) {
  const pool = getPool();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return null;

  const [ratingRows] = await pool.query(
    'SELECT sr_rating, sr_comment, sr_created_at, sr_updated_at FROM service_review WHERE sr_booking_id = ? AND sr_service_id = ? AND sr_user_id = ?',
    [bookingId, serviceId, userId]
  );

  if (ratingRows.length === 0) return null;

  return {
    rating: ratingRows[0].sr_rating,
    comment: ratingRows[0].sr_comment,
    createdAt: ratingRows[0].sr_created_at,
    updatedAt: ratingRows[0].sr_updated_at,
  };
}

// ──────────────────────────────────────────────
// Deposit / Balance Payment Schedule
// ──────────────────────────────────────────────

async function getPaymentSchedule(bookingId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ps.*, p.p_status as payment_status, p.p_paid_at
     FROM payment_schedule ps
     LEFT JOIN payment p ON ps.ps_payment_id = p.idpayment
     WHERE ps.ps_booking_id = ?
     ORDER BY FIELD(ps.ps_type, 'deposit', 'balance')`,
    [bookingId]
  );
  return rows.map(r => ({
    id: r.id,
    type: r.ps_type,
    amount: parseFloat(r.ps_amount),
    dueDate: r.ps_due_date,
    status: r.ps_status,
    paymentId: r.ps_payment_id,
    paymentStatus: r.payment_status,
    paidAt: r.p_paid_at,
  }));
}

async function payDeposit(bookingId, userEmail, paymentMethod) {
  const pool = getPool();

  // Verify user and ownership
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const [bookings] = await pool.query('SELECT * FROM booking WHERE idbooking = ? AND b_client_id = ?', [bookingId, userId]);
  if (!bookings.length) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });

  // Use transaction to prevent duplicate payments
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the schedule row to prevent concurrent payments
    const [schedules] = await conn.query(
      'SELECT * FROM payment_schedule WHERE ps_booking_id = ? AND ps_type = ? AND ps_status = ? FOR UPDATE',
      [bookingId, 'deposit', 'pending']
    );
    if (!schedules.length) {
      await conn.rollback();
      throw Object.assign(new Error('No pending deposit found'), { statusCode: 400 });
    }
    const schedule = schedules[0];
    const amount = parseFloat(schedule.ps_amount);

    const [result] = await conn.query(
      `INSERT INTO payment (p_booking_id, p_user_id, p_amount, p_type, p_currency, p_status, p_payment_method)
       VALUES (?, ?, ?, 'deposit', 'PHP', 'pending', ?)`,
      [bookingId, userId, amount, paymentMethod === 'cash' ? 'Cash on Hand' : 'PayMongo']
    );
    const paymentId = result.insertId;

    await conn.query('UPDATE payment_schedule SET ps_payment_id = ? WHERE id = ?', [paymentId, schedule.id]);
    await conn.commit();

    if (paymentMethod === 'cash') {
      return { paymentId, amount, method: 'cash', message: 'Cash deposit recorded. Awaiting provider confirmation.' };
    }

    // Attempt PayMongo checkout session if available
    try {
      if (createCheckoutSession) {
        const session = await createCheckoutSession({
          amount, // createCheckoutSession converts to centavos internally
          description: `Deposit for booking #${bookingId}`,
          bookingId,
          paymentId,
        });
        return { paymentId, amount, method: 'paymongo', checkoutUrl: session.checkout_url };
      }
    } catch (e) {
      // PayMongo not configured — fall back to recording the payment
    }
    return { paymentId, amount, method: 'paymongo', message: 'Deposit payment created' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function payBalance(bookingId, userEmail, paymentMethod) {
  const pool = getPool();

  // Verify user and ownership
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const [bookings] = await pool.query('SELECT * FROM booking WHERE idbooking = ? AND b_client_id = ?', [bookingId, userId]);
  if (!bookings.length) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });

  // Use transaction to prevent duplicate payments
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify deposit is paid first
    const [depositCheck] = await conn.query(
      'SELECT * FROM payment_schedule WHERE ps_booking_id = ? AND ps_type = ? AND ps_status = ?',
      [bookingId, 'deposit', 'pending']
    );
    if (depositCheck.length) {
      await conn.rollback();
      throw Object.assign(new Error('Deposit must be paid before balance'), { statusCode: 400 });
    }

    // Lock the schedule row to prevent concurrent payments
    const [schedules] = await conn.query(
      'SELECT * FROM payment_schedule WHERE ps_booking_id = ? AND ps_type = ? AND ps_status = ? FOR UPDATE',
      [bookingId, 'balance', 'pending']
    );
    if (!schedules.length) {
      await conn.rollback();
      throw Object.assign(new Error('No pending balance found'), { statusCode: 400 });
    }
    const schedule = schedules[0];
    const amount = parseFloat(schedule.ps_amount);

    const [result] = await conn.query(
      `INSERT INTO payment (p_booking_id, p_user_id, p_amount, p_type, p_currency, p_status, p_payment_method)
       VALUES (?, ?, ?, 'balance', 'PHP', 'pending', ?)`,
      [bookingId, userId, amount, paymentMethod === 'cash' ? 'Cash on Hand' : 'PayMongo']
    );
    const paymentId = result.insertId;

    await conn.query('UPDATE payment_schedule SET ps_payment_id = ? WHERE id = ?', [paymentId, schedule.id]);
    await conn.commit();

    if (paymentMethod !== 'cash') {
      try {
        if (createCheckoutSession) {
          const session = await createCheckoutSession({
            amount, // createCheckoutSession converts to centavos internally
            description: `Balance payment for booking #${bookingId}`,
            bookingId,
            paymentId,
          });
          return { paymentId, amount, method: 'paymongo', checkoutUrl: session.checkout_url };
        }
      } catch (e) { /* PayMongo not configured */ }
    }

    return { paymentId, amount, method: paymentMethod, message: `${paymentMethod === 'cash' ? 'Cash balance' : 'Balance payment'} recorded` };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getRefundEstimate(bookingId, userEmail) {
  const pool = getPool();
  const cancellationPolicyService = require('./cancellationPolicyService');

  // Verify ownership
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const [bookings] = await pool.query('SELECT * FROM booking WHERE idbooking = ? AND b_client_id = ?', [bookingId, userId]);
  if (!bookings.length) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  const booking = bookings[0];

  // Get total paid
  const [payments] = await pool.query(
    `SELECT COALESCE(SUM(p_amount), 0) as total_paid FROM payment
     WHERE p_booking_id = ? AND p_status = 'completed' AND p_type IN ('deposit', 'balance', 'full')`,
    [bookingId]
  );
  const totalPaid = parseFloat(payments[0].total_paid);

  // Get policy snapshot from booking
  let policySnapshot = booking.b_cancellation_policy_snapshot;
  if (typeof policySnapshot === 'string') policySnapshot = JSON.parse(policySnapshot);

  const refund = cancellationPolicyService.calculateRefund(policySnapshot, totalPaid, booking.b_event_date);

  return {
    bookingId,
    totalCost: parseFloat(booking.b_total_cost),
    totalPaid,
    ...refund,
  };
}

async function cancelBookingWithRefund(bookingId, userEmail, reason) {
  const pool = getPool();

  // Verify ownership
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const [bookings] = await pool.query('SELECT * FROM booking WHERE idbooking = ? AND b_client_id = ?', [bookingId, userId]);
  if (!bookings.length) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  const booking = bookings[0];

  if (booking.b_status === 'cancelled') throw Object.assign(new Error('Booking already cancelled'), { statusCode: 400 });
  if (booking.b_status === 'completed') throw Object.assign(new Error('Cannot cancel completed booking'), { statusCode: 400 });

  // Calculate refund
  const refundEstimate = await getRefundEstimate(bookingId, userEmail);

  // Update booking status
  await pool.query(
    'UPDATE booking SET b_status = ? WHERE idbooking = ?',
    ['cancelled', bookingId]
  );

  // Waive any pending payment_schedule entries
  await pool.query(
    `UPDATE payment_schedule SET ps_status = 'waived' WHERE ps_booking_id = ? AND ps_status = 'pending'`,
    [bookingId]
  );

  // If refund amount > 0, create a refund payment record
  let refundPaymentId = null;
  if (refundEstimate.refundAmount > 0) {
    const [result] = await pool.query(
      `INSERT INTO payment (p_booking_id, p_user_id, p_amount, p_type, p_currency, p_status, p_payment_method)
       VALUES (?, ?, ?, 'refund', 'PHP', 'pending', 'Refund')`,
      [bookingId, userId, refundEstimate.refundAmount]
    );
    refundPaymentId = result.insertId;
  }

  return {
    bookingId,
    clientEmail: userEmail,
    status: 'cancelled',
    reason: reason || null,
    refundAmount: refundEstimate.refundAmount,
    refundPercent: refundEstimate.refundPercent,
    refundPaymentId,
    message: refundEstimate.refundAmount > 0
      ? `Booking cancelled. Refund of ₱${refundEstimate.refundAmount.toFixed(2)} (${refundEstimate.refundPercent}%) will be processed.`
      : 'Booking cancelled. No refund applicable.',
  };
}

// ──────────────────────────────────────────────
module.exports = {
  // Bookings CRUD
  listBookings,
  getUserBookings,
  getUserBookingsCount,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  // Payment methods
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  // Payment processing
  createPaymongoPayment,
  processCashPayment,
  handlePaymongoSuccess,
  handlePaymongoFailed,
  markPaymentComplete,
  // Deposit / Balance / Cancellation
  getPaymentSchedule,
  payDeposit,
  payBalance,
  getRefundEstimate,
  cancelBookingWithRefund,
  // Provider
  getProviderBookings,
  markCashPaymentPaid,
  // Invoices
  generateProviderInvoice,
  generateUserInvoice,
  // Ratings
  submitRating,
  getRating,
};
