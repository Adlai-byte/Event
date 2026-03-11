// server/svc/adminService.js
// Pure business logic + DB queries for admin endpoints (no req/res knowledge)
const { getPool } = require('../db');

/**
 * Fetch all provider applications.
 * Auto-creates missing columns when they don't exist yet.
 */
async function getProviderApplications() {
    const pool = getPool();
    const query = `
        SELECT iduser, u_fname, u_lname, u_email, u_provider_status, u_role, u_business_document, u_valid_id_document,
               COALESCE(u_provider_applied_at, u_created_at) as applied_at
        FROM \`user\`
        WHERE u_provider_status IN ('pending', 'approved', 'rejected') OR u_role = 'provider'
        ORDER BY COALESCE(u_provider_applied_at, u_created_at) DESC
    `;

    try {
        const [rows] = await pool.query(query);
        return rows;
    } catch (queryErr) {
        if (queryErr.code === 'ER_BAD_FIELD_ERROR') {
            // Auto-add missing columns
            if (queryErr.message.includes('u_provider_status')) {
                await pool.query("ALTER TABLE `user` ADD COLUMN u_provider_status ENUM('pending', 'approved', 'rejected') DEFAULT NULL");
            }
            if (queryErr.message.includes('u_business_document')) {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_business_document VARCHAR(500) DEFAULT NULL');
            }
            if (queryErr.message.includes('u_valid_id_document')) {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_valid_id_document VARCHAR(500) DEFAULT NULL');
            }
            if (queryErr.message.includes('u_provider_applied_at')) {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_applied_at TIMESTAMP NULL DEFAULT NULL');
                console.log('Added u_provider_applied_at column in admin query');
            }
            // Retry after column creation
            const [rows] = await pool.query(query);
            return rows;
        }
        throw queryErr;
    }
}

/**
 * Approve a provider application.
 * @param {number} userId
 * @returns {{ user: object }} The user row before update
 * @throws Error with .statusCode and .errorCode when validation fails
 */
async function approveProviderApplication(userId) {
    const pool = getPool();

    const [userRows] = await pool.query(
        'SELECT iduser, u_email, u_role, u_provider_status FROM `user` WHERE iduser = ?',
        [userId]
    );

    if (userRows.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        err.errorCode = 'NOT_FOUND';
        throw err;
    }

    const user = userRows[0];

    if (user.u_role === 'provider') {
        const err = new Error('User is already a provider');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }

    await pool.query(
        'UPDATE `user` SET u_role = ?, u_provider_status = ? WHERE iduser = ?',
        ['provider', 'approved', userId]
    );

    console.log(`Provider application approved for user ID ${userId} (${user.u_email})`);
    return { user };
}

/**
 * Reject a provider application with a reason.
 * Creates notification table if needed, inserts notification, and sends push.
 * @param {number} userId
 * @param {string} rejectionReason
 * @returns {{ user: object }}
 */
