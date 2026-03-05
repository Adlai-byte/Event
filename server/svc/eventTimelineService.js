const { getPool } = require('../db');
const { verifyEventOwner } = require('./eventService');

async function addEntry(eventId, email, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [result] = await pool.query(
    `INSERT INTO event_timeline (et_event_id, et_start_time, et_end_time, et_title, et_description, et_booking_id, et_sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [eventId, data.startTime, data.endTime || null, data.title,
     data.description || null, data.bookingId || null, data.sortOrder || 0],
  );
  return getEntry(result.insertId);
}

async function getTimeline(eventId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [rows] = await pool.query(
    `SELECT et.*, b.b_event_name AS booking_name
     FROM event_timeline et
     LEFT JOIN booking b ON et.et_booking_id = b.idbooking
     WHERE et.et_event_id = ?
     ORDER BY et.et_sort_order ASC, et.et_start_time ASC`,
    [eventId],
  );
  return rows.map(mapTimelineRow);
}

async function getEntry(entryId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT et.*, b.b_event_name AS booking_name
     FROM event_timeline et
     LEFT JOIN booking b ON et.et_booking_id = b.idbooking
     WHERE et.id = ?`,
    [entryId],
  );
  if (!rows.length) {
    const err = new Error('Timeline entry not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return mapTimelineRow(rows[0]);
}

async function updateEntry(eventId, entryId, email, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [existing] = await pool.query(
    'SELECT id FROM event_timeline WHERE id = ? AND et_event_id = ?',
    [entryId, eventId],
  );
  if (!existing.length) {
    const err = new Error('Timeline entry not found in this event');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const updates = [];
  const params = [];
  if (data.startTime !== undefined) { updates.push('et_start_time = ?'); params.push(data.startTime); }
  if (data.endTime !== undefined) { updates.push('et_end_time = ?'); params.push(data.endTime || null); }
  if (data.title !== undefined) { updates.push('et_title = ?'); params.push(data.title); }
  if (data.description !== undefined) { updates.push('et_description = ?'); params.push(data.description); }
  if (data.bookingId !== undefined) { updates.push('et_booking_id = ?'); params.push(data.bookingId || null); }
  if (data.sortOrder !== undefined) { updates.push('et_sort_order = ?'); params.push(data.sortOrder); }
  if (updates.length === 0) return getEntry(entryId);
  params.push(entryId);
  await pool.query(`UPDATE event_timeline SET ${updates.join(', ')} WHERE id = ?`, params);
  return getEntry(entryId);
}

async function deleteEntry(eventId, entryId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [existing] = await pool.query(
    'SELECT id FROM event_timeline WHERE id = ? AND et_event_id = ?',
    [entryId, eventId],
  );
  if (!existing.length) {
    const err = new Error('Timeline entry not found in this event');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await pool.query('DELETE FROM event_timeline WHERE id = ?', [entryId]);
  return { deleted: true };
}

function mapTimelineRow(r) {
  return {
    id: r.id,
    eventId: r.et_event_id,
    startTime: r.et_start_time,
    endTime: r.et_end_time,
    title: r.et_title,
    description: r.et_description,
    bookingId: r.et_booking_id,
    bookingName: r.booking_name || null,
    sortOrder: r.et_sort_order,
    createdAt: r.et_created_at,
  };
}

module.exports = { addEntry, getTimeline, getEntry, updateEntry, deleteEntry };
