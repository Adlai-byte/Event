const { sendSuccess, sendError } = require('../lib/response');
const collabService = require('../svc/eventCollaboratorService');

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

async function inviteCollaborator(req, res) {
  try {
    const result = await collabService.inviteCollaborator(
      Number(req.params.id), req.user.email, req.body.email, req.body.role,
    );
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleServiceError(res, err, 'Invite collaborator failed');
  }
}

async function getCollaborators(req, res) {
  try {
    const rows = await collabService.getCollaborators(Number(req.params.id), req.user.email);
    return sendSuccess(res, { rows });
  } catch (err) {
    return handleServiceError(res, err, 'Get collaborators failed');
  }
}

async function updateCollaborator(req, res) {
  try {
    const result = await collabService.updateCollaboratorStatus(
      Number(req.params.id), req.user.email, Number(req.params.collabId), req.body.status,
    );
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update collaborator failed');
  }
}

async function removeCollaborator(req, res) {
  try {
    await collabService.removeCollaborator(
      Number(req.params.id), req.user.email, Number(req.params.collabId),
    );
    return sendSuccess(res, { message: 'Collaborator removed' });
  } catch (err) {
    return handleServiceError(res, err, 'Remove collaborator failed');
  }
}

async function getSharedEvents(req, res) {
  try {
    const events = await collabService.getSharedEvents(req.user.email);
    return sendSuccess(res, { rows: events });
  } catch (err) {
    return handleServiceError(res, err, 'Get shared events failed');
  }
}

module.exports = { inviteCollaborator, getCollaborators, updateCollaborator, removeCollaborator, getSharedEvents };
