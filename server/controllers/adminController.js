// server/controllers/adminController.js
// Request/response handling for admin endpoints
const { sendSuccess, sendError } = require('../lib/response');
const adminService = require('../svc/adminService');

function emitNotification(req, userEmail) {
    const io = req.app.get('io');
    if (io && userEmail) {
        io.to(`user:${userEmail}`).emit('new-notification');
    }
}

/**
 * GET /provider-applications
 */
async function getProviderApplications(req, res) {
    try {
        const rows = await adminService.getProviderApplications();
        return sendSuccess(res, { rows });
    } catch (err) {
        console.error('Get provider applications failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * POST /provider-applications/:id/approve
 */
async function approveProviderApplication(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid user ID', 400);
    }

    try {
        const { user } = await adminService.approveProviderApplication(id);
        emitNotification(req, user.u_email);
        return sendSuccess(res, { message: 'Provider application approved' });
    } catch (err) {
        if (err.errorCode) {
            return sendError(res, err.errorCode, err.message, err.statusCode);
        }
        console.error('Approve provider failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

/**
 * POST /provider-applications/:id/reject
 */
async function rejectProviderApplication(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid user ID', 400);
    }

    const { rejectionReason } = req.body || {};

    if (!rejectionReason || rejectionReason.trim().length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Rejection reason is required', 400);
    }

    try {
        const { user } = await adminService.rejectProviderApplication(id, rejectionReason);
        emitNotification(req, user.u_email);
        return sendSuccess(res, { message: 'Provider application rejected' });
    } catch (err) {
        if (err.errorCode) {
            return sendError(res, err.errorCode, err.message, err.statusCode);
        }
        console.error('Reject provider failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
    }
}

/**
 * GET /analytics
 */
async function getAnalytics(req, res) {
    try {
        const analytics = await adminService.getAnalytics();
        return sendSuccess(res, { analytics });
    } catch (err) {
        console.error('Get admin analytics failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /dashboard-stats
 */
async function getDashboardStats(req, res) {
    try {
        const stats = await adminService.getDashboardStats();
        return sendSuccess(res, { stats });
    } catch (err) {
        console.error('Get admin dashboard stats failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

module.exports = {
    getProviderApplications,
    approveProviderApplication,
    rejectProviderApplication,
    getAnalytics,
    getDashboardStats,
};
