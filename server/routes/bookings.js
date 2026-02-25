// server/routes/bookings.js
// Thin routing layer -- maps HTTP verbs + paths to controller functions.
// All business logic lives in svc/bookingService.js;
// all request/response handling lives in controllers/bookingController.js.

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { createBookingValidation, paymentMethodValidation } = require('../middleware/validationSchemas');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/bookingController');

// ============================================
// BOOKINGS CRUD
// ============================================
router.get('/bookings',                      authMiddleware, requireRole('admin'),                ctrl.listBookings);
router.get('/user/bookings',                 authMiddleware,                                      ctrl.getUserBookings);
router.get('/user/bookings/count',           authMiddleware,                                      ctrl.getUserBookingsCount);
router.get('/bookings/:id',                  authMiddleware,                                      ctrl.getBookingById);
router.post('/bookings',                     authMiddleware, createBookingValidation, validate,   ctrl.createBooking);
router.put('/bookings/:id',                  authMiddleware,                                      ctrl.updateBooking);
router.post('/bookings/:id/status',          authMiddleware,                                      ctrl.updateBookingStatus);

// ============================================
// PAYMENT METHODS
// ============================================
router.get('/user/payment-methods',                     authMiddleware,                                              ctrl.getPaymentMethods);
router.post('/user/payment-methods',                    authMiddleware, paymentMethodValidation, validate,            ctrl.addPaymentMethod);
router.post('/user/payment-methods/:id/set-default',    authMiddleware,                                              ctrl.setDefaultPaymentMethod);
router.delete('/user/payment-methods/:id',              authMiddleware,                                              ctrl.deletePaymentMethod);

// ============================================
// PAYMENT PROCESSING
// ============================================
router.post('/bookings/:bookingId/pay',                 authMiddleware, paymentLimiter,           ctrl.createPaymongoPayment);
router.post('/bookings/:bookingId/pay-cash',            authMiddleware, paymentLimiter,           ctrl.processCashPayment);
router.get('/payments/paymongo/success',                                                         ctrl.paymongoSuccess);
router.get('/payments/paymongo/failed',                                                          ctrl.paymongoFailed);
router.post('/bookings/:bookingId/payment/complete',    authMiddleware, paymentLimiter,           ctrl.markPaymentComplete);

// ============================================
// PROVIDER BOOKINGS
// ============================================
router.get('/provider/bookings',                                         authMiddleware, requireRole('provider', 'admin'),  ctrl.getProviderBookings);
router.post('/provider/bookings/:bookingId/mark-payment-paid',           authMiddleware, requireRole('provider', 'admin'),  ctrl.markCashPaymentPaid);
router.get('/provider/bookings/:bookingId/invoice',                      authMiddleware, requireRole('provider', 'admin'),  ctrl.getProviderInvoice);

// ============================================
// USER INVOICES
// ============================================
router.get('/user/bookings/:bookingId/invoice',          authMiddleware,                          ctrl.getUserInvoice);

// ============================================
// SERVICE RATINGS
// ============================================
router.post('/bookings/:bookingId/services/:serviceId/rate',     authMiddleware,                  ctrl.submitRating);
router.get('/bookings/:bookingId/services/:serviceId/rating',                                    ctrl.getRating);

module.exports = router;
