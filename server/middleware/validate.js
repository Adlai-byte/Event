// server/middleware/validate.js
const { validationResult } = require('express-validator');
const { sendError } = require('../lib/response');

/**
 * Middleware that checks express-validator results and returns 400 on failure.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400,
      errors.array().map(e => ({ field: e.path, message: e.msg }))
    );
  }
  next();
}

module.exports = { validate };
