// server/routes/availability.js
// Thin routing layer -- maps HTTP verbs + paths to controller functions.
// All business logic lives in svc/availabilityService.js;
// all request/response handling lives in controllers/availabilityController.js.

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/availabilityController');

// ============================================
// PROVIDER BLOCKED DATES
// ============================================

router.get('/provider/availability/blocked-dates',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    query('startDate').isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
    query('endDate').isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
  ],
  validate,
  ctrl.getBlockedDates,
);

router.post('/provider/availability/blocked-dates',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    // Single date OR date range; at least one pattern must be valid.
    // Single: { date: 'YYYY-MM-DD' }
    // Range:  { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
    body('date')
      .optional()
      .isISO8601()
      .withMessage('date must be a valid date (YYYY-MM-DD)'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('startDate must be a valid date (YYYY-MM-DD)'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDate must be a valid date (YYYY-MM-DD)'),
    body('reason')
      .optional({ values: 'falsy' })
      .isLength({ max: 255 })
      .withMessage('reason must be under 255 characters')
      .trim(),
    // Custom: must have either date or (startDate + endDate)
    body().custom((value) => {
      if (!value.date && !(value.startDate && value.endDate)) {
        throw new Error('Either "date" or both "startDate" and "endDate" are required');
      }
      return true;
    }),
  ],
  validate,
  ctrl.addBlockedDate,
);

router.delete('/provider/availability/blocked-dates/:id',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
  ],
  validate,
  ctrl.removeBlockedDate,
);

// ============================================
// PROVIDER WEEKLY SCHEDULE
// ============================================

router.get('/provider/availability/schedule',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    query('serviceId').isInt({ min: 1 }).withMessage('serviceId must be a positive integer').toInt(),
  ],
  validate,
  ctrl.getSchedule,
);

router.put('/provider/availability/schedule',
  authMiddleware,
  requireRole('provider', 'admin'),
  [
    body('serviceId').isInt({ min: 1 }).withMessage('serviceId must be a positive integer').toInt(),
    body('schedule').isArray().withMessage('schedule must be an array'),
    body('schedule.*.dayOfWeek')
      .isInt({ min: 0, max: 6 })
      .withMessage('dayOfWeek must be 0-6 (Sunday-Saturday)')
      .toInt(),
    body('schedule.*.startTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('startTime must be HH:MM format (24-hour)'),
    body('schedule.*.endTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('endTime must be HH:MM format (24-hour)'),
    body('schedule.*.isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be a boolean'),
    body('schedule.*.priceOverride')
      .optional({ values: 'falsy' })
      .isFloat({ min: 0, max: 999999.99 })
      .withMessage('priceOverride must be 0-999999.99'),
  ],
  validate,
  ctrl.updateSchedule,
);

// ============================================
// PUBLIC AVAILABILITY CHECKS
// ============================================

router.get('/services/:id/availability/check',
  [
    param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
    query('date').isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
  ],
  validate,
  ctrl.checkAvailability,
);

router.get('/services/:id/availability/calendar',
  [
    param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
    query('year').isInt({ min: 2020, max: 2100 }).withMessage('year must be 2020-2100').toInt(),
    query('month').isInt({ min: 1, max: 12 }).withMessage('month must be 1-12').toInt(),
  ],
  validate,
  ctrl.getMonthCalendar,
);

module.exports = router;
