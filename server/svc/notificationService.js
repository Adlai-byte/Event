// server/svc/notificationService.js
// Pure business logic + DB queries for notifications (no req/res knowledge)

const { getPool } = require('../db');

// ── Shared SQL for the notification table DDL ──────────────────────
const ENSURE_NOTIFICATION_TABLE = `
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
`;

const SYSTEM_CONV_QUERY = `
    SELECT c.idconversation
    FROM conversation c
    INNER JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
    WHERE c.c_subject LIKE ?
    AND c.c_service_id IS NULL
    AND c.c_booking_id IS NULL
    AND c.c_hiring_request_id IS NULL
    AND cp.cp_user_id = ?
    LIMIT 1
`;

// ── Helper: look up user ID by email (throws if not found) ────────
async function requireUserIdByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.query(
        'SELECT iduser FROM `user` WHERE u_email = ?',
        [email]
    );
    if (rows.length === 0) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }
    return rows[0].iduser;
}

// ── POST /notifications/register-token ─────────────────────────────
async function registerPushToken(userId, userEmail, pushToken, platform, subscriptionData) {
    const pool = getPool();

    // Create device_tokens table if it doesn't exist (migration-aligned columns)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`device_tokens\` (
            \`id\` INT(11) NOT NULL AUTO_INCREMENT,
            \`dt_user_email\` VARCHAR(255) NOT NULL,
            \`dt_token\` TEXT NOT NULL,
            \`dt_platform\` VARCHAR(20) DEFAULT 'web',
            \`dt_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`dt_updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            INDEX \`idx_user_email\` (\`dt_user_email\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Insert or update token
    const [result] = await pool.query(`
        INSERT INTO \`device_tokens\` (dt_user_email, dt_token, dt_platform)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            dt_token = VALUES(dt_token),
            dt_platform = VALUES(dt_platform),
            dt_updated_at = CURRENT_TIMESTAMP
    `, [userEmail, pushToken, platform || 'unknown']);

    console.log('Push token registered for user:', userEmail);
    console.log('   Platform:', platform || 'unknown');
    console.log('   Token ID:', result.insertId || 'updated');

    return { message: 'Token registered successfully' };
}

// ── GET /notifications/vapid-public-key ────────────────────────────
function getVapidPublicKey() {
    return {
        publicKey: null,
        message: 'VAPID keys not configured. Using browser notifications as fallback.',
    };
}

// ── sendPushNotification (internal function) ───────────────────────
async function sendPushNotification(userEmail, title, body, data = {}) {
    try {
        const pool = getPool();

        // Get all push tokens for the user
        const [tokens] = await pool.query(
            'SELECT dt_token as push_token, dt_platform as platform, dt_created_at as created_at, dt_updated_at as updated_at FROM `device_tokens` WHERE dt_user_email = ?',
            [userEmail]
        );

        if (!tokens || tokens.length === 0) {
            console.log('No push tokens found for user:', userEmail);
            console.log('Make sure the user has logged in and granted notification permissions');
            return { success: false, message: 'No push tokens found' };
        }

        console.log(`Found ${tokens.length} device token(s) for user: ${userEmail}`);
        tokens.forEach((token, index) => {
            console.log(`   Device ${index + 1}: Platform: ${token.platform || 'unknown'}, Token: ${token.push_token.substring(0, 20)}...`);
        });

        // Separate mobile (Expo) and web push tokens
        const expoTokens = tokens.filter(t => t.platform !== 'web');
        const webTokens = tokens.filter(t => t.platform === 'web');

        // Send to Expo Push Notification Service (mobile)
        const expoMessages = expoTokens.map((token) => {
            const message = {
                to: token.push_token,
                sound: 'default',
                title: title,
                body: body,
                data: data,
                badge: 1,
            };

            if (token.platform === 'android') {
                message.priority = 'high';
                message.channelId = 'default';
            }

            return message;
        });

        let expoResult = null;
        if (expoMessages.length > 0) {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expoMessages),
            });
            expoResult = await response.json();
        }

        if (webTokens.length > 0) {
            console.log(`Found ${webTokens.length} web push token(s) - using in-app notifications as fallback`);
            console.log('To enable full web push, install web-push and configure VAPID keys');
        }

        // Process results
        if (expoResult) {
            console.log('Push notification sent successfully');
            console.log('Sent to:', expoTokens.length, 'mobile device(s)');
            if (webTokens.length > 0) {
                console.log('Web tokens:', webTokens.length, '(using in-app notifications)');
            }
            console.log('Response:', JSON.stringify(expoResult, null, 2));

            if (expoResult.data && Array.isArray(expoResult.data)) {
                let successCount = 0;
                let failCount = 0;

                expoResult.data.forEach((receipt, index) => {
                    const token = expoTokens[index];
                    const platform = token?.platform || 'unknown';
                    const tokenPreview = token?.push_token ? token.push_token.substring(0, 30) + '...' : 'N/A';

                    if (receipt.status === 'ok') {
                        console.log(`Device ${index + 1} (${platform}): Notification delivered`);
                        console.log(`   Token: ${tokenPreview}`);
                        successCount++;
                    } else {
                        console.error(`Device ${index + 1} (${platform}): ${receipt.message || 'Failed'}`);
                        console.error(`   Token: ${tokenPreview}`);
                        if (receipt.message && receipt.message.includes('FCM server key')) {
                            console.error(`   FCM credentials not configured for this token`);
                            console.error(`   This token is from an old build. Rebuild the app and re-register the token.`);
                            console.error(`   Run: npx eas-cli build --platform android --profile preview`);
                        }
                        failCount++;
                    }
                });

                console.log(`Summary: ${successCount} successful, ${failCount} failed`);

                if (failCount > 0 && successCount === 0) {
                    console.error(`All notifications failed. Check FCM configuration.`);
                }
            }

            return { success: true, result: expoResult };
        } else if (webTokens.length > 0) {
            console.log('Web push notification handled via in-app notifications');
            return { success: true, message: 'Web notifications handled via in-app system' };
        } else {
            console.error('No tokens to send notifications to');
            return { success: false, error: 'No tokens found' };
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message };
    }
}

