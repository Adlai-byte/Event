const { getPool } = require('../db');
const { getUserIdByEmail } = require('./eventService');

function mapCollaboratorRow(r) {
  return {
    id: r.id,
    eventId: r.ecol_event_id,
    userId: r.ecol_user_id,
    role: r.ecol_role,
    status: r.ecol_status,
    invitedBy: r.ecol_invited_by,
    createdAt: r.ecol_created_at,
    userName: r.u_name || r.u_fname ? `${r.u_fname || ''} ${r.u_lname || ''}`.trim() : null,
    userEmail: r.u_email || null,
  };
}

async function inviteCollaborator(eventId, ownerEmail, targetEmail, role) {
  const pool = getPool();
  const ownerId = await getUserIdByEmail(ownerEmail);
  // Verify owner
  const [eventRows] = await pool.query(
    'SELECT idevent FROM event WHERE idevent = ? AND e_user_id = ?',
    [eventId, ownerId],
  );
  if (!eventRows.length) {
    const err = new Error('Event not found or not authorized');
    err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const targetId = await getUserIdByEmail(targetEmail);
  if (targetId === ownerId) {
    const err = new Error('Cannot invite yourself');
    err.statusCode = 400; err.code = 'BAD_REQUEST'; throw err;
  }
  // Check for existing
  const [existing] = await pool.query(
    'SELECT id FROM event_collaborator WHERE ecol_event_id = ? AND ecol_user_id = ?',
    [eventId, targetId],
  );
  if (existing.length) {
    const err = new Error('User already invited');
    err.statusCode = 409; err.code = 'CONFLICT'; throw err;
  }
  const [result] = await pool.query(
    `INSERT INTO event_collaborator (ecol_event_id, ecol_user_id, ecol_role, ecol_invited_by)
     VALUES (?, ?, ?, ?)`,
    [eventId, targetId, role || 'viewer', ownerId],
  );
  const [rows] = await pool.query(
    `SELECT ec.*, CONCAT(u.u_fname, ' ', u.u_lname) AS u_name, u.u_fname, u.u_lname, u.u_email FROM event_collaborator ec
     JOIN user u ON u.iduser = ec.ecol_user_id WHERE ec.id = ?`,
    [result.insertId],
  );
  return mapCollaboratorRow(rows[0]);
}

async function getCollaborators(eventId, email) {
  const pool = getPool();
  // Allow owner or any collaborator to see the list
  const userId = await getUserIdByEmail(email);
  const [eventRows] = await pool.query(
    'SELECT idevent, e_user_id FROM event WHERE idevent = ?', [eventId],
  );
  if (!eventRows.length) {
    const err = new Error('Event not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const isOwner = eventRows[0].e_user_id === userId;
  if (!isOwner) {
    const [collabRows] = await pool.query(
      'SELECT id FROM event_collaborator WHERE ecol_event_id = ? AND ecol_user_id = ? AND ecol_status = ?',
      [eventId, userId, 'accepted'],
    );
    if (!collabRows.length) {
      const err = new Error('Not authorized'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
    }
  }
  const [rows] = await pool.query(
    `SELECT ec.*, CONCAT(u.u_fname, ' ', u.u_lname) AS u_name, u.u_fname, u.u_lname, u.u_email FROM event_collaborator ec
     JOIN user u ON u.iduser = ec.ecol_user_id
     WHERE ec.ecol_event_id = ? ORDER BY ec.ecol_created_at ASC`,
    [eventId],
  );
  return rows.map(mapCollaboratorRow);
}

async function updateCollaboratorStatus(eventId, email, collabId, status) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  // Only the invited user can accept/decline
  const [result] = await pool.query(
    `UPDATE event_collaborator SET ecol_status = ?
     WHERE id = ? AND ecol_event_id = ? AND ecol_user_id = ?`,
    [status, collabId, eventId, userId],
  );
  if (result.affectedRows === 0) {
    const err = new Error('Collaborator not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const [rows] = await pool.query(
    `SELECT ec.*, CONCAT(u.u_fname, ' ', u.u_lname) AS u_name, u.u_fname, u.u_lname, u.u_email FROM event_collaborator ec
     JOIN user u ON u.iduser = ec.ecol_user_id WHERE ec.id = ?`,
    [collabId],
  );
  return mapCollaboratorRow(rows[0]);
}

async function removeCollaborator(eventId, ownerEmail, collabId) {
  const pool = getPool();
  const ownerId = await getUserIdByEmail(ownerEmail);
  const [eventRows] = await pool.query(
    'SELECT idevent FROM event WHERE idevent = ? AND e_user_id = ?',
    [eventId, ownerId],
  );
  if (!eventRows.length) {
    const err = new Error('Not authorized'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }
  const [result] = await pool.query(
    'DELETE FROM event_collaborator WHERE id = ? AND ecol_event_id = ?',
    [collabId, eventId],
  );
  if (result.affectedRows === 0) {
    const err = new Error('Collaborator not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  return { deleted: true };
}

/**
 * Check if a user has access to an event (owner or accepted collaborator).
 * Returns { userId, role } where role is 'owner' | 'editor' | 'viewer'.
 */
async function verifyEventAccess(eventId, email, requiredRole) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);

  // Check ownership first
  const [eventRows] = await pool.query(
    'SELECT idevent, e_user_id FROM event WHERE idevent = ?', [eventId],
  );
  if (!eventRows.length) {
    const err = new Error('Event not found'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  if (eventRows[0].e_user_id === userId) {
    return { userId, role: 'owner' };
  }

  // Check collaborator
  const [collabRows] = await pool.query(
    `SELECT ecol_role FROM event_collaborator
     WHERE ecol_event_id = ? AND ecol_user_id = ? AND ecol_status = 'accepted'`,
    [eventId, userId],
  );
  if (!collabRows.length) {
    const err = new Error('Event not found or not authorized');
    err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }

  const collabRole = collabRows[0].ecol_role; // 'viewer' or 'editor'
  const roleHierarchy = { viewer: 1, editor: 2, owner: 3 };
  if (requiredRole && roleHierarchy[collabRole] < roleHierarchy[requiredRole]) {
    const err = new Error('Insufficient permissions');
    err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }

  return { userId, role: collabRole };
}

/**
 * List events shared with a user (where they are an accepted collaborator).
 */
async function getSharedEvents(email) {
  const pool = getPool();
  const userId = await getUserIdByEmail(email);
  const [rows] = await pool.query(
    `SELECT e.*, ec.ecol_role, ec.ecol_status
     FROM event e
     JOIN event_collaborator ec ON ec.ecol_event_id = e.idevent
     WHERE ec.ecol_user_id = ? AND ec.ecol_status = 'accepted'
     ORDER BY e.e_date ASC`,
    [userId],
  );
  return rows.map(r => ({
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
    collaboratorRole: r.ecol_role,
  }));
}

module.exports = {
  inviteCollaborator,
  getCollaborators,
  updateCollaboratorStatus,
  removeCollaborator,
  verifyEventAccess,
  getSharedEvents,
};
