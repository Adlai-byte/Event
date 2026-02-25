// server/routes/packages.js
// Package endpoints: CRUD for packages, categories, items, booking packages, price calculation
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const ctrl = require('../controllers/packageController');

// ─── Packages ────────────────────────────────────────────────────────
router.get('/services/:serviceId/packages', ctrl.getServicePackages);
router.get('/packages/:id', ctrl.getPackageById);
router.post('/services/:serviceId/packages', authMiddleware, requireRole('provider', 'admin'), ctrl.createPackage);
router.put('/packages/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.updatePackage);
router.delete('/packages/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.deletePackage);

// ─── Categories ──────────────────────────────────────────────────────
router.post('/packages/:id/categories', authMiddleware, requireRole('provider', 'admin'), ctrl.addCategory);
router.put('/categories/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.updateCategory);
router.delete('/categories/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.deleteCategory);

// ─── Items ───────────────────────────────────────────────────────────
router.post('/categories/:id/items', authMiddleware, requireRole('provider', 'admin'), ctrl.addItem);
router.post('/categories/:id/items/bulk', authMiddleware, requireRole('provider', 'admin'), ctrl.bulkAddItems);
router.put('/items/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.updateItem);
router.delete('/items/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.deleteItem);

// ─── Price Calculation ───────────────────────────────────────────────
router.get('/packages/:id/calculate-price', ctrl.calculatePrice);

// ─── Booking Packages ────────────────────────────────────────────────
router.post('/bookings/:bookingId/package', authMiddleware, ctrl.saveBookingPackage);
router.get('/bookings/:bookingId/package', authMiddleware, ctrl.getBookingPackage);

module.exports = router;
