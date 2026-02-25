// server/controllers/analyticsController.js
// Request/response handling for analytics endpoints
const { sendSuccess, sendError } = require('../lib/response');
const analyticsService = require('../svc/analyticsService');

/**
 * GET /provider/dashboard/stats
 */
async function getProviderDashboardStats(req, res) {
    const providerEmail = req.query.providerEmail;
    const providerId = req.query.providerId;

    if (!providerEmail && !providerId) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email or ID is required', 400);
    }

    try {
        const userId = await analyticsService.resolveProviderUserId(providerEmail, providerId);

        if (userId === null) {
            return sendSuccess(res, { stats: analyticsService.EMPTY_PROVIDER_STATS });
        }

        const stats = await analyticsService.getProviderDashboardStats(userId);
        return sendSuccess(res, { stats });
    } catch (err) {
        console.error('Get provider dashboard stats failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /provider/activity
 */
async function getProviderActivity(req, res) {
    const providerEmail = req.query.providerEmail;
    const providerId = req.query.providerId;
    const limit = parseInt(req.query.limit) || 10;

    if (!providerEmail && !providerId) {
        return sendError(res, 'VALIDATION_ERROR', 'Provider email or ID is required', 400);
    }

    try {
        const userId = await analyticsService.resolveProviderUserId(providerEmail, providerId);

        if (userId === null) {
            return sendSuccess(res, { activities: [] });
        }

        const activities = await analyticsService.getProviderActivity(userId, limit);
        return sendSuccess(res, { activities });
    } catch (err) {
        console.error('Get provider activity failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

/**
 * GET /dashboard/stats
 */
async function getDashboardStats(req, res) {
    try {
        const stats = await analyticsService.getDashboardStats();
        return sendSuccess(res, { stats });
    } catch (err) {
        console.error('Get dashboard stats failed:', err.code, err.message);
        return sendError(res, 'SERVER_ERROR', 'Database error', 500);
    }
}

module.exports = {
    getProviderDashboardStats,
    getProviderActivity,
    getDashboardStats,
};
