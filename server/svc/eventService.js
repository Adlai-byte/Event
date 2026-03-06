const { getPool } = require('../db');

async function getUserIdByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT iduser FROM `user` WHERE u_email = ?',
    [email],
  );
  if (!rows.length) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return rows[0].iduser;
}

async function verifyEventOwner(eventId, email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  const [rows] = await pool.query(
    'SELECT idevent FROM `event` WHERE idevent = ? AND e_user_id = ?',
    [eventId, userId],
  );
  if (!rows.length) {
    const err = new Error('Event not found or not authorized');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return userId;
}

async function createEvent(email, data) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  const [result] = await pool.query(
    `INSERT INTO event (e_user_id, e_name, e_date, e_end_date, e_location, e_budget, e_guest_count, e_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, data.name, data.date, data.endDate || null, data.location || null,
     data.budget || 0, data.guestCount || null, data.description || null],
  );
  return getEvent(result.insertId, email);
}

async function listEvents(email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  const [rows] = await pool.query(
    'SELECT * FROM `event` WHERE e_user_id = ? ORDER BY e_date ASC',
    [userId],
  );
  return rows.map(mapEventRow);
}

async function getEvent(eventId, email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);

  // Check ownership first
  const [eventRows] = await pool.query(
    'SELECT idevent, e_user_id FROM `event` WHERE idevent = ?', [eventId],
  );
  if (!eventRows.length) {
    const err = new Error('Event not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  let userRole = 'owner';
  if (eventRows[0].e_user_id !== userId) {
    // Check if user is an accepted collaborator
    const [collabRows] = await pool.query(
      `SELECT ecol_role FROM event_collaborator
       WHERE ecol_event_id = ? AND ecol_user_id = ? AND ecol_status = 'accepted'`,
      [eventId, userId],
    );
    if (!collabRows.length) {
      const err = new Error('Event not found or not authorized');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    userRole = collabRows[0].ecol_role;
  }

  const [rows] = await pool.query('SELECT * FROM `event` WHERE idevent = ?', [eventId]);
  return { ...mapEventRow(rows[0]), userRole };
}

async function updateEvent(eventId, email, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const updates = [];
  const params = [];
  if (data.name !== undefined) { updates.push('e_name = ?'); params.push(data.name); }
  if (data.date !== undefined) { updates.push('e_date = ?'); params.push(data.date); }
  if (data.endDate !== undefined) { updates.push('e_end_date = ?'); params.push(data.endDate || null); }
  if (data.location !== undefined) { updates.push('e_location = ?'); params.push(data.location); }
  if (data.budget !== undefined) { updates.push('e_budget = ?'); params.push(data.budget); }
  if (data.guestCount !== undefined) { updates.push('e_guest_count = ?'); params.push(data.guestCount); }
  if (data.description !== undefined) { updates.push('e_description = ?'); params.push(data.description); }
  if (data.status !== undefined) { updates.push('e_status = ?'); params.push(data.status); }
  if (updates.length === 0) return getEvent(eventId, email);
  params.push(eventId);
  await pool.query(`UPDATE event SET ${updates.join(', ')} WHERE idevent = ?`, params);
  return getEvent(eventId, email);
}

async function deleteEvent(eventId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  await pool.query('UPDATE booking SET b_event_id = NULL WHERE b_event_id = ?', [eventId]);
  await pool.query('DELETE FROM `event` WHERE idevent = ?', [eventId]);
  return { deleted: true };
}

function mapEventRow(r) {
  return {
    id: r.idevent,
    userId: r.e_user_id,
    name: r.e_name,
    date: r.e_date,
    endDate: r.e_end_date,
    location: r.e_location,
    budget: parseFloat(r.e_budget) || 0,
    guestCount: r.e_guest_count,
    description: r.e_description,
    status: r.e_status,
    createdAt: r.e_created_at,
    updatedAt: r.e_updated_at,
  };
}

async function cloneEvent(eventId, email, newName) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const userId = await getUserIdByEmail(email);
  const [eventRows] = await pool.query('SELECT * FROM `event` WHERE idevent = ?', [eventId]);
  if (!eventRows.length) {
    const err = new Error('Event not found');
    err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const src = eventRows[0];
  const name = newName || `${src.e_name} (Copy)`;
  const [insertResult] = await pool.query(
    `INSERT INTO event (e_user_id, e_name, e_date, e_end_date, e_location, e_budget, e_guest_count, e_description, e_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planning')`,
    [userId, name, src.e_date, src.e_end_date, src.e_location, src.e_budget, src.e_guest_count, src.e_description],
  );
  const newEventId = insertResult.insertId;

  // Copy checklist items (reset completion)
  const [checklistItems] = await pool.query(
    'SELECT * FROM event_checklist WHERE ec_event_id = ?', [eventId],
  );
  for (const item of checklistItems) {
    await pool.query(
      `INSERT INTO event_checklist (ec_event_id, ec_title, ec_is_completed, ec_due_date, ec_category, ec_sort_order)
       VALUES (?, ?, 0, ?, ?, ?)`,
      [newEventId, item.ec_title, item.ec_due_date, item.ec_category, item.ec_sort_order],
    );
  }

  // Copy timeline entries (without booking references)
  const [timelineEntries] = await pool.query(
    'SELECT * FROM event_timeline WHERE et_event_id = ?', [eventId],
  );
  for (const entry of timelineEntries) {
    await pool.query(
      `INSERT INTO event_timeline (et_event_id, et_start_time, et_end_time, et_title, et_description, et_sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newEventId, entry.et_start_time, entry.et_end_time, entry.et_title, entry.et_description, entry.et_sort_order],
    );
  }

  return getEvent(newEventId, email);
}

module.exports = {
  getUserIdByEmail,
  verifyEventOwner,
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  cloneEvent,
};
