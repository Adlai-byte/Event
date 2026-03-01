// server/routes/cancellationPolicies.js
// Thin routing layer -- maps HTTP verbs + paths to controller functions.
// All business logic lives in svc/cancellationPolicyService.js;
// all request/response handling lives in controllers/cancellationPolicyController.js.

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/cancellationPolicyController');

// ============================================
// PROVIDER CANCELLATION POLICIES
// ============================================

router.post('/provider/cancellation-policies',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name required (1-100 chars)'),
    body('depositPercent')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Deposit percent must be 0-100'),
    body('rules')
      .isArray({ min: 1 })
      .withMessage('At least one rule required'),
    body('rules.*.days_before')
      .isInt({ min: 0 })
      .withMessage('days_before must be >= 0'),
    body('rules.*.refund_percent')
      .isFloat({ min: 0, max: 100 })
      .withMessage('refund_percent must be 0-100'),
  ],
  validate,
  ctrl.createPolicy,
);

router.get('/provider/cancellation-policies',
  authMiddleware,
  requireRole('provider', 'admin'),
  ctrl.listPolicies,
);

router.put('/provider/cancellation-policies/:id',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('id must be a positive integer')
      .toInt(),
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 chars'),
    body('depositPercent')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Deposit percent must be 0-100'),
    body('rules')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one rule required'),
    body('rules.*.days_before')
      .optional()
      .isInt({ min: 0 })
      .withMessage('days_before must be >= 0'),
    body('rules.*.refund_percent')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('refund_percent must be 0-100'),
  ],
  validate,
  ctrl.updatePolicy,
);

router.delete('/provider/cancellation-policies/:id',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('id must be a positive integer')
      .toInt(),
  ],
  validate,
  ctrl.deletePolicy,
);

module.exports = router;
