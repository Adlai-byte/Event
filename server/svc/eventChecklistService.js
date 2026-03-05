const { getPool } = require('../db');
const { verifyEventOwner } = require('./eventService');

async function addItem(eventId, email, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [result] = await pool.query(
    `INSERT INTO event_checklist (ec_event_id, ec_title, ec_due_date, ec_category, ec_sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [eventId, data.title, data.dueDate || null, data.category || null, data.sortOrder || 0],
  );
  return getItem(result.insertId);
}

async function getChecklist(eventId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [rows] = await pool.query(
    'SELECT * FROM event_checklist WHERE ec_event_id = ? ORDER BY ec_sort_order ASC, id ASC',
    [eventId],
  );
  return rows.map(mapChecklistRow);
}

async function getItem(itemId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM event_checklist WHERE id = ?', [itemId]);
  if (!rows.length) {
    const err = new Error('Checklist item not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return mapChecklistRow(rows[0]);
}

async function updateItem(eventId, itemId, email, data) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [existing] = await pool.query(
    'SELECT id FROM event_checklist WHERE id = ? AND ec_event_id = ?',
    [itemId, eventId],
  );
  if (!existing.length) {
    const err = new Error('Checklist item not found in this event');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const updates = [];
  const params = [];
  if (data.title !== undefined) { updates.push('ec_title = ?'); params.push(data.title); }
  if (data.isCompleted !== undefined) { updates.push('ec_is_completed = ?'); params.push(data.isCompleted ? 1 : 0); }
  if (data.dueDate !== undefined) { updates.push('ec_due_date = ?'); params.push(data.dueDate || null); }
  if (data.category !== undefined) { updates.push('ec_category = ?'); params.push(data.category); }
  if (data.sortOrder !== undefined) { updates.push('ec_sort_order = ?'); params.push(data.sortOrder); }
  if (updates.length === 0) return getItem(itemId);
  params.push(itemId);
  await pool.query(`UPDATE event_checklist SET ${updates.join(', ')} WHERE id = ?`, params);
  return getItem(itemId);
}

async function deleteItem(eventId, itemId, email) {
  const pool = getPool();
  await verifyEventOwner(eventId, email);
  const [existing] = await pool.query(
    'SELECT id FROM event_checklist WHERE id = ? AND ec_event_id = ?',
    [itemId, eventId],
  );
  if (!existing.length) {
    const err = new Error('Checklist item not found in this event');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await pool.query('DELETE FROM event_checklist WHERE id = ?', [itemId]);
  return { deleted: true };
}

function mapChecklistRow(r) {
  return {
    id: r.id,
    eventId: r.ec_event_id,
    title: r.ec_title,
    isCompleted: r.ec_is_completed === 1,
    dueDate: r.ec_due_date,
    category: r.ec_category,
    sortOrder: r.ec_sort_order,
    createdAt: r.ec_created_at,
  };
}

module.exports = { addItem, getChecklist, getItem, updateItem, deleteItem };
