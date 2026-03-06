/**
 * Test-only API routes for E2E testing.
 * These routes are only mounted when NODE_ENV === 'test'.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Guard: refuse to run outside test environment
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({ ok: false, error: 'Test routes are only available in test environment' });
  }
  next();
});

/**
 * POST /api/test/set-role
 * Update a user's role in the database.
 * Body: { email: string, role: 'user' | 'provider' | 'admin' }
 */
router.post('/set-role', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ ok: false, error: 'email and role are required' });
    }

    const pool = getPool();
    const updateFields = { u_role: role };

    // If promoting to provider, also set provider status to approved
    if (role === 'provider') {
      updateFields.u_provider_status = 'approved';
    }

    const setClauses = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updateFields);

    const [result] = await pool.execute(
      `UPDATE user SET ${setClauses} WHERE u_email = ?`,
      [...values, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    return res.json({ ok: true, message: `Role updated to ${role}` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/test/delete-user
 * Delete an e2e test user. Only allows emails starting with 'e2e-'.
 * Body: { email: string }
 */
router.post('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.startsWith('e2e-')) {
      return res.status(400).json({ ok: false, error: 'Only e2e test user emails (starting with e2e-) can be deleted' });
    }

    const pool = getPool();
    await pool.execute('DELETE FROM user WHERE u_email = ?', [email]);

    return res.json({ ok: true, message: `User ${email} deleted` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/test/seed-service
 * Create a test service for a provider.
 * Body: { email: string, name: string, category: string, description: string, price: number, city?: string, state?: string }
 */
router.post('/seed-service', async (req, res) => {
  try {
    const { email, name, category, description, price, city, state } = req.body;
    if (!email || !name || !category) {
      return res.status(400).json({ ok: false, error: 'email, name, and category are required' });
    }

    const pool = getPool();

    // Find the user ID
    const [users] = await pool.execute('SELECT iduser FROM user WHERE u_email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const userId = users[0].iduser;

    const [result] = await pool.execute(
      `INSERT INTO service (s_user_id, s_name, s_category, s_description, s_price, s_status, s_city, s_state)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [userId, name, category, description || '', price || 0, city || 'Mati', state || 'Davao Oriental']
    );

    return res.json({ ok: true, serviceId: result.insertId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/test/seed-booking
 * Create a test booking.
 * Body: { customerEmail: string, serviceId: number, status?: string, eventDate?: string }
 */
router.post('/seed-booking', async (req, res) => {
  try {
    const { customerEmail, serviceId, status, eventDate } = req.body;
    if (!customerEmail || !serviceId) {
      return res.status(400).json({ ok: false, error: 'customerEmail and serviceId are required' });
    }

    const pool = getPool();

    // Find the customer user ID
    const [users] = await pool.execute('SELECT iduser FROM user WHERE u_email = ?', [customerEmail]);
    if (users.length === 0) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }

    const userId = users[0].iduser;
    const bookingStatus = status || 'confirmed';
    const bookingDate = eventDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [result] = await pool.execute(
      `INSERT INTO booking (b_user_id, b_service_id, b_status, b_event_date, b_created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, serviceId, bookingStatus, bookingDate]
    );

    return res.json({ ok: true, bookingId: result.insertId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/test/cleanup
 * Remove all e2e test data (users, services, bookings, events).
 * Only removes data associated with emails matching 'e2e-%@test-event.com'.
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const pool = getPool();
    const emailPattern = 'e2e-%@test-event.com';

    // Get all test user IDs first
    const [testUsers] = await pool.execute(
      'SELECT iduser FROM user WHERE u_email LIKE ?',
      [emailPattern]
    );
    const userIds = testUsers.map(u => u.iduser);

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');

      // Delete bookings by test users
      await pool.execute(
        `DELETE FROM booking WHERE b_user_id IN (${placeholders})`,
        userIds
      );

      // Delete bookings for services owned by test users
      await pool.execute(
        `DELETE FROM booking WHERE b_service_id IN (SELECT idservice FROM service WHERE s_user_id IN (${placeholders}))`,
        userIds
      );

      // Delete services owned by test users
      await pool.execute(
        `DELETE FROM service WHERE s_user_id IN (${placeholders})`,
        userIds
      );

      // Delete events created by test users (if event table exists)
      try {
        await pool.execute(
          `DELETE FROM event WHERE e_user_id IN (${placeholders})`,
          userIds
        );
      } catch {
        // event table may not exist, ignore
      }

      // Delete test users
      await pool.execute(
        `DELETE FROM user WHERE u_email LIKE ?`,
        [emailPattern]
      );
    }

    return res.json({ ok: true, message: `Cleaned up ${userIds.length} test users and related data` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
