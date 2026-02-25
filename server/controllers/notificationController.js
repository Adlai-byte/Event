// server/controllers/notificationController.js
// Request/response handling for notification endpoints

const { sendSuccess, sendError } = require('../lib/response');
const notificationService = require('../svc/notificationService');

// POST /notifications/register-token
async function registerToken(req, res) {
    const { userId, userEmail, pushToken, platform, subscriptionData } = req.body || {};

    console.log('Push token registration request received:');
    console.log('   User ID:', userId);
    console.log('   User Email:', userEmail);
    console.log('   Platform:', platform || 'unknown');
    console.log('   Token preview:', pushToken ? pushToken.substring(0, 30) + '...' : 'MISSING');
    console.log('   Has subscription data:', !!subscriptionData);

    if (!userId || !userEmail || !pushToken) {
        console.log('Missing required fields');
        return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
    }

    try {
        const data = await notificationService.registerPushToken(userId, userEmail, pushToken, platform, subscriptionData);
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Error registering push token:', err);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// GET /notifications/vapid-public-key
async function getVapidPublicKey(req, res) {
    try {
        const data = notificationService.getVapidPublicKey();
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Error getting VAPID key:', err);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// GET /notifications
async function getUserNotifications(req, res) {
    const userEmail = req.query.email;
    if (!userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
    }

    try {
        const data = await notificationService.getUserNotifications(userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Get notifications failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// GET /notifications/unread-count
async function getUnreadCount(req, res) {
    const userEmail = req.query.email;
    if (!userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
    }

    try {
        const data = await notificationService.getUnreadNotificationCount(userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Get unread notification count failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// POST /notifications/:id/read
async function markAsRead(req, res) {
    const notificationId = req.params.id;
    const userEmail = req.query.email;

    if (!notificationId) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid notification ID', 400);
    }

    if (!userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
    }

    try {
        const data = await notificationService.markNotificationAsRead(notificationId, userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Mark notification as read failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// POST /notifications/mark-all-read
async function markAllAsRead(req, res) {
    const userEmail = req.query.email;

    if (!userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
    }

    try {
        const data = await notificationService.markAllNotificationsAsRead(userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status);
        }
        console.error('Mark all notifications as read failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// POST /notifications/test-push
async function testPush(req, res) {
    const { userEmail, title, body } = req.body;

    if (!userEmail) {
        return sendError(res, 'VALIDATION_ERROR', 'userEmail is required', 400);
    }

    try {
        const data = await notificationService.testPushNotification(userEmail, title, body);
        return sendSuccess(res, data);
    } catch (err) {
        if (err.code && err.status) {
            return sendError(res, err.code, err.message, err.status, err.details);
        }
        console.error('Test push notification failed:', err);
        return sendError(res, 'SERVER_ERROR', 'Server error: ' + err.message, 500);
    }
}

// GET /notifications/push-tokens/:email
async function getPushTokens(req, res) {
    const userEmail = req.params.email;

    try {
        const data = await notificationService.getPushTokens(userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Get push tokens failed:', err);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

// DELETE /notifications/push-tokens/:email
async function deletePushTokens(req, res) {
    const userEmail = req.params.email;

    try {
        const data = await notificationService.deletePushTokens(userEmail);
        return sendSuccess(res, data);
    } catch (err) {
        console.error('Delete push tokens failed:', err);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

module.exports = {
    registerToken,
    getVapidPublicKey,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    testPush,
    getPushTokens,
    deletePushTokens,
};
