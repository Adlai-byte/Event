// server/middleware/paginate.js
// Extract and validate pagination params from query string

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Middleware that parses pagination from query params and attaches to req.pagination.
 * Usage: router.get('/items', paginate, handler)
 * Access in handler: const { page, limit, offset } = req.pagination;
 */
function paginate(req, _res, next) {
  const page = Math.max(1, parseInt(req.query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
}

module.exports = { paginate, DEFAULT_LIMIT, MAX_LIMIT };
