const { getPool } = require('../db');
const { verifyEventOwner, getUserIdByEmail } = require('./eventService');

async function getEventBookings(eventId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [rows] = await pool.query(
    `SELECT b.*, s.s_name AS service_name, s.s_category AS service_category,
            u.u_fname AS provider_first_name, u.u_lname AS provider_last_name,
            (SELECT si.si_image_url FROM service_image si
             WHERE si.si_service_id = bs.bs_service_id AND si.si_is_primary = 1 LIMIT 1) AS primary_image
     FROM booking b
     LEFT JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
     LEFT JOIN service s ON bs.bs_service_id = s.idservice
     LEFT JOIN user u ON s.s_provider_id = u.iduser
     WHERE b.b_event_id = ?
     ORDER BY b.b_event_date ASC`,
    [eventId],
  );
  return rows.map(mapEventBookingRow);
}

async function linkBooking(eventId, bookingId, email) {
  const pool = getPool();
  const userId = await verifyEventOwner(eventId, email);
  const [bookings] = await pool.query(
    'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
    [bookingId, userId],
  );
  if (!bookings.length) {
    const err = new Error('Booking not found or not authorized');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await pool.query('UPDATE booking SET b_event_id = ? WHERE idbooking = ?', [eventId, bookingId]);
  return { linked: true, eventId, bookingId };
}

async function unlinkBooking(eventId, bookingId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const userId = await getUserIdByEmail(email);
  const [bookings] = await pool.query(
    'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ? AND b_event_id = ?',
    [bookingId, userId, eventId],
  );
  if (!bookings.length) {
    const err = new Error('Booking not linked to this event');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await pool.query('UPDATE booking SET b_event_id = NULL WHERE idbooking = ?', [bookingId]);
  return { unlinked: true };
}

async function getEventBudget(eventId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [events] = await pool.query('SELECT e_budget FROM event WHERE idevent = ?', [eventId]);
  const totalBudget = parseFloat(events[0]?.e_budget) || 0;
  const [costRows] = await pool.query(
    'SELECT COALESCE(SUM(b_total_cost), 0) AS total_spent FROM booking WHERE b_event_id = ? AND b_status != ?',
    [eventId, 'cancelled'],
  );
  const totalSpent = parseFloat(costRows[0]?.total_spent) || 0;
  const [categoryRows] = await pool.query(
    `SELECT s.s_category AS category, SUM(bs.bs_total_price) AS amount
     FROM booking b
     JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
     JOIN service s ON bs.bs_service_id = s.idservice
     WHERE b.b_event_id = ? AND b.b_status != 'cancelled'
     GROUP BY s.s_category
     ORDER BY amount DESC`,
    [eventId],
  );
  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    percentUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    byCategory: categoryRows.map(r => ({
      category: r.category,
      amount: parseFloat(r.amount) || 0,
    })),
  };
}

function mapEventBookingRow(r) {
  return {
    id: r.idbooking,
    eventName: r.b_event_name,
    eventDate: r.b_event_date,
    startTime: r.b_start_time,
    endTime: r.b_end_time,
    location: r.b_location,
    totalCost: parseFloat(r.b_total_cost) || 0,
    status: r.b_status,
    serviceName: r.service_name || null,
    serviceCategory: r.service_category || null,
    providerName: r.provider_first_name && r.provider_last_name
      ? `${r.provider_first_name} ${r.provider_last_name}` : null,
    primaryImage: r.primary_image || null,
    isPaid: r.is_paid === 1 || r.is_paid === true,
    depositPaid: r.b_deposit_paid === 1,
  };
}

module.exports = { getEventBookings, linkBooking, unlinkBooking, getEventBudget };
