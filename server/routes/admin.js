// server/routes/admin.js
// Thin routing layer — delegates to adminController
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const adminController = require('../controllers/adminController');

// Provider application management
router.get('/provider-applications', authMiddleware, requireRole('admin'), adminController.getProviderApplications);
router.post('/provider-applications/:id/approve', authMiddleware, requireRole('admin'), adminController.approveProviderApplication);
router.post('/provider-applications/:id/reject', authMiddleware, requireRole('admin'), adminController.rejectProviderApplication);

// Admin dashboard stats (real counts + recent activity)
router.get('/dashboard-stats', authMiddleware, requireRole('admin'), adminController.getDashboardStats);

// Admin analytics
router.get('/analytics', authMiddleware, requireRole('admin'), adminController.getAnalytics);

module.exports = router;
