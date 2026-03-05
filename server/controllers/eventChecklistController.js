const { sendSuccess, sendError } = require('../lib/response');
const checklistService = require('../svc/eventChecklistService');

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

async function addChecklistItem(req, res) {
  try {
    const result = await checklistService.addItem(Number(req.params.id), req.user.email, req.body);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Add checklist item failed');
  }
}

async function getChecklist(req, res) {
  try {
    const items = await checklistService.getChecklist(Number(req.params.id), req.user.email);
    return sendSuccess(res, { rows: items });
  } catch (err) {
    return handleServiceError(res, err, 'Get checklist failed');
  }
}

async function updateChecklistItem(req, res) {
  try {
    const result = await checklistService.updateItem(
      Number(req.params.id), Number(req.params.itemId), req.user.email, req.body
    );
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update checklist item failed');
  }
}

async function deleteChecklistItem(req, res) {
  try {
    await checklistService.deleteItem(Number(req.params.id), Number(req.params.itemId), req.user.email);
    return sendSuccess(res, { message: 'Checklist item deleted' });
  } catch (err) {
    return handleServiceError(res, err, 'Delete checklist item failed');
  }
}

module.exports = { addChecklistItem, getChecklist, updateChecklistItem, deleteChecklistItem };
