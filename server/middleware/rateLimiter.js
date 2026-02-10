// server/middleware/rateLimiter.js
const rateLimit = {};

function rateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimit[ip]) {
      rateLimit[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    if (now > rateLimit[ip].resetTime) {
      rateLimit[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    rateLimit[ip].count++;
    if (rateLimit[ip].count > maxRequests) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }

    next();
  };
}

module.exports = { rateLimiter };
