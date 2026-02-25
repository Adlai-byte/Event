// server/svc/analyticsService.js
// Pure business logic + DB queries for analytics endpoints (no req/res knowledge)
const { getPool } = require('../db');

/**
 * Resolve a provider's database user ID from email or providerId.
 * @param {string|undefined} providerEmail
 * @param {string|undefined} providerId
 * @returns {number|null} userId or null if not found / not resolvable
 */
async function resolveProviderUserId(providerEmail, providerId) {
    const pool = getPool();

    if (providerEmail) {
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
        if (userRows.length === 0) return null;
        return userRows[0].iduser;
    }

    if (providerId && providerId.includes('@')) {
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
        if (userRows.length === 0) return null;
        return userRows[0].iduser;
    }

    // Firebase UID without email - cannot resolve
    return null;
}

/**
 * Get provider dashboard statistics.
 * @param {number} userId - The provider's database user ID
 * @returns {object} stats
 */
async function getProviderDashboardStats(userId) {
    const pool = getPool();

    // Get service stats
    const [serviceStats] = await pool.query(`
        SELECT
            COUNT(*) as total_services,
            SUM(CASE WHEN s_is_active = 1 THEN 1 ELSE 0 END) as active_services,
            COALESCE(AVG(s_rating), 0) as average_rating
        FROM service
        WHERE s_provider_id = ?
    `, [userId]);

    // Get booking stats for provider's services
    const [bookingStats] = await pool.query(`
        SELECT
            COUNT(DISTINCT b.idbooking) as total_bookings,
            SUM(CASE WHEN b.b_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
            SUM(CASE WHEN b.b_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
            SUM(CASE WHEN b.b_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
            SUM(CASE WHEN b.b_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
            COALESCE(SUM(CASE WHEN b.b_status = 'completed' THEN b.b_total_cost ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN b.b_status = 'completed'
                              AND MONTH(b.b_created_at) = MONTH(CURRENT_DATE())
                              AND YEAR(b.b_created_at) = YEAR(CURRENT_DATE())
                         THEN b.b_total_cost ELSE 0 END), 0) as monthly_revenue
        FROM booking b
        INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
        INNER JOIN service s ON bs.bs_service_id = s.idservice
        WHERE s.s_provider_id = ?
    `, [userId]);

    // Get proposal stats
    const [proposalStats] = await pool.query(`
        SELECT
            COUNT(*) as total_proposals,
            SUM(CASE WHEN p_status IN ('submitted', 'under_review', 'accepted', 'revised') THEN 1 ELSE 0 END) as active_proposals
        FROM proposal
        WHERE p_provider_id = ?
    `, [userId]);

    return {
        totalServices: parseInt(serviceStats[0].total_services) || 0,
        activeServices: parseInt(serviceStats[0].active_services) || 0,
        totalBookings: parseInt(bookingStats[0].total_bookings) || 0,
        pendingBookings: parseInt(bookingStats[0].pending_bookings) || 0,
        confirmedBookings: parseInt(bookingStats[0].confirmed_bookings) || 0,
        completedBookings: parseInt(bookingStats[0].completed_bookings) || 0,
        cancelledBookings: parseInt(bookingStats[0].cancelled_bookings) || 0,
        totalRevenue: parseFloat(bookingStats[0].total_revenue) || 0,
        monthlyRevenue: parseFloat(bookingStats[0].monthly_revenue) || 0,
        totalProposals: parseInt(proposalStats[0].total_proposals) || 0,
        activeProposals: parseInt(proposalStats[0].active_proposals) || 0,
        averageRating: parseFloat(serviceStats[0].average_rating) || 0
    };
}

/**
 * Get recent activity for a provider.
 * @param {number} userId - The provider's database user ID
 * @param {number} limit - Max number of activity items to return
 * @returns {Array} activities sorted by most recent first
 */
