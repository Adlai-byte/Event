const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { validate } = require('../middleware/validate');
const eventCtrl = require('../controllers/eventController');
const checklistCtrl = require('../controllers/eventChecklistController');
const timelineCtrl = require('../controllers/eventTimelineController');
const bookingCtrl = require('../controllers/eventBookingController');
const reminderCtrl = require('../controllers/eventReminderController');
const collabCtrl = require('../controllers/eventCollaboratorController');

// ============================================
// EVENT CRUD
// ============================================
router.post('/events',
  authMiddleware, requireRole('user'),
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Name required (1-255 chars)'),
    body('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
    body('endDate').optional({ nullable: true }).isISO8601().withMessage('Valid end date (YYYY-MM-DD)'),
    body('location').optional().isString().trim().isLength({ max: 500 }),
    body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be >= 0'),
    body('guestCount').optional().isInt({ min: 0 }).withMessage('Guest count must be >= 0'),
    body('description').optional().isString().trim(),
  ],
  validate,
  eventCtrl.createEvent,
);

router.get('/events', authMiddleware, requireRole('user'), eventCtrl.listEvents);

router.get('/events/:id',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  eventCtrl.getEvent,
);

router.put('/events/:id',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('date').optional().isISO8601(),
    body('endDate').optional({ nullable: true }).isISO8601(),
    body('location').optional().isString().trim().isLength({ max: 500 }),
    body('budget').optional().isFloat({ min: 0 }),
    body('guestCount').optional().isInt({ min: 0 }),
    body('description').optional().isString().trim(),
    body('status').optional().isIn(['planning','upcoming','in_progress','completed','cancelled']),
  ],
  validate,
  eventCtrl.updateEvent,
);

router.delete('/events/:id',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  eventCtrl.deleteEvent,
);

// ============================================
// EVENT BOOKINGS (vendor association)
// ============================================
router.get('/events/:id/bookings',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  bookingCtrl.getEventBookings,
);

router.post('/events/:id/bookings',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('bookingId').isInt({ min: 1 }).withMessage('bookingId required'),
  ],
  validate,
  bookingCtrl.linkBookingToEvent,
);

router.delete('/events/:id/bookings/:bookingId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('bookingId').isInt({ min: 1 }).toInt(),
  ],
  validate,
  bookingCtrl.unlinkBookingFromEvent,
);

// ============================================
// BUDGET
// ============================================
router.get('/events/:id/budget',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  bookingCtrl.getEventBudget,
);

// ============================================
// CHECKLIST
// ============================================
router.post('/events/:id/checklist',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title required'),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('category').optional().isString().trim().isLength({ max: 100 }),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  checklistCtrl.addChecklistItem,
);

router.get('/events/:id/checklist',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  checklistCtrl.getChecklist,
);

router.put('/events/:id/checklist/:itemId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('itemId').isInt({ min: 1 }).toInt(),
    body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('isCompleted').optional().isBoolean(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('category').optional().isString().trim().isLength({ max: 100 }),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  checklistCtrl.updateChecklistItem,
);

router.delete('/events/:id/checklist/:itemId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('itemId').isInt({ min: 1 }).toInt(),
  ],
  validate,
  checklistCtrl.deleteChecklistItem,
);

// ============================================
// TIMELINE
// ============================================
router.post('/events/:id/timeline',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('startTime').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('startTime required (HH:MM)'),
    body('endTime').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title required'),
    body('description').optional().isString().trim(),
    body('bookingId').optional({ nullable: true }).isInt({ min: 1 }),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  timelineCtrl.addTimelineEntry,
);

router.get('/events/:id/timeline',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  timelineCtrl.getTimeline,
);

router.put('/events/:id/timeline/:entryId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('entryId').isInt({ min: 1 }).toInt(),
    body('startTime').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('endTime').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString().trim(),
    body('bookingId').optional({ nullable: true }).isInt({ min: 1 }),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  timelineCtrl.updateTimelineEntry,
);

router.delete('/events/:id/timeline/:entryId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('entryId').isInt({ min: 1 }).toInt(),
  ],
  validate,
  timelineCtrl.deleteTimelineEntry,
);

// ============================================
// CLONE
// ============================================
router.post('/events/:id/clone',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  ],
  validate,
  eventCtrl.cloneEvent,
);

// ============================================
// REMINDERS
// ============================================
router.post('/events/:id/reminders',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('remindAt').isISO8601().withMessage('Valid datetime required'),
    body('type').optional().isIn(['email', 'push', 'both']),
    body('message').optional().isString().trim().isLength({ max: 500 }),
  ],
  validate,
  reminderCtrl.addReminder,
);

router.get('/events/:id/reminders',
  authMiddleware, requireRole('user'),
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  reminderCtrl.getReminders,
);

router.put('/events/:id/reminders/:reminderId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('reminderId').isInt({ min: 1 }).toInt(),
    body('remindAt').optional().isISO8601(),
    body('type').optional().isIn(['email', 'push', 'both']),
    body('message').optional().isString().trim().isLength({ max: 500 }),
  ],
  validate,
  reminderCtrl.updateReminder,
);

router.delete('/events/:id/reminders/:reminderId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('reminderId').isInt({ min: 1 }).toInt(),
  ],
  validate,
  reminderCtrl.deleteReminder,
);

// ============================================
// COLLABORATORS
// ============================================
router.get('/events/shared',
  authMiddleware,
  collabCtrl.getSharedEvents,
);

router.post('/events/:id/collaborators',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('email').isEmail().withMessage('Valid email required'),
    body('role').optional().isIn(['viewer', 'editor']),
  ],
  validate,
  collabCtrl.inviteCollaborator,
);

router.get('/events/:id/collaborators',
  authMiddleware,
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  collabCtrl.getCollaborators,
);

router.put('/events/:id/collaborators/:collabId',
  authMiddleware,
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('collabId').isInt({ min: 1 }).toInt(),
    body('status').isIn(['accepted', 'declined']).withMessage('Status must be accepted or declined'),
  ],
  validate,
  collabCtrl.updateCollaborator,
);

router.delete('/events/:id/collaborators/:collabId',
  authMiddleware, requireRole('user'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    param('collabId').isInt({ min: 1 }).toInt(),
  ],
  validate,
  collabCtrl.removeCollaborator,
);

module.exports = router;
