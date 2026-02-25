// server/routes/analytics.js
// Thin routing layer — delegates to analyticsController
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const analyticsController = require('../controllers/analyticsController');

// Provider dashboard stats
router.get('/provider/dashboard/stats', authMiddleware, requireRole('provider', 'admin'), analyticsController.getProviderDashboardStats);

// Provider recent activity
router.get('/provider/activity', authMiddleware, requireRole('provider', 'admin'), analyticsController.getProviderActivity);

// Admin dashboard stats
router.get('/dashboard/stats', authMiddleware, requireRole('admin'), analyticsController.getDashboardStats);

module.exports = router;
