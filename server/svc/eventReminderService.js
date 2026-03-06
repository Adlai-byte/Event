const { getPool } = require('../db');
const { getUserIdByEmail, verifyEventOwner } = require('./eventService');

function mapReminderRow(r) {
  return {
    id: r.id,
    eventId: r.er_event_id,
    type: r.er_type,
    remindAt: r.er_remind_at,
    message: r.er_message,
    isSent: !!r.er_is_sent,
    createdAt: r.er_created_at,
  };
}

async function addReminder(eventId, email, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [result] = await pool.query(
    `INSERT INTO event_reminder (er_event_id, er_type, er_remind_at, er_message)
     VALUES (?, ?, ?, ?)`,
    [eventId, data.type || 'push', data.remindAt, data.message || null],
  );
  const [rows] = await pool.query('SELECT * FROM event_reminder WHERE id = ?', [result.insertId]);
  return mapReminderRow(rows[0]);
}

async function getReminders(eventId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [rows] = await pool.query(
    'SELECT * FROM event_reminder WHERE er_event_id = ? ORDER BY er_remind_at ASC',
    [eventId],
  );
  return rows.map(mapReminderRow);
}

async function updateReminder(eventId, email, reminderId, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const updates = [];
  const params = [];
  if (data.type !== undefined) { updates.push('er_type = ?'); params.push(data.type); }
  if (data.remindAt !== undefined) { updates.push('er_remind_at = ?'); params.push(data.remindAt); }
  if (data.message !== undefined) { updates.push('er_message = ?'); params.push(data.message); }
  if (updates.length === 0) {
    const [rows] = await pool.query('SELECT * FROM event_reminder WHERE id = ? AND er_event_id = ?', [reminderId, eventId]);
    if (!rows.length) { const err = new Error('Reminder not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err; }
    return mapReminderRow(rows[0]);
  }
  params.push(reminderId, eventId);
  const [result] = await pool.query(`UPDATE event_reminder SET ${updates.join(', ')} WHERE id = ? AND er_event_id = ?`, params);
  if (result.affectedRows === 0) { const err = new Error('Reminder not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err; }
  const [rows] = await pool.query('SELECT * FROM event_reminder WHERE id = ?', [reminderId]);
  return mapReminderRow(rows[0]);
}

async function deleteReminder(eventId, email, reminderId) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [result] = await pool.query('DELETE FROM event_reminder WHERE id = ? AND er_event_id = ?', [reminderId, eventId]);
  if (result.affectedRows === 0) { const err = new Error('Reminder not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err; }
  return { deleted: true };
}

async function getDueReminders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT er.*, e.e_name AS event_name, e.e_user_id, u.u_email, u.u_push_token
     FROM event_reminder er
     JOIN event e ON e.idevent = er.er_event_id
     JOIN user u ON u.iduser = e.e_user_id
     WHERE er.er_is_sent = 0 AND er.er_remind_at <= NOW()`,
  );
  return rows;
}

async function markSent(reminderIds) {
  if (!reminderIds.length) return;
  const pool = getPool();
  await pool.query('UPDATE event_reminder SET er_is_sent = 1 WHERE id IN (?)', [reminderIds]);
}

module.exports = {
  addReminder,
  getReminders,
  updateReminder,
  deleteReminder,
  getDueReminders,
  markSent,
};
