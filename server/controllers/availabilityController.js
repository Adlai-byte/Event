// server/controllers/availabilityController.js
// Request/response handling layer for availability endpoints.
// Delegates all business logic and DB access to availabilityService.

const { sendSuccess, sendError } = require('../lib/response');
const availabilityService = require('../svc/availabilityService');

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
// Blocked Dates
// ──────────────────────────────────────────────

async function getBlockedDates(req, res) {
  const email = req.user.email;
  const { startDate, endDate } = req.query;
  try {
    const rows = await availabilityService.getBlockedDates(email, startDate, endDate);
    return sendSuccess(res, { rows });
  } catch (err) {
    return handleServiceError(res, err, 'Get blocked dates failed');
  }
}

async function addBlockedDate(req, res) {
  const email = req.user.email;
  const { date, startDate, endDate, reason } = req.body || {};
  try {
    // If startDate and endDate are provided, block a range
    if (startDate && endDate) {
      const result = await availabilityService.addBlockedDateRange(email, startDate, endDate, reason);
      return sendSuccess(res, result, 201);
    }
    // Otherwise block a single date
    const result = await availabilityService.addBlockedDate(email, date, reason);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Add blocked date failed');
  }
}

async function removeBlockedDate(req, res) {
  const email = req.user.email;
  const id = Number(req.params.id);
  try {
    const result = await availabilityService.removeBlockedDate(email, id);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Remove blocked date failed');
  }
}

// ──────────────────────────────────────────────
// Weekly Schedule
// ──────────────────────────────────────────────

async function getSchedule(req, res) {
  const email = req.user.email;
  const serviceId = Number(req.query.serviceId);
  try {
    await availabilityService.verifyServiceOwnership(serviceId, email);
    const rows = await availabilityService.getSchedule(serviceId);
    return sendSuccess(res, { rows });
  } catch (err) {
    return handleServiceError(res, err, 'Get schedule failed');
  }
}

async function updateSchedule(req, res) {
  const email = req.user.email;
  const { serviceId, schedule } = req.body || {};
  try {
    const result = await availabilityService.updateSchedule(serviceId, email, schedule);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update schedule failed');
  }
}

// ──────────────────────────────────────────────
// Availability Checks (public)
// ──────────────────────────────────────────────

async function checkAvailability(req, res) {
  const serviceId = Number(req.params.id);
  const { date } = req.query;
  try {
    const result = await availabilityService.checkAvailability(serviceId, date);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Check availability failed');
  }
}

async function getMonthCalendar(req, res) {
  const serviceId = Number(req.params.id);
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  try {
    const calendar = await availabilityService.getMonthCalendar(serviceId, year, month);
    return sendSuccess(res, { calendar });
  } catch (err) {
    return handleServiceError(res, err, 'Get month calendar failed');
  }
}

// ──────────────────────────────────────────────
module.exports = {
  getBlockedDates,
  addBlockedDate,
  removeBlockedDate,
  getSchedule,
  updateSchedule,
  checkAvailability,
  getMonthCalendar,
};
