// server/svc/cancellationPolicyService.js
// Pure business-logic and database-access layer for cancellation policies.
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
  if (!rows.length) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return rows[0].iduser;
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

/**
 * Create a cancellation policy.
 * Rules are sorted by days_before descending for consistent storage.
 */
async function createPolicy(providerEmail, name, depositPercent, rules) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);

  // Sort rules by days_before descending for consistent storage
  const sortedRules = [...rules].sort((a, b) => b.days_before - a.days_before);

  const [result] = await pool.query(
    'INSERT INTO cancellation_policy (cp_provider_id, cp_name, cp_deposit_percent, cp_rules) VALUES (?, ?, ?, ?)',
    [providerId, name, depositPercent, JSON.stringify(sortedRules)],
  );

  return { id: result.insertId, name, depositPercent, rules: sortedRules };
}

/**
 * List all policies for a provider (by email).
 */
async function listPolicies(providerEmail) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);

  const [rows] = await pool.query(
    'SELECT * FROM cancellation_policy WHERE cp_provider_id = ? ORDER BY cp_created_at DESC',
    [providerId],
  );

  return rows.map(r => ({
    id: r.id,
    name: r.cp_name,
    depositPercent: parseFloat(r.cp_deposit_percent),
    rules: typeof r.cp_rules === 'string' ? JSON.parse(r.cp_rules) : r.cp_rules,
    createdAt: r.cp_created_at,
    updatedAt: r.cp_updated_at,
  }));
}

/**
 * Get a single policy by ID.
 */
async function getPolicy(policyId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM cancellation_policy WHERE id = ?', [policyId]);
  if (!rows.length) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const r = rows[0];
  return {
    id: r.id,
    providerId: r.cp_provider_id,
    name: r.cp_name,
    depositPercent: parseFloat(r.cp_deposit_percent),
    rules: typeof r.cp_rules === 'string' ? JSON.parse(r.cp_rules) : r.cp_rules,
    createdAt: r.cp_created_at,
    updatedAt: r.cp_updated_at,
  };
}

/**
 * Update a policy. Verifies ownership by provider email.
 */
async function updatePolicy(policyId, providerEmail, data) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);
  const policy = await getPolicy(policyId);

  if (Number(policy.providerId) !== Number(providerId)) {
    const err = new Error('Not authorized to modify this policy');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const updates = [];
  const params = [];

  if (data.name !== undefined) { updates.push('cp_name = ?'); params.push(data.name); }
  if (data.depositPercent !== undefined) { updates.push('cp_deposit_percent = ?'); params.push(data.depositPercent); }
  if (data.rules !== undefined) {
    const sortedRules = [...data.rules].sort((a, b) => b.days_before - a.days_before);
    updates.push('cp_rules = ?');
    params.push(JSON.stringify(sortedRules));
  }

  if (updates.length === 0) return policy;

  params.push(policyId);
  await pool.query(`UPDATE cancellation_policy SET ${updates.join(', ')} WHERE id = ?`, params);

  return getPolicy(policyId);
}

/**
 * Delete a policy. Verifies ownership by provider email.
 * Clears references from services before deletion.
 */
async function deletePolicy(policyId, providerEmail) {
  const pool = getPool();
  const providerId = await getProviderIdByEmail(providerEmail);
  const policy = await getPolicy(policyId);

  if (Number(policy.providerId) !== Number(providerId)) {
    const err = new Error('Not authorized to delete this policy');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Clear references from services
  await pool.query(
    'UPDATE service SET s_cancellation_policy_id = NULL WHERE s_cancellation_policy_id = ?',
    [policyId],
  );

  await pool.query('DELETE FROM cancellation_policy WHERE id = ?', [policyId]);
  return { deleted: true };
}

// ──────────────────────────────────────────────
// Refund Calculation
// ──────────────────────────────────────────────

/**
 * Calculate refund based on a policy snapshot and payment data.
 *
 * @param {object} policySnapshot - { rules: [{ days_before, refund_percent }], ... }
 * @param {number} totalPaid - Amount paid so far
 * @param {string} eventDate - 'YYYY-MM-DD'
 * @returns {{ refundAmount: number, refundPercent: number, daysUntilEvent: number, message: string }}
 */
function calculateRefund(policySnapshot, totalPaid, eventDate) {
  if (!policySnapshot || !policySnapshot.rules || !policySnapshot.rules.length) {
    return { refundAmount: 0, refundPercent: 0, daysUntilEvent: 0, message: 'No cancellation policy' };
  }

  const now = new Date();
  const event = new Date(eventDate + 'T00:00:00');
  const daysUntilEvent = Math.floor((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Sort rules descending by days_before
  const rules = [...policySnapshot.rules].sort((a, b) => b.days_before - a.days_before);

  // Find the applicable rule: first rule where days_before <= daysUntilEvent
  let applicableRule = null;
  for (const rule of rules) {
    if (daysUntilEvent >= rule.days_before) {
      applicableRule = rule;
      break;
    }
  }

  if (!applicableRule) {
    // Past the last rule (closest to event) — no refund
    return { refundAmount: 0, refundPercent: 0, daysUntilEvent, message: 'No refund available' };
  }

  const refundPercent = applicableRule.refund_percent;
  const refundAmount = Math.round(totalPaid * (refundPercent / 100) * 100) / 100;

  return {
    refundAmount,
    refundPercent,
    daysUntilEvent,
    message: `${refundPercent}% refund (${daysUntilEvent} days before event)`,
  };
}

// ──────────────────────────────────────────────
module.exports = {
  getProviderIdByEmail,
  createPolicy,
  listPolicies,
  getPolicy,
  updatePolicy,
  deletePolicy,
  calculateRefund,
};
