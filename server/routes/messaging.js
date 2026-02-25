// server/routes/messaging.js
// Thin routing layer — delegates all logic to messagingController

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { sendMessageValidation } = require('../middleware/validationSchemas');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/messagingController');

// Get unread messages count for a user
router.get('/user/messages/count', authMiddleware, ctrl.getUnreadMessageCount);

// Get or create conversation for a booking
router.post('/bookings/:id/conversation', authMiddleware, ctrl.getOrCreateBookingConversation);

// Get provider ID from booking
router.get('/bookings/:id/provider', ctrl.getBookingProvider);

// Get user conversations
router.get('/user/conversations', authMiddleware, ctrl.getUserConversations);

// Get conversation messages
router.get('/conversations/:id/messages', authMiddleware, ctrl.getConversationMessages);

// Send message
router.post('/conversations/:id/messages', authMiddleware, sendMessageValidation, validate, ctrl.sendMessage);

// Mark messages as read
router.post('/conversations/:id/read', authMiddleware, ctrl.markMessagesAsRead);

module.exports = router;
