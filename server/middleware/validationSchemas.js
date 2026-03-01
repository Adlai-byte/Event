// server/middleware/validationSchemas.js
const { body, param, query } = require('express-validator');

// ── Reusable field validators ──────────────────────────────────────

const emailField = (field = 'email') =>
  body(field).isEmail().withMessage('Valid email is required').normalizeEmail();

const emailQuery = (field = 'email') =>
  query(field).isEmail().withMessage('Valid email is required').normalizeEmail();

const idParam = (field = 'id') =>
  param(field).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`).toInt();

const safeString = (field, { min = 1, max = 255, required = true } = {}) => {
  let chain = body(field).trim();
  if (required) {
    chain = chain.notEmpty().withMessage(`${field} is required`);
  } else {
    chain = chain.optional({ values: 'falsy' });
  }
  return chain
    .isLength({ min, max })
    .withMessage(`${field} must be ${min}-${max} characters`)
    .escape();
};

// ── Registration / User creation ───────────────────────────────────

const registerValidation = [
  safeString('firstName', { max: 100 }),
  safeString('lastName', { max: 100 }),
  safeString('middleName', { required: false, max: 100 }),
  safeString('suffix', { required: false, max: 20 }),
  emailField(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// ── User update ────────────────────────────────────────────────────

const updateUserValidation = [
  idParam(),
  safeString('firstName', { max: 100 }),
  safeString('lastName', { max: 100 }),
  emailField(),
  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[0-9+\-() ]{7,20}$/)
    .withMessage('Invalid phone number format'),
  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
  safeString('city', { required: false, max: 100 }),
  safeString('state', { required: false, max: 100 }),
  safeString('zipCode', { required: false, max: 20 }),
];

// ── Booking creation ───────────────────────────────────────────────

const createBookingValidation = [
  emailField('clientEmail'),
  body('serviceId').isInt({ min: 1 }).withMessage('serviceId must be a positive integer').toInt(),
  safeString('eventName', { max: 200 }),
  body('eventDate')
    .isISO8601()
    .withMessage('eventDate must be a valid date (YYYY-MM-DD)'),
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('startTime must be HH:MM format (24-hour)'),
  body('endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('endTime must be HH:MM format (24-hour)'),
  safeString('location', { max: 500 }),
  body('attendees')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100000 })
    .withMessage('attendees must be 1-100000')
    .toInt(),
  body('notes')
    .optional({ values: 'falsy' })
    .isLength({ max: 5000 })
    .withMessage('notes must be under 5000 characters'),
];

// ── Payment methods ────────────────────────────────────────────────

const paymentMethodValidation = [
  emailField('userEmail'),
  body('type')
    .isIn(['bank', 'gcash', 'instapay', 'maya', 'card'])
    .withMessage('type must be one of: bank, gcash, instapay, maya, card'),
  safeString('account_name', { max: 100 }),
  body('account_number')
    .trim()
    .notEmpty()
    .withMessage('account_number is required')
    .isLength({ max: 30 })
    .withMessage('account_number must be under 30 characters')
    .matches(/^[0-9A-Za-z\-]+$/)
    .withMessage('account_number contains invalid characters'),
  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('is_default must be a boolean'),
];

// ── Service creation / update ──────────────────────────────────────

const serviceValidation = [
  safeString('name', { max: 200 }),
  body('category')
    .isIn(['venue', 'catering', 'photography', 'videography', 'music', 'decor', 'planning', 'entertainment', 'other'])
    .withMessage('Invalid service category'),
  body('basePrice')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('basePrice must be 0-999999.99')
    .toFloat(),
  body('description')
    .optional({ values: 'falsy' })
    .isLength({ max: 5000 })
    .withMessage('description must be under 5000 characters'),
  body('duration')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 10080 })
    .withMessage('duration must be 1-10080 minutes')
    .toInt(),
  body('maxCapacity')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100000 })
    .withMessage('maxCapacity must be 1-100000')
    .toInt(),
  safeString('city', { required: false, max: 100 }),
  safeString('state', { required: false, max: 100 }),
  safeString('address', { required: false, max: 500 }),
  body('latitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be -90 to 90'),
  body('longitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be -180 to 180'),
  body('cancellationPolicyId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('cancellationPolicyId must be a positive integer')
    .toInt(),
];

// ── Messaging ──────────────────────────────────────────────────────

const sendMessageValidation = [
  param('id').isInt({ min: 1 }).withMessage('conversationId must be a positive integer').toInt(),
  emailField('userEmail'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 5000 })
    .withMessage('Message must be under 5000 characters'),
];

// ── Hiring ─────────────────────────────────────────────────────────

const hiringRequestValidation = [
  safeString('title', { max: 255 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('description is required')
    .isLength({ max: 10000 })
    .withMessage('description must be under 10000 characters'),
  body('budget.min')
    .optional()
    .isFloat({ min: 0, max: 9999999 })
    .withMessage('budget.min must be 0-9999999'),
  body('budget.max')
    .optional()
    .isFloat({ min: 0, max: 9999999 })
    .withMessage('budget.max must be 0-9999999'),
];

// ── Common query validators ────────────────────────────────────────

const emailQueryValidation = [emailQuery('email')];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be 1-100')
    .toInt(),
];

module.exports = {
  registerValidation,
  updateUserValidation,
  createBookingValidation,
  paymentMethodValidation,
  serviceValidation,
  sendMessageValidation,
  hiringRequestValidation,
  emailQueryValidation,
  paginationValidation,
  // Individual field helpers for ad-hoc use
  emailField,
  emailQuery,
  idParam,
  safeString,
};
