// server/middleware/rateLimiter.js
const logger = require('../lib/logger');

// In-memory rate limit store (keyed by route prefix + IP)
const rateLimitStore = {};

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(rateLimitStore)) {
    if (now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Rate limiter middleware factory.
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} [prefix] - Optional key prefix for grouping (e.g., 'auth', 'payment')
 */
function rateLimiter(maxRequests = 100, windowMs = 60000, prefix = 'default') {
  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') return next();

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    if (!rateLimitStore[key] || now > rateLimitStore[key].resetTime) {
      rateLimitStore[key] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    rateLimitStore[key].count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - rateLimitStore[key].count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitStore[key].resetTime / 1000));

    if (rateLimitStore[key].count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip,
        prefix,
        count: rateLimitStore[key].count,
        limit: maxRequests,
        requestId: req.requestId,
      });
      const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        ok: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    next();
  };
}

// Pre-configured limiters for common use cases
const authLimiter = rateLimiter(10, 15 * 60 * 1000, 'auth');       // 10 per 15 min
const registerLimiter = rateLimiter(5, 60 * 60 * 1000, 'register'); // 5 per hour
const paymentLimiter = rateLimiter(10, 60 * 60 * 1000, 'payment');  // 10 per hour
const searchLimiter = rateLimiter(60, 60 * 1000, 'search');         // 60 per minute
const apiLimiter = rateLimiter(200, 60 * 1000, 'api');              // 200 per minute (global)

// Export for testing
function _resetStore() {
  for (const key of Object.keys(rateLimitStore)) {
    delete rateLimitStore[key];
  }
}

module.exports = {
  rateLimiter,
  authLimiter,
  registerLimiter,
  paymentLimiter,
  searchLimiter,
  apiLimiter,
  _resetStore,
};
