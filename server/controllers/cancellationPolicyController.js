// server/controllers/cancellationPolicyController.js
// Request/response handling layer for cancellation policy endpoints.
// Delegates all business logic and DB access to cancellationPolicyService.

const { sendSuccess, sendError } = require('../lib/response');
const policyService = require('../svc/cancellationPolicyService');

// ──────────────────────────────────────────────
// Helper to map service errors to HTTP responses
// ──────────────────────────────────────────────

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

// ──────────────────────────────────────────────
// Cancellation Policy CRUD
// ──────────────────────────────────────────────

async function createPolicy(req, res) {
  const email = req.user.email;
  const { name, depositPercent, rules } = req.body;
  try {
    const result = await policyService.createPolicy(email, name, depositPercent, rules);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Create policy failed');
  }
}

async function listPolicies(req, res) {
  const email = req.user.email;
  try {
    const policies = await policyService.listPolicies(email);
    return sendSuccess(res, { rows: policies });
  } catch (err) {
    return handleServiceError(res, err, 'List policies failed');
  }
}

async function updatePolicy(req, res) {
  const email = req.user.email;
  const id = Number(req.params.id);
  try {
    const result = await policyService.updatePolicy(id, email, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update policy failed');
  }
}

async function deletePolicy(req, res) {
  const email = req.user.email;
  const id = Number(req.params.id);
  try {
    await policyService.deletePolicy(id, email);
    return sendSuccess(res, { message: 'Policy deleted' });
  } catch (err) {
    return handleServiceError(res, err, 'Delete policy failed');
  }
}

// ──────────────────────────────────────────────
module.exports = {
  createPolicy,
  listPolicies,
  updatePolicy,
  deletePolicy,
};
