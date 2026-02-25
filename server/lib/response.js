// server/lib/response.js
// Standardized API response helpers

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data - Payload (object, array, or scalar)
 * @param {number} [status=200]
 */
function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    ok: true,
    data: data !== undefined ? data : null,
  });
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} code - Machine-readable error code (e.g., 'VALIDATION_ERROR')
 * @param {string} message - Human-readable message
 * @param {number} [status=400]
 * @param {*} [details] - Optional extra info (validation errors, etc.)
 */
function sendError(res, code, message, status = 400, details) {
  const body = {
    ok: false,
    error: message,
    code,
  };
  if (details) body.details = details;
  return res.status(status).json(body);
}

/**
 * Send a paginated list response.
 * @param {import('express').Response} res
 * @param {Array} data
 * @param {{ page: number, limit: number, total: number }} pagination
 */
function sendPaginated(res, data, pagination) {
  return res.status(200).json({
    ok: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

module.exports = { sendSuccess, sendError, sendPaginated };