// Make sendPushNotification available globally for use in other endpoints
global.sendPushNotification = sendPushNotification;

// ── GET /notifications ─────────────────────────────────────────────
async function getUserNotifications(userEmail) {
    const pool = getPool();

    const userId = await requireUserIdByEmail(userEmail);

    // Ensure notification table exists
    await pool.query(ENSURE_NOTIFICATION_TABLE);

    // Get notifications from notification table
    const [notifications] = await pool.query(
        'SELECT * FROM `notification` WHERE n_user_id = ? ORDER BY n_created_at DESC LIMIT 50',
        [userId]
    );

    // Also fetch system messages from "System Notifications" conversation
    const [systemConvRows] = await pool.query(SYSTEM_CONV_QUERY, ['System Notifications%', userId]);

    const systemNotifications = [];
    if (systemConvRows.length > 0) {
        const conversationId = systemConvRows[0].idconversation;

        const [systemMessages] = await pool.query(
            `SELECT m.idmessage, m.m_content, m.m_created_at, m.m_is_read
             FROM message m
             WHERE m.m_conversation_id = ?
             AND m.m_message_type = 'system'
             ORDER BY m.m_created_at DESC
             LIMIT 50`,
            [conversationId]
        );

        for (const msg of systemMessages) {
            if (msg.m_content.includes('provider application has been rejected')) {
                const reasonMatch = msg.m_content.match(/Reason: (.+?)(\n|$)/);
                const reason = reasonMatch ? reasonMatch[1].trim() : '';

                systemNotifications.push({
                    idnotification: `system_${msg.idmessage}`,
                    n_user_id: userId,
                    n_title: 'Provider Application Rejected',
                    n_message: msg.m_content,
                    n_type: 'provider_application_rejected',
                    n_is_read: msg.m_is_read,
                    n_created_at: msg.m_created_at,
                    is_system_message: true,
                    message_id: msg.idmessage,
                });
            }
        }
    }

    // Combine both types and sort by date
    const allNotifications = [...notifications, ...systemNotifications].sort((a, b) => {
        const dateA = new Date(a.n_created_at).getTime();
        const dateB = new Date(b.n_created_at).getTime();
        return dateB - dateA;
    });

    return { notifications: allNotifications };
}

