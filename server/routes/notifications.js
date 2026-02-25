const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

// ============================================
// PUSH NOTIFICATIONS API ENDPOINTS
// ============================================

// Register push notification token
router.post('/notifications/register-token', authMiddleware, async (req, res) => {
    const { userId, userEmail, pushToken, platform, subscriptionData } = req.body || {};

    console.log('Push token registration request received:');
    console.log('   User ID:', userId);
    console.log('   User Email:', userEmail);
    console.log('   Platform:', platform || 'unknown');
    console.log('   Token preview:', pushToken ? pushToken.substring(0, 30) + '...' : 'MISSING');
    console.log('   Has subscription data:', !!subscriptionData);

    if (!userId || !userEmail || !pushToken) {
        console.log('Missing required fields');
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    try {
        const pool = getPool();

        // Create device_tokens table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`device_tokens\` (
                \`id\` INT(11) NOT NULL AUTO_INCREMENT,
                \`user_id\` VARCHAR(255) NOT NULL,
                \`user_email\` VARCHAR(255) NOT NULL,
                \`push_token\` TEXT NOT NULL,
                \`platform\` VARCHAR(50) NOT NULL,
                \`subscription_data\` TEXT NULL,
                \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`unique_user_token\` (\`user_id\`, \`push_token\`(255)),
                INDEX \`idx_user_email\` (\`user_email\`),
                INDEX \`idx_user_id\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Check if subscription_data column exists, if not add it
        try {
            await pool.query('ALTER TABLE \`device_tokens\` ADD COLUMN \`subscription_data\` TEXT NULL');
            console.log('Added subscription_data column to device_tokens table');
        } catch (alterErr) {
            if (!alterErr.message.includes('Duplicate column name')) {
                console.log('Could not add subscription_data column (may already exist):', alterErr.message);
            }
        }

        // Insert or update token
        const [result] = await pool.query(`
            INSERT INTO \`device_tokens\` (user_id, user_email, push_token, platform, subscription_data)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                push_token = VALUES(push_token),
                platform = VALUES(platform),
                subscription_data = VALUES(subscription_data),
                updated_at = CURRENT_TIMESTAMP
        `, [userId, userEmail, pushToken, platform || 'unknown', subscriptionData || null]);

        console.log('Push token registered for user:', userEmail);
        console.log('   Platform:', platform || 'unknown');
        console.log('   Token ID:', result.insertId || 'updated');
        return res.json({ ok: true, message: 'Token registered successfully' });
    } catch (err) {
        console.error('Error registering push token:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get VAPID public key for web push (placeholder - you need to generate VAPID keys)
router.get('/notifications/vapid-public-key', async (req, res) => {
    try {
        // TODO: Generate VAPID keys using web-push library
        // For now, return null to use browser notifications as fallback
        // To enable full web push, install: npm install web-push
        // Then generate keys: const vapidKeys = webpush.generateVAPIDKeys();
        // Store private key securely, return public key here

        return res.json({
            ok: true,
            publicKey: null, // Set to your VAPID public key when ready
            message: 'VAPID keys not configured. Using browser notifications as fallback.'
        });
    } catch (err) {
        console.error('Error getting VAPID key:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Send push notification (internal function)
async function sendPushNotification(userEmail, title, body, data = {}) {
    try {
        const pool = getPool();

        // Get all push tokens for the user
        const [tokens] = await pool.query(
            'SELECT push_token, platform, created_at, updated_at FROM `device_tokens` WHERE user_email = ?',
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

            // For Android, ensure proper notification display
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

        // Send to Web Push (if web-push library is installed)
        // TODO: Implement web push sending using web-push library
        // For now, web push will use in-app notifications (toast/banner) as fallback
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

            // Log each token result
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
            // Only web tokens - notifications will be shown via in-app toast/banner
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

// ============================================
// NOTIFICATIONS API ENDPOINTS
// ============================================

// Get user notifications (includes both notification table entries and system messages from conversations)
router.get('/notifications', authMiddleware, async (req, res) => {
    const userEmail = req.query.email;
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Ensure notification table exists
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

        // Get notifications from notification table
        const [notifications] = await pool.query(
            'SELECT * FROM `notification` WHERE n_user_id = ? ORDER BY n_created_at DESC LIMIT 50',
            [userId]
        );

        // Also fetch system messages from "System Notifications" conversation
        const [systemConvRows] = await pool.query(
            `SELECT c.idconversation
             FROM conversation c
             INNER JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
             WHERE c.c_subject LIKE ?
             AND c.c_service_id IS NULL
             AND c.c_booking_id IS NULL
             AND c.c_hiring_request_id IS NULL
             AND cp.cp_user_id = ?
             LIMIT 1`,
            ['System Notifications%', userId]
        );

        const systemNotifications = [];
        if (systemConvRows.length > 0) {
            const conversationId = systemConvRows[0].idconversation;

            // Get system messages from this conversation
            const [systemMessages] = await pool.query(
                `SELECT m.idmessage, m.m_content, m.m_created_at, m.m_is_read
                 FROM message m
                 WHERE m.m_conversation_id = ?
                 AND m.m_message_type = 'system'
                 ORDER BY m.m_created_at DESC
                 LIMIT 50`,
                [conversationId]
            );

            // Convert system messages to notification format
            for (const msg of systemMessages) {
                // Check if message is about provider application rejection
                if (msg.m_content.includes('provider application has been rejected')) {
                    const reasonMatch = msg.m_content.match(/Reason: (.+?)(\n|$)/);
                    const reason = reasonMatch ? reasonMatch[1].trim() : '';

                    systemNotifications.push({
                        idnotification: `system_${msg.idmessage}`, // Use negative ID to distinguish from regular notifications
                        n_user_id: userId,
                        n_title: 'Provider Application Rejected',
                        n_message: msg.m_content,
                        n_type: 'provider_application_rejected',
                        n_is_read: msg.m_is_read,
                        n_created_at: msg.m_created_at,
                        is_system_message: true, // Flag to identify system messages
                        message_id: msg.idmessage
                    });
                }
            }
        }

        // Combine both types of notifications and sort by date
        const allNotifications = [...notifications, ...systemNotifications].sort((a, b) => {
            const dateA = new Date(a.n_created_at).getTime();
            const dateB = new Date(b.n_created_at).getTime();
            return dateB - dateA; // Most recent first
        });

        return res.json({ ok: true, notifications: allNotifications });
    } catch (err) {
        console.error('Get notifications failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get unread notification count (includes both notification table and system messages)
router.get('/notifications/unread-count', authMiddleware, async (req, res) => {
    const userEmail = req.query.email;
    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Ensure notification table exists
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

        // Get unread count from notification table
        const [countRows] = await pool.query(
            'SELECT COUNT(*) as count FROM `notification` WHERE n_user_id = ? AND n_is_read = 0',
            [userId]
        );
        let unreadCount = countRows[0].count || 0;

        // Also count unread system messages from "System Notifications" conversation
        const [systemConvRows] = await pool.query(
            `SELECT c.idconversation
             FROM conversation c
             INNER JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
             WHERE c.c_subject LIKE ?
             AND c.c_service_id IS NULL
             AND c.c_booking_id IS NULL
             AND c.c_hiring_request_id IS NULL
             AND cp.cp_user_id = ?
             LIMIT 1`,
            ['System Notifications%', userId]
        );

        if (systemConvRows.length > 0) {
            const conversationId = systemConvRows[0].idconversation;

            // Count unread system messages about provider application rejection
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

        return res.json({ ok: true, count: unreadCount });
    } catch (err) {
        console.error('Get unread notification count failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Mark notification as read
router.post('/notifications/:id/read', authMiddleware, async (req, res) => {
    const notificationId = req.params.id;
    const userEmail = req.query.email;

    if (!notificationId) {
        return res.status(400).json({ ok: false, error: 'Invalid notification ID' });
    }

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Check if it's a system message (starts with "system_")
        if (notificationId.toString().startsWith('system_')) {
            const messageId = notificationId.toString().replace('system_', '');
            // Mark system message as read
            await pool.query(
                'UPDATE `message` SET m_is_read = 1 WHERE idmessage = ?',
                [messageId]
            );
        } else {
            // Mark regular notification as read (only if it belongs to the user)
            await pool.query(
                'UPDATE `notification` SET n_is_read = 1 WHERE idnotification = ? AND n_user_id = ?',
                [notificationId, userId]
            );
        }

        return res.json({ ok: true, message: 'Notification marked as read' });
    } catch (err) {
        console.error('Mark notification as read failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Mark all notifications as read (includes both notification table and system messages)
router.post('/notifications/mark-all-read', authMiddleware, async (req, res) => {
    const userEmail = req.query.email;

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Mark all notifications as read
        await pool.query(
            'UPDATE `notification` SET n_is_read = 1 WHERE n_user_id = ? AND n_is_read = 0',
            [userId]
        );

        // Also mark all system messages as read
        const [systemConvRows] = await pool.query(
            `SELECT c.idconversation
             FROM conversation c
             INNER JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
             WHERE c.c_subject LIKE ?
             AND c.c_service_id IS NULL
             AND c.c_booking_id IS NULL
             AND c.c_hiring_request_id IS NULL
             AND cp.cp_user_id = ?
             LIMIT 1`,
            ['System Notifications%', userId]
        );

        if (systemConvRows.length > 0) {
            const conversationId = systemConvRows[0].idconversation;

            // Mark all unread system messages as read
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

        return res.json({ ok: true, message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all notifications as read failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Test endpoint to send push notification manually
router.post('/notifications/test-push', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { userEmail, title, body } = req.body;

        if (!userEmail) {
            return res.status(400).json({ ok: false, error: 'userEmail is required' });
        }

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
            return res.json({
                ok: true,
                message: 'Test notification sent successfully',
                result: result.result
            });
        } else {
            return res.status(500).json({
                ok: false,
                error: result.message || 'Failed to send notification',
                details: result.error
            });
        }
    } catch (err) {
        console.error('Test push notification failed:', err);
        return res.status(500).json({ ok: false, error: 'Server error: ' + err.message });
    }
});

// Get push tokens for a user (for debugging)
router.get('/notifications/push-tokens/:email', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.params.email;
        const pool = getPool();

        const [tokens] = await pool.query(
            'SELECT id, user_id, user_email, platform, created_at, updated_at, LEFT(push_token, 50) as push_token_preview FROM `device_tokens` WHERE user_email = ? ORDER BY updated_at DESC',
            [userEmail]
        );

        return res.json({
            ok: true,
            count: tokens.length,
            tokens: tokens
        });
    } catch (err) {
        console.error('Get push tokens failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Delete push tokens for a user (for testing - to clear old tokens)
router.delete('/notifications/push-tokens/:email', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.params.email;
        const pool = getPool();

        const [result] = await pool.query(
            'DELETE FROM `device_tokens` WHERE user_email = ?',
            [userEmail]
        );

        console.log(`Deleted ${result.affectedRows} push token(s) for user: ${userEmail}`);

        return res.json({
            ok: true,
            message: `Deleted ${result.affectedRows} push token(s)`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error('Delete push tokens failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

module.exports = router;
