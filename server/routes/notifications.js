// server/routes/notifications.js
// Thin routing layer — delegates all logic to notificationController

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const ctrl = require('../controllers/notificationController');

// Register push notification token
router.post('/notifications/register-token', authMiddleware, ctrl.registerToken);

// Get VAPID public key for web push
router.get('/notifications/vapid-public-key', ctrl.getVapidPublicKey);

// Get user notifications
router.get('/notifications', authMiddleware, ctrl.getUserNotifications);

// Get unread notification count
router.get('/notifications/unread-count', authMiddleware, ctrl.getUnreadCount);

// Mark notification as read
router.post('/notifications/:id/read', authMiddleware, ctrl.markAsRead);

// Mark all notifications as read
router.post('/notifications/mark-all-read', authMiddleware, ctrl.markAllAsRead);

// Test endpoint to send push notification manually (admin only)
router.post('/notifications/test-push', authMiddleware, requireRole('admin'), ctrl.testPush);

// Get push tokens for a user (for debugging)
router.get('/notifications/push-tokens/:email', authMiddleware, ctrl.getPushTokens);

// Delete push tokens for a user
router.delete('/notifications/push-tokens/:email', authMiddleware, ctrl.deletePushTokens);

module.exports = router;
