// server/routes/services.js
// Thin routing layer — delegates to controllers/serviceController.js
const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { searchLimiter } = require('../middleware/rateLimiter');
const { serviceValidation } = require('../middleware/validationSchemas');
const { validate } = require('../middleware/validate');
const { paginate } = require('../middleware/paginate');
const { query } = require('express-validator');

const ctrl = require('../controllers/serviceController');

// ---------------------------------------------------------------------------
// Service CRUD
// ---------------------------------------------------------------------------

// Get all services (public, paginated)
router.get('/services',
    query('availableDate').optional().isISO8601().withMessage('availableDate must be a valid date (YYYY-MM-DD)'),
    validate,
    paginate,
    ctrl.listServices
);

// Get service by ID (public)
router.get('/services/:id', ctrl.getServiceById);

// Get service images (public)
router.get('/services/:id/images', ctrl.getServiceImages);

// Get service availability (public)
router.get('/services/:id/availability', ctrl.getServiceAvailability);

// Get available slots / dates for a service (public)
router.get('/services/:id/available-slots', ctrl.getAvailableSlots);

// Create service (provider or admin)
router.post('/services', authMiddleware, requireRole('provider', 'admin'), serviceValidation, validate, ctrl.createService);

// Update service status (activate/deactivate)
router.post('/services/:id/status', authMiddleware, requireRole('provider', 'admin'), ctrl.updateServiceStatus);

// Update service (provider or admin)
router.put('/services/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.updateService);

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

// Get service reviews (public)
router.get('/services/:serviceId/reviews', ctrl.getServiceReviews);

// ---------------------------------------------------------------------------
// Provider profile / search / services
// ---------------------------------------------------------------------------

// Get provider profile (provider or admin)
router.get('/provider/profile', authMiddleware, requireRole('provider', 'admin'), ctrl.getProviderProfile);

// Search providers (rate-limited, public)
router.get('/providers/search', searchLimiter, ctrl.searchProviders);

// Get provider services by email (provider or admin)
router.get('/provider/services', authMiddleware, requireRole('provider', 'admin'), ctrl.getProviderServices);

// ---------------------------------------------------------------------------
// PayMongo payment credentials
// ---------------------------------------------------------------------------

// Get provider payment link
router.get('/provider/payment-link', authMiddleware, requireRole('provider', 'admin'), ctrl.getProviderPaymentLink);

// Update provider payment link
router.post('/provider/payment-link', authMiddleware, requireRole('provider', 'admin'), ctrl.updateProviderPaymentLink);

// Save PayMongo API credentials
router.post('/provider/paymongo-credentials', authMiddleware, requireRole('provider', 'admin'), ctrl.savePaymongoCredentials);

// Get PayMongo API credentials
router.get('/provider/paymongo-credentials', authMiddleware, requireRole('provider', 'admin'), ctrl.getPaymongoCredentials);

module.exports = router;
