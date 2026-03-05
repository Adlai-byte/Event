const { sendSuccess, sendError } = require('../lib/response');
const eventService = require('../svc/eventService');

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

async function createEvent(req, res) {
  try {
    const result = await eventService.createEvent(req.user.email, req.body);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Create event failed');
  }
}

async function listEvents(req, res) {
  try {
    const events = await eventService.listEvents(req.user.email);
    return sendSuccess(res, { rows: events });
  } catch (err) {
    return handleServiceError(res, err, 'List events failed');
  }
}

async function getEvent(req, res) {
  try {
    const event = await eventService.getEvent(Number(req.params.id), req.user.email);
    return sendSuccess(res, event);
  } catch (err) {
    return handleServiceError(res, err, 'Get event failed');
  }
}

async function updateEvent(req, res) {
  try {
    const result = await eventService.updateEvent(Number(req.params.id), req.user.email, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update event failed');
  }
}

async function deleteEvent(req, res) {
  try {
    await eventService.deleteEvent(Number(req.params.id), req.user.email);
    return sendSuccess(res, { message: 'Event deleted' });
  } catch (err) {
    return handleServiceError(res, err, 'Delete event failed');
  }
}

module.exports = { createEvent, listEvents, getEvent, updateEvent, deleteEvent };
