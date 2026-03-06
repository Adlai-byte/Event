const { sendSuccess, sendError } = require('../lib/response');
const reminderService = require('../svc/eventReminderService');

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

async function addReminder(req, res) {
  try {
    const result = await reminderService.addReminder(Number(req.params.id), req.user.email, req.body);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Add reminder failed');
  }
}

async function getReminders(req, res) {
  try {
    const reminders = await reminderService.getReminders(Number(req.params.id), req.user.email);
    return sendSuccess(res, { rows: reminders });
  } catch (err) {
    return handleServiceError(res, err, 'Get reminders failed');
  }
}

async function updateReminder(req, res) {
  try {
    const result = await reminderService.updateReminder(
      Number(req.params.id), req.user.email, Number(req.params.reminderId), req.body,
    );
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update reminder failed');
  }
}

async function deleteReminder(req, res) {
  try {
    await reminderService.deleteReminder(Number(req.params.id), req.user.email, Number(req.params.reminderId));
    return sendSuccess(res, { message: 'Reminder deleted' });
  } catch (err) {
    return handleServiceError(res, err, 'Delete reminder failed');
  }
}

module.exports = { addReminder, getReminders, updateReminder, deleteReminder };
