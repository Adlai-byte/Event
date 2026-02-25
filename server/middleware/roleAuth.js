const logger = require('../lib/logger');
const pool = require('../db');

/**
 * Role-based authorization middleware.
 * Must be used AFTER authMiddleware (requires req.user.email).
 *
 * @param  {...string} allowedRoles - Roles allowed to access the endpoint (e.g., 'admin', 'provider', 'user')
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.email) {
        return res.status(401).json({ ok: false, error: 'Authentication required' });
      }

      const [rows] = await pool.query(
        'SELECT u_role FROM user WHERE u_email = ? AND u_disabled = 0 LIMIT 1',
        [req.user.email],
      );

      if (rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'User not found or account disabled' });
      }

      const userRole = rows[0].u_role;
      req.user.role = userRole;

      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied: insufficient role', {
          email: req.user.email,
          role: userRole,
          required: allowedRoles,
          path: req.path,
          requestId: req.requestId,
        });
        return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error', { error: error.message, requestId: req.requestId });
      return res.status(500).json({ ok: false, error: 'Authorization check failed' });
    }
  };
}

module.exports = { requireRole };
