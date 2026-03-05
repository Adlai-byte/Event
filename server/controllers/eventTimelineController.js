const { sendSuccess, sendError } = require('../lib/response');
const timelineService = require('../svc/eventTimelineService');

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

async function addTimelineEntry(req, res) {
  try {
    const result = await timelineService.addEntry(Number(req.params.id), req.user.email, req.body);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Add timeline entry failed');
  }
}

async function getTimeline(req, res) {
  try {
    const entries = await timelineService.getTimeline(Number(req.params.id), req.user.email);
    return sendSuccess(res, { rows: entries });
  } catch (err) {
    return handleServiceError(res, err, 'Get timeline failed');
  }
}

async function updateTimelineEntry(req, res) {
  try {
    const result = await timelineService.updateEntry(
      Number(req.params.id), Number(req.params.entryId), req.user.email, req.body
    );
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update timeline entry failed');
  }
}

async function deleteTimelineEntry(req, res) {
  try {
    await timelineService.deleteEntry(Number(req.params.id), Number(req.params.entryId), req.user.email);
    return sendSuccess(res, { message: 'Timeline entry deleted' });
  } catch (err) {
    return handleServiceError(res, err, 'Delete timeline entry failed');
  }
}

module.exports = { addTimelineEntry, getTimeline, updateTimelineEntry, deleteTimelineEntry };