// ── GET /notifications/unread-count ────────────────────────────────
async function getUnreadNotificationCount(userEmail) {
    const pool = getPool();

    const userId = await requireUserIdByEmail(userEmail);

    // Ensure notification table exists
    await pool.query(ENSURE_NOTIFICATION_TABLE);

    // Get unread count from notification table
    const [countRows] = await pool.query(
        'SELECT COUNT(*) as count FROM `notification` WHERE n_user_id = ? AND n_is_read = 0',
        [userId]
    );
    let unreadCount = countRows[0].count || 0;

    // Also count unread system messages
    const [systemConvRows] = await pool.query(SYSTEM_CONV_QUERY, ['System Notifications%', userId]);

    if (systemConvRows.length > 0) {
        const conversationId = systemConvRows[0].idconversation;

        const [systemCountRows] = await pool.query(
            `SELECT COUNT(*) as count
             FROM message m
             WHERE m.m_conversation_id = ?
             AND m.m_message_type = 'system'
             AND m.m_is_read = 0
             AND m.m_content LIKE '%provider application has been rejected%'`,
            [conversationId]
        );

        unreadCount += (systemCountRows[0].count || 0);
    }

    return { count: unreadCount };
}

// ── POST /notifications/:id/read ───────────────────────────────────
async function markNotificationAsRead(notificationId, userEmail) {
    const pool = getPool();

    const userId = await requireUserIdByEmail(userEmail);

    if (notificationId.toString().startsWith('system_')) {
        const messageId = notificationId.toString().replace('system_', '');
        await pool.query(
            'UPDATE `message` SET m_is_read = 1 WHERE idmessage = ?',
            [messageId]
        );
    } else {
        await pool.query(
            'UPDATE `notification` SET n_is_read = 1 WHERE idnotification = ? AND n_user_id = ?',
            [notificationId, userId]
        );
    }

    return { message: 'Notification marked as read' };
}

// ── POST /notifications/mark-all-read ──────────────────────────────
async function markAllNotificationsAsRead(userEmail) {
    const pool = getPool();

    const userId = await requireUserIdByEmail(userEmail);

    // Mark all notifications as read
    await pool.query(
        'UPDATE `notification` SET n_is_read = 1 WHERE n_user_id = ? AND n_is_read = 0',
        [userId]
    );

    // Also mark all system messages as read
    const [systemConvRows] = await pool.query(SYSTEM_CONV_QUERY, ['System Notifications%', userId]);

    if (systemConvRows.length > 0) {
        const conversationId = systemConvRows[0].idconversation;

        await pool.query(
            `UPDATE message
             SET m_is_read = 1
             WHERE m_conversation_id = ?
             AND m_message_type = 'system'
             AND m_is_read = 0
             AND m_content LIKE '%provider application has been rejected%'`,
            [conversationId]
        );
    }

    return { message: 'All notifications marked as read' };
}

// ── POST /notifications/test-push ──────────────────────────────────
async function testPushNotification(userEmail, title, body) {
    const testTitle = title || 'Test Notification';
    const testBody = body || 'This is a test push notification from the server';

    console.log(`Testing push notification for: ${userEmail}`);

    const result = await sendPushNotification(
        userEmail,
        testTitle,
        testBody,
        {
            type: 'test',
            timestamp: new Date().toISOString(),
        }
    );

    if (result.success) {
        return {
            message: 'Test notification sent successfully',
            result: result.result,
        };
    }

    // Throw so the controller can translate to sendError
    const err = new Error(result.message || 'Failed to send notification');
    err.code = 'SERVER_ERROR';
    err.status = 500;
    err.details = result.error;
    throw err;
}

// ── GET /notifications/push-tokens/:email ──────────────────────────
async function getPushTokens(userEmail) {
    const pool = getPool();

    const [tokens] = await pool.query(
        'SELECT id, dt_user_email as user_email, dt_platform as platform, dt_created_at as created_at, dt_updated_at as updated_at, LEFT(dt_token, 50) as push_token_preview FROM `device_tokens` WHERE dt_user_email = ? ORDER BY dt_updated_at DESC',
        [userEmail]
    );

    return { count: tokens.length, tokens };
}

// ── DELETE /notifications/push-tokens/:email ───────────────────────
async function deletePushTokens(userEmail) {
    const pool = getPool();

    const [result] = await pool.query(
        'DELETE FROM `device_tokens` WHERE dt_user_email = ?',
        [userEmail]
    );

    console.log(`Deleted ${result.affectedRows} push token(s) for user: ${userEmail}`);

    return {
        message: `Deleted ${result.affectedRows} push token(s)`,
        deletedCount: result.affectedRows,
    };
}

module.exports = {
    registerPushToken,
    getVapidPublicKey,
    sendPushNotification,
    getUserNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    testPushNotification,
    getPushTokens,
    deletePushTokens,
};
