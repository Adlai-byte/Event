// __tests__/helpers/cleanup.js
// Database cleanup and re-seed utilities for integration tests.

const { getPool } = require('../../db');

// All tables in reverse-FK order for safe truncation.
const ALL_TABLES = [
  'job_application',
  'provider_job_posting',
  'device_tokens',
  'notification',
  'booking_package',
  'package_item',
  'package_category',
  'service_package',
  'activity_log',
  'payment',
  'service_review',
  'message_attachment',
  'message',
  'conversation_participant',
  'conversation',
  'proposal_deliverable',
  'proposal',
  'hiring_skill',
  'hiring_requirement',
  'hiring_request',
  'payment_method',
  'booking_service',
  'booking',
  'service_availability',
  'service_image',
  'service',
  'user',
];

/**
 * Truncate every table in the test database.
 * Disables FK checks so order doesn't strictly matter, but we go
 * in reverse-FK order as a safety measure.
 */
async function truncateAll() {
  const [dbRow] = await getPool().query('SELECT DATABASE()');
  console.log('--- DIAGNOSTIC: JEST IS USING DB:', dbRow[0]['DATABASE()']);
  const [colRow] = await getPool().query('SHOW COLUMNS FROM booking');
  console.log('--- DIAGNOSTIC: BOOKING HAS DEPOSIT:', colRow.map(c=>c.Field).includes('b_deposit_paid'));

  await getPool().query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of ALL_TABLES) {
    try {
      await getPool().query(`TRUNCATE TABLE \`${table}\``);
    } catch (err) {
      // Table may not exist yet if migrations haven't run; that's fine.
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
    }
  }
  await getPool().query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Seed the three core users, two services, and one booking.
 * Mirrors server/seeds/01_dev_users.js so that authMock tokens work
 * with roleAuth middleware (which queries the user table).
 *
 * Returns { adminId, providerId, clientId, svc1Id, svc2Id, bookingId }
 */
async function seedCoreUsers() {
  // Users
  const [adminResult] = await getPool().query(
    `INSERT INTO user (u_fname, u_lname, u_email, u_role) VALUES (?, ?, ?, ?)`,
    ['Admin', 'User', 'admin@event.test', 'admin'],
  );
  const adminId = adminResult.insertId;

  const [providerResult] = await getPool().query(
    `INSERT INTO user (u_fname, u_lname, u_email, u_role) VALUES (?, ?, ?, ?)`,
    ['Jane', 'Provider', 'provider@event.test', 'provider'],
  );
  const providerId = providerResult.insertId;

  const [clientResult] = await getPool().query(
    `INSERT INTO user (u_fname, u_lname, u_email, u_role) VALUES (?, ?, ?, ?)`,
    ['John', 'Client', 'client@event.test', 'user'],
  );
  const clientId = clientResult.insertId;

  // Services
  const [svc1Result] = await getPool().query(
    `INSERT INTO service (s_provider_id, s_name, s_description, s_category, s_base_price, s_city, s_state, s_is_active, s_rating, s_review_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [providerId, 'Pro Photography', 'Professional event photography', 'photography', 5000, 'Davao City', 'Davao del Sur', 1, 4.5, 10],
  );
  const svc1Id = svc1Result.insertId;

  const [svc2Result] = await getPool().query(
    `INSERT INTO service (s_provider_id, s_name, s_description, s_category, s_base_price, s_city, s_state, s_is_active, s_rating, s_review_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [providerId, 'DJ Services', 'Professional DJ for events', 'music', 3000, 'Davao City', 'Davao del Sur', 1, 4.2, 5],
  );
  const svc2Id = svc2Result.insertId;

  // Booking
  const [bookingResult] = await getPool().query(
    `INSERT INTO booking (b_client_id, b_event_name, b_event_date, b_start_time, b_end_time, b_location, b_total_cost, b_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, 'Birthday Party', '2026-04-15', '14:00', '20:00', 'Davao City', 8000, 'confirmed'],
  );
  const bookingId = bookingResult.insertId;

  await getPool().query(
    `INSERT INTO booking_service (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
    [bookingId, svc1Id, 1, 5000, 5000, bookingId, svc2Id, 1, 3000, 3000],
  );

  // Availability setup for 2026-07-20 (Monday, Day 1)
  await getPool().query(
    `INSERT INTO service_availability (sa_service_id, sa_day_of_week, sa_start_time, sa_end_time, sa_is_available)
     VALUES (?, ?, ?, ?, ?)`,
    [svc1Id, 1, '09:00:00', '17:00:00', 1]
  );

  return { adminId, providerId, clientId, svc1Id, svc2Id, bookingId };
}

module.exports = { truncateAll, seedCoreUsers, ALL_TABLES };
