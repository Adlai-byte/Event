// server/controllers/messagingController.js
// Request/response handling for messaging endpoints

const { sendSuccess, sendError } = require('../lib/response');
const messagingService = require('../svc/messagingService');

// ── Helper: emit socket notification ──────────────────────────────
function emitNotification(req, userEmail) {
    const io = req.app.get('io');
    if (io && userEmail) {
        io.to(`user:${userEmail}`).emit('new-notification');
        io.to(`user:${userEmail}`).emit('unread-update');
    }
}

// GET /user/messages/count
async function getUnreadMessageCount(req, res) {
    const email = req.query.email;
    if (!email) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required');
    }
    try {
        const data = await messagingService.getUnreadMessageCount(email);
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Get messages count failed:', err.code, err.message);
        return sendSuccess(res, { count: 0 }); // Return 0 on error to not break UI
    }
}

// POST /bookings/:id/conversation
async function getOrCreateBookingConversation(req, res) {
    const bookingId = Number(req.params.id);
    const { userEmail } = req.body || {};

    if (!Number.isFinite(bookingId) || !userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid request');
    }

    try {
        const data = await messagingService.getOrCreateBookingConversation(bookingId, userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Get or create booking conversation failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// GET /bookings/:id/provider
async function getBookingProvider(req, res) {
    const bookingId = Number(req.params.id);

    if (!Number.isFinite(bookingId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID');
    }

    try {
        const data = await messagingService.getBookingProvider(bookingId);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Get booking provider failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// GET /user/conversations
async function getUserConversations(req, res) {
    const email = req.query.email;
    if (!email) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required');
    }
    try {
        const data = await messagingService.getUserConversations(email);
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Get conversations failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// GET /conversations/:id/messages
async function getConversationMessages(req, res) {
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid conversation ID');
    }
    try {
        const data = await messagingService.getConversationMessages(conversationId);
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Get messages failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// POST /conversations/:id/messages
async function sendMessage(req, res) {
    const conversationId = Number(req.params.id);
    const { userEmail, content } = req.body || {};

    if (!Number.isFinite(conversationId) || !userEmail || !content) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid request');
    }

    try {
        const data = await messagingService.sendMessage(conversationId, userEmail, content);

        // Emit socket events for real-time updates
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${data.conversationId}`).emit('new-message', {
                conversationId: data.conversationId.toString(),
                message: data.message,
            });

            if (data.otherUserEmail) {
                emitNotification(req, data.otherUserEmail);
            }
        }

        return sendSuccess(res, { message: data.message });
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Send message failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

// POST /conversations/:id/read
async function markMessagesAsRead(req, res) {
    const conversationId = Number(req.params.id);
    const { userEmail } = req.body || {};

    if (!Number.isFinite(conversationId) || !userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid request');
    }

    try {
        const data = await messagingService.markMessagesAsRead(conversationId, userEmail);

        // Emit socket event for unread count update
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${data.userEmail}`).emit('unread-update');
        }

        return sendSuccess(res, { message: 'Messages marked as read' });
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Mark messages as read failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

module.exports = {
    getUnreadMessageCount,
    getOrCreateBookingConversation,
    getBookingProvider,
    getUserConversations,
    getConversationMessages,
    sendMessage,
    markMessagesAsRead,
};
