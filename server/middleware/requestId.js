const crypto = require('crypto');

/**
 * Middleware that attaches a unique request ID to each request.
 * Useful for tracing requests across logs.
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestId;