async function rejectProviderApplication(userId, rejectionReason) {
    const pool = getPool();

    const [userRows] = await pool.query(
        'SELECT iduser, u_email, u_provider_status FROM `user` WHERE iduser = ?',
        [userId]
    );

    if (userRows.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        err.errorCode = 'NOT_FOUND';
        throw err;
    }

    const user = userRows[0];

    // Ensure rejection_reason column exists
    try {
        await pool.query('SELECT u_rejection_reason FROM `user` LIMIT 1');
    } catch (checkErr) {
        if (checkErr.code === 'ER_BAD_FIELD_ERROR') {
            console.log('Missing u_rejection_reason column, creating it...');
            try {
                await pool.query('ALTER TABLE `user` ADD COLUMN u_rejection_reason TEXT DEFAULT NULL');
                console.log('Added u_rejection_reason column');
            } catch (alterErr) {
                console.error('Failed to add u_rejection_reason column:', alterErr);
            }
        }
    }

    // Update provider status to rejected with reason
    await pool.query(
        'UPDATE `user` SET u_provider_status = ?, u_rejection_reason = ? WHERE iduser = ?',
        ['rejected', rejectionReason.trim(), userId]
    );

    // Create a notification for the user (for notification bell)
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`notification\` (
                \`idnotification\` INT(11) NOT NULL AUTO_INCREMENT,
                \`n_user_id\` INT(11) NOT NULL,
                \`n_title\` VARCHAR(255) NOT NULL,
                \`n_message\` TEXT NOT NULL,
                \`n_type\` VARCHAR(50) NOT NULL DEFAULT 'info',
                \`n_is_read\` TINYINT(1) NOT NULL DEFAULT 0,
                \`n_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`idnotification\`),
                INDEX \`idx_user\` (\`n_user_id\`),
                INDEX \`idx_read\` (\`n_is_read\`),
                INDEX \`idx_created\` (\`n_created_at\`),
                FOREIGN KEY (\`n_user_id\`) REFERENCES \`user\`(\`iduser\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(
            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
            [
                userId,
                'Provider Application Rejected',
                `Your provider application has been rejected.\n\nReason: ${rejectionReason.trim()}\n\nYou can reapply at any time by submitting a new application.`,
                'provider_application_rejected',
                0
            ]
        );

        console.log(`Notification created for user ID ${userId}`);

        // Send push notification to the user
        try {
            if (global.sendPushNotification) {
                await global.sendPushNotification(
                    user.u_email,
                    'Provider Application Rejected',
                    `Your provider application has been rejected. Reason: ${rejectionReason.trim().substring(0, 100)}${rejectionReason.trim().length > 100 ? '...' : ''}`,
                    {
                        type: 'provider_application_rejected',
                        userId: userId.toString(),
                    }
                );
                console.log(`Push notification sent to user ${user.u_email}`);
            }
        } catch (pushErr) {
            console.error('Failed to send push notification (non-critical):', pushErr);
        }
    } catch (notifErr) {
        console.error('Failed to create notification (non-critical):', notifErr);
    }

    console.log(`Provider application rejected for user ID ${userId} (${user.u_email}) with reason`);
    return { user };
}

/**
 * Fetch admin analytics: revenue, users, bookings, avg booking value,
 * monthly revenue, user growth, top services, booking status distribution.
 */
async function getAnalytics() {
    const pool = getPool();

    // 1. Total Revenue (current month vs last month)
    const [currentRevenue] = await pool.query(`
        SELECT COALESCE(SUM(b_total_cost), 0) as revenue
        FROM booking
        WHERE b_status IN ('confirmed', 'completed')
        AND MONTH(b_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
    `);

    const [previousRevenue] = await pool.query(`
        SELECT COALESCE(SUM(b_total_cost), 0) as revenue
        FROM booking
        WHERE b_status IN ('confirmed', 'completed')
        AND MONTH(b_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(b_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const totalRevenue = parseFloat(currentRevenue[0].revenue) || 0;
    const prevTotalRevenue = parseFloat(previousRevenue[0].revenue) || 0;
    const revenueChange = prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1)
        : totalRevenue > 0 ? '100' : '0';
    const revenueTrend = totalRevenue >= prevTotalRevenue ? 'up' : 'down';

    // 2. Active Users (non-disabled users) - change based on new registrations
    const [currentActiveUsers] = await pool.query(`
        SELECT COUNT(*) as active_users
        FROM user
        WHERE u_disabled = 0
        AND u_email != 'admin@gmail.com'
    `);

    const [newUsersThisMonth] = await pool.query(`
        SELECT COUNT(*) as new_users
        FROM user
        WHERE u_email != 'admin@gmail.com'
        AND MONTH(u_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(u_created_at) = YEAR(CURRENT_DATE())
    `);

    const [newUsersLastMonth] = await pool.query(`
        SELECT COUNT(*) as new_users
        FROM user
        WHERE u_email != 'admin@gmail.com'
        AND MONTH(u_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(u_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const activeUsers = parseInt(currentActiveUsers[0].active_users) || 0;
    const newUsersCurrent = parseInt(newUsersThisMonth[0].new_users) || 0;
    const newUsersPrevious = parseInt(newUsersLastMonth[0].new_users) || 0;
    const usersChange = newUsersPrevious > 0
        ? ((newUsersCurrent - newUsersPrevious) / newUsersPrevious * 100).toFixed(1)
        : newUsersCurrent > 0 ? '100' : '0';
    const usersTrend = newUsersCurrent >= newUsersPrevious ? 'up' : 'down';

    // 3. Total Bookings (current month vs last month)
    const [currentBookings] = await pool.query(`
        SELECT COUNT(*) as total_bookings
        FROM booking
        WHERE MONTH(b_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
    `);

    const [previousBookings] = await pool.query(`
        SELECT COUNT(*) as total_bookings
        FROM booking
        WHERE MONTH(b_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(b_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const totalBookings = parseInt(currentBookings[0].total_bookings) || 0;
    const prevTotalBookings = parseInt(previousBookings[0].total_bookings) || 0;
    const bookingsChange = prevTotalBookings > 0
        ? ((totalBookings - prevTotalBookings) / prevTotalBookings * 100).toFixed(1)
        : totalBookings > 0 ? '100' : '0';
    const bookingsTrend = totalBookings >= prevTotalBookings ? 'up' : 'down';

    // 4. Average Booking Value (current month vs last month)
    const [currentAvgBooking] = await pool.query(`
        SELECT COALESCE(AVG(b_total_cost), 0) as avg_value
        FROM booking
        WHERE b_status IN ('confirmed', 'completed')
        AND MONTH(b_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
    `);

    const [previousAvgBooking] = await pool.query(`
        SELECT COALESCE(AVG(b_total_cost), 0) as avg_value
        FROM booking
        WHERE b_status IN ('confirmed', 'completed')
        AND MONTH(b_created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(b_created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const avgBookingValue = parseFloat(currentAvgBooking[0].avg_value) || 0;
    const prevAvgBookingValue = parseFloat(previousAvgBooking[0].avg_value) || 0;
    const avgBookingChange = prevAvgBookingValue > 0
        ? ((avgBookingValue - prevAvgBookingValue) / prevAvgBookingValue * 100).toFixed(1)
        : avgBookingValue > 0 ? '100' : '0';
    const avgBookingTrend = avgBookingValue >= prevAvgBookingValue ? 'up' : 'down';

    // 5. Monthly Revenue for last 12 months
    const [monthlyRevenue] = await pool.query(`
        SELECT
            MONTH(b_created_at) as month,
            YEAR(b_created_at) as year,
            COALESCE(SUM(b_total_cost), 0) as revenue
        FROM booking
        WHERE b_status IN ('confirmed', 'completed')
        AND b_created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        GROUP BY YEAR(b_created_at), MONTH(b_created_at)
        ORDER BY year, month
    `);

    const monthlyRevenueData = [];
    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const revenueMap = {};
    monthlyRevenue.forEach(row => {
        const key = `${row.year}-${row.month}`;
        revenueMap[key] = parseFloat(row.revenue) || 0;
    });

    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        monthlyRevenueData.push({
            month: monthLabels[date.getMonth()],
            revenue: revenueMap[key] || 0
        });
    }

    // 6. Conversion rate
    const conversionRate = activeUsers > 0
        ? ((totalBookings / activeUsers) * 100).toFixed(1)
        : '0';

    // 7. Top Performing Services
    const [topServices] = await pool.query(`
        SELECT
            s.s_name as service_name,
            COUNT(bs.bs_booking_id) as booking_count,
            COALESCE(SUM(bs.bs_total_price), 0) as total_revenue
        FROM service s
        INNER JOIN booking_service bs ON s.idservice = bs.bs_service_id
        INNER JOIN booking b ON bs.bs_booking_id = b.idbooking
        WHERE b.b_status IN ('confirmed', 'completed')
        GROUP BY s.idservice, s.s_name
        ORDER BY booking_count DESC, total_revenue DESC
        LIMIT 10
    `);

    // 8. Booking Status Distribution
    const [statusDistribution] = await pool.query(`
        SELECT
            b_status,
            COUNT(*) as count
        FROM booking
        GROUP BY b_status
    `);

    const totalStatusCount = statusDistribution.reduce((sum, row) => sum + parseInt(row.count), 0);
    const statusData = statusDistribution.map(row => {
        const count = parseInt(row.count) || 0;
        const percentage = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
        let color = '#3b82f6';
        if (row.b_status === 'pending') color = '#f59e0b';
        else if (row.b_status === 'completed') color = '#10b981';
        else if (row.b_status === 'cancelled') color = '#ef4444';

        return {
            status: row.b_status.charAt(0).toUpperCase() + row.b_status.slice(1),
            count: count,
            percentage: percentage,
            color: color
        };
    });

    return {
        totalRevenue: {
            value: totalRevenue,
            change: revenueChange,
            trend: revenueTrend
        },
        activeUsers: {
            value: activeUsers,
            change: usersChange,
            trend: usersTrend
        },
        totalBookings: {
            value: totalBookings,
            change: bookingsChange,
            trend: bookingsTrend
        },
        avgBookingValue: {
            value: avgBookingValue,
            change: avgBookingChange,
            trend: avgBookingTrend
        },
        monthlyRevenue: monthlyRevenueData,
        userGrowth: {
            newUsersThisMonth: newUsersCurrent,
            activeUsers: activeUsers,
            conversionRate: conversionRate
        },
        topServices: topServices.map(row => ({
            name: row.service_name,
            bookings: parseInt(row.booking_count) || 0,
            revenue: parseFloat(row.total_revenue) || 0
        })),
        bookingStatusDistribution: statusData
    };
}

/**
 * Fetch admin dashboard stats: core counts, "new this month" figures, and recent activity.
 */
async function getDashboardStats() {
    const pool = getPool();

    // Core counts
    const [userStats] = await pool.query(`
        SELECT
            COUNT(*) as total_users,
            SUM(CASE WHEN u_disabled = 0 THEN 1 ELSE 0 END) as active_users
        FROM user
        WHERE u_email != 'admin@gmail.com'
    `);

    const [serviceStats] = await pool.query(`
        SELECT
            COUNT(*) as total_services,
            SUM(CASE WHEN s_is_active = 1 THEN 1 ELSE 0 END) as active_services
        FROM service
    `);

    const [bookingStats] = await pool.query(`
        SELECT
            COUNT(*) as total_bookings,
            SUM(CASE WHEN b_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings
        FROM booking
    `);

    // "New this month" counts
    const [newUsersThisMonth] = await pool.query(`
        SELECT COUNT(*) as count FROM user
        WHERE u_email != 'admin@gmail.com'
        AND MONTH(u_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(u_created_at) = YEAR(CURRENT_DATE())
    `);

    const [newServicesThisMonth] = await pool.query(`
        SELECT COUNT(*) as count FROM service
        WHERE MONTH(s_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(s_created_at) = YEAR(CURRENT_DATE())
    `);

    const [completedBookingsThisMonth] = await pool.query(`
        SELECT COUNT(*) as count FROM booking
        WHERE b_status = 'completed'
        AND MONTH(b_created_at) = MONTH(CURRENT_DATE())
        AND YEAR(b_created_at) = YEAR(CURRENT_DATE())
    `);

    // Monthly bookings for last 12 months (for bar chart)
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

    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const bookingsMap = {};
    monthlyBookings.forEach(row => {
        bookingsMap[`${row.year}-${row.month}`] = parseInt(row.bookings) || 0;
    });

    const monthlyBookingsData = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        monthlyBookingsData.push({
            month: monthLabels[date.getMonth()],
            bookings: bookingsMap[`${year}-${month}`] || 0,
        });
    }

    // Recent activity — latest signups, bookings, and provider applications
    const [recentSignups] = await pool.query(`
        SELECT u_fname, u_lname, u_created_at
        FROM user
        WHERE u_email != 'admin@gmail.com'
        ORDER BY u_created_at DESC
        LIMIT 3
    `);

    const [recentBookings] = await pool.query(`
        SELECT b.b_status, b.b_created_at, u.u_fname, u.u_lname
        FROM booking b
        LEFT JOIN user u ON b.b_client_id = u.iduser
        ORDER BY b.b_created_at DESC
        LIMIT 3
    `);

    const [recentApplications] = await pool.query(`
        SELECT u_fname, u_lname, u_provider_status,
               COALESCE(u_provider_applied_at, u_created_at) as applied_at
        FROM user
        WHERE u_provider_status IN ('pending', 'approved', 'rejected')
        ORDER BY COALESCE(u_provider_applied_at, u_created_at) DESC
        LIMIT 3
    `);

    // Build recent activity list
    const recentActivity = [];

    for (const row of recentSignups) {
        recentActivity.push({
            type: 'signup',
            description: `New user registered: ${row.u_fname} ${row.u_lname}`,
            timestamp: row.u_created_at,
        });
    }

    for (const row of recentBookings) {
        const status = row.b_status.charAt(0).toUpperCase() + row.b_status.slice(1);
        const name = row.u_fname ? `${row.u_fname} ${row.u_lname}` : 'Unknown';
        recentActivity.push({
            type: 'booking',
            description: `Booking ${status} by ${name}`,
            timestamp: row.b_created_at,
        });
    }

    for (const row of recentApplications) {
        const status = row.u_provider_status.charAt(0).toUpperCase() + row.u_provider_status.slice(1);
        recentActivity.push({
            type: 'application',
            description: `Provider application (${status}): ${row.u_fname} ${row.u_lname}`,
            timestamp: row.applied_at,
        });
    }

    // Sort by timestamp descending
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
        totalUsers: parseInt(userStats[0].total_users) || 0,
        activeUsers: parseInt(userStats[0].active_users) || 0,
        totalServices: parseInt(serviceStats[0].total_services) || 0,
        activeServices: parseInt(serviceStats[0].active_services) || 0,
        totalBookings: parseInt(bookingStats[0].total_bookings) || 0,
        pendingBookings: parseInt(bookingStats[0].pending_bookings) || 0,
        newUsersThisMonth: parseInt(newUsersThisMonth[0].count) || 0,
        newServicesThisMonth: parseInt(newServicesThisMonth[0].count) || 0,
        completedBookingsThisMonth: parseInt(completedBookingsThisMonth[0].count) || 0,
        monthlyBookings: monthlyBookingsData,
        recentActivity: recentActivity.slice(0, 8),
    };
}

module.exports = {
    getProviderApplications,
    approveProviderApplication,
    rejectProviderApplication,
    getAnalytics,
    getDashboardStats,
};
