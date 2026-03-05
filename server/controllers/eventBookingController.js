const { sendSuccess, sendError } = require('../lib/response');
const eventBookingService = require('../svc/eventBookingService');

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

async function getEventBookings(req, res) {
  try {
    const bookings = await eventBookingService.getEventBookings(Number(req.params.id), req.user.email);
    return sendSuccess(res, { rows: bookings });
  } catch (err) {
    return handleServiceError(res, err, 'Get event bookings failed');
  }
}

async function linkBookingToEvent(req, res) {
  try {
    const result = await eventBookingService.linkBooking(
      Number(req.params.id), Number(req.body.bookingId), req.user.email
    );
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Link booking failed');
  }
}

async function unlinkBookingFromEvent(req, res) {
  try {
    await eventBookingService.unlinkBooking(
      Number(req.params.id), Number(req.params.bookingId), req.user.email
    );
    return sendSuccess(res, { message: 'Booking unlinked from event' });
  } catch (err) {
    return handleServiceError(res, err, 'Unlink booking failed');
  }
}

async function getEventBudget(req, res) {
  try {
    const budget = await eventBookingService.getEventBudget(Number(req.params.id), req.user.email);
    return sendSuccess(res, budget);
  } catch (err) {
    return handleServiceError(res, err, 'Get budget failed');
  }
}

module.exports = { getEventBookings, linkBookingToEvent, unlinkBookingFromEvent, getEventBudget };