async function getProviderActivity(userId, limit) {
    const pool = getPool();

    // Get provider's service IDs
    const [serviceRows] = await pool.query('SELECT idservice FROM service WHERE s_provider_id = ?', [userId]);
    const serviceIds = serviceRows.map(s => s.idservice);

    const activities = [];

    // Get recent bookings for provider's services
    if (serviceIds.length > 0) {
        const [bookings] = await pool.query(`
            SELECT
                'booking' as type,
                'New booking received' as description,
                b.b_created_at as created_at,
                b.idbooking as entity_id,
                CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                s.s_name as service_name
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            LEFT JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
            ORDER BY b.b_created_at DESC
            LIMIT ?
        `, [...serviceIds, limit]);

        activities.push(...bookings.map(b => ({
            type: b.type,
            description: b.description,
            created_at: b.created_at,
            entity_id: b.entity_id,
            metadata: {
                client_name: b.client_name,
                service_name: b.service_name
            }
        })));
    }

    // Get recent service updates
    const [serviceUpdates] = await pool.query(`
        SELECT
            'service' as type,
            'Service updated' as description,
            s.s_updated_at as created_at,
            s.idservice as entity_id,
            s.s_name as service_name
        FROM service s
        WHERE s.s_provider_id = ? AND s.s_updated_at != s.s_created_at
        ORDER BY s.s_updated_at DESC
        LIMIT ?
    `, [userId, limit]);

    activities.push(...serviceUpdates.map(s => ({
        type: s.type,
        description: s.description,
        created_at: s.created_at,
        entity_id: s.entity_id,
        metadata: {
            service_name: s.service_name
        }
    })));

    // Get recent payments for provider's services
    if (serviceIds.length > 0) {
        const [payments] = await pool.query(`
            SELECT
                'payment' as type,
                'Payment received' as description,
                p.p_paid_at as created_at,
                p.idpayment as entity_id,
                p.p_amount as amount,
                b.idbooking as booking_id,
                s.s_name as service_name
            FROM payment p
            LEFT JOIN booking b ON p.p_booking_id = b.idbooking
            LEFT JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
                AND p.p_status = 'completed'
                AND p.p_paid_at IS NOT NULL
            ORDER BY p.p_paid_at DESC
            LIMIT ?
        `, [...serviceIds, limit]);

        activities.push(...payments.map(p => ({
            type: p.type,
            description: p.description,
            created_at: p.created_at,
            entity_id: p.entity_id,
            metadata: {
                amount: p.amount,
                service_name: p.service_name
            }
        })));
    }

    // Sort all activities by created_at (most recent first) and limit
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return activities.slice(0, limit);
}

/**
 * Get admin dashboard statistics.
 * @returns {object} stats
 */
async function getDashboardStats() {
    const pool = getPool();

    // Get user stats
    const [userStats] = await pool.query(`
        SELECT
            COUNT(*) as total_users,
            SUM(CASE WHEN u_disabled = 0 THEN 1 ELSE 0 END) as active_users
        FROM user
        WHERE u_email != 'admin@gmail.com'
    `);

    // Get service stats
    const [serviceStats] = await pool.query(`
        SELECT
            COUNT(*) as total_services,
            SUM(CASE WHEN s_is_active = 1 THEN 1 ELSE 0 END) as active_services
        FROM service
    `);

    // Get booking stats
    const [bookingStats] = await pool.query(`
        SELECT
            COUNT(*) as total_bookings,
            SUM(CASE WHEN b_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings
        FROM booking
    `);

    // Get revenue stats
    const [revenueStats] = await pool.query(`
        SELECT
            COALESCE(SUM(b_total_cost), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN MONTH(b_created_at) = MONTH(CURRENT_DATE())
                              AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
                         THEN b_total_cost ELSE 0 END), 0) as monthly_revenue
        FROM booking
        WHERE b_status = 'completed'
    `);

    // Get monthly bookings for last 12 months
    const [monthlyBookings] = await pool.query(`
        SELECT
            MONTH(b_created_at) as month,
            YEAR(b_created_at) as year,
            COUNT(*) as bookings
        FROM booking
        WHERE b_created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        GROUP BY YEAR(b_created_at), MONTH(b_created_at)
        ORDER BY year, month
    `);

    // Create array for 12 months with booking data
    const monthlyBookingsData = [];
    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const bookingsMap = {};
    monthlyBookings.forEach(row => {
        const key = `${row.year}-${row.month}`;
        bookingsMap[key] = parseInt(row.bookings) || 0;
    });

    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        monthlyBookingsData.push({
            month: monthLabels[date.getMonth()],
            bookings: bookingsMap[key] || 0
        });
    }

    return {
        totalUsers: userStats[0].total_users || 0,
        activeUsers: userStats[0].active_users || 0,
        totalServices: serviceStats[0].total_services || 0,
        activeServices: serviceStats[0].active_services || 0,
        totalBookings: bookingStats[0].total_bookings || 0,
        pendingBookings: bookingStats[0].pending_bookings || 0,
        totalRevenue: parseFloat(revenueStats[0].total_revenue) || 0,
        monthlyRevenue: parseFloat(revenueStats[0].monthly_revenue) || 0,
        monthlyBookings: monthlyBookingsData
    };
}

/**
 * Default empty stats object for provider dashboard.
 */
const EMPTY_PROVIDER_STATS = {
    totalServices: 0,
    activeServices: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalProposals: 0,
    activeProposals: 0,
    averageRating: 0
};

module.exports = {
    resolveProviderUserId,
    getProviderDashboardStats,
    getProviderActivity,
    getDashboardStats,
    EMPTY_PROVIDER_STATS,
};
