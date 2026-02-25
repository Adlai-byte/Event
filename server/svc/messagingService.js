// server/svc/messagingService.js
// Pure business logic + DB queries for messaging (no req/res knowledge)

const { getPool } = require('../db');

// ── Helper: look up user ID by email ───────────────────────────────
async function getUserIdByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.query(
        'SELECT iduser FROM `user` WHERE u_email = ?',
        [email]
    );
    return rows.length > 0 ? rows[0].iduser : null;
}

// ── GET /user/messages/count ───────────────────────────────────────
async function getUnreadMessageCount(email) {
    const pool = getPool();

    const userId = await getUserIdByEmail(email);
    if (!userId) return { count: 0 };

    const [countRows] = await pool.query(`
        SELECT COUNT(*) as count
        FROM message m
        INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
        WHERE cp.cp_user_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0
    `, [userId, userId]);

    return { count: countRows[0].count || 0 };
}

// ── POST /bookings/:id/conversation ────────────────────────────────
async function getOrCreateBookingConversation(bookingId, userEmail) {
    const pool = getPool();

    // Get user ID
    const userId = await getUserIdByEmail(userEmail);
    if (!userId) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }

    // Get booking and verify it belongs to user
    const [bookingRows] = await pool.query(
        'SELECT b_client_id, b_status FROM booking WHERE idbooking = ?',
        [bookingId]
    );
    if (bookingRows.length === 0) {
        const err = new Error('Booking not found');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }
    const booking = bookingRows[0];

    if (booking.b_client_id !== userId) {
        const err = new Error('You do not have permission to access this booking');
        err.code = 'FORBIDDEN'; err.status = 403;
        throw err;
    }

    if (booking.b_status !== 'confirmed') {
        const err = new Error('Booking must be confirmed to start messaging');
        err.code = 'VALIDATION_ERROR'; err.status = 400;
        throw err;
    }

    // Get provider ID from booking services
    const [serviceRows] = await pool.query(`
        SELECT DISTINCT s.s_provider_id
        FROM booking_service bs
        INNER JOIN service s ON bs.bs_service_id = s.idservice
        WHERE bs.bs_booking_id = ?
        LIMIT 1
    `, [bookingId]);

    if (serviceRows.length === 0) {
        const err = new Error('No services found for this booking');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }
    const providerId = serviceRows[0].s_provider_id;

    // Check if conversation already exists for this booking
    const [existingConv] = await pool.query(
        'SELECT idconversation FROM conversation WHERE c_booking_id = ?',
        [bookingId]
    );

    let conversationId;
    if (existingConv.length > 0) {
        conversationId = existingConv[0].idconversation;
    } else {
        // Create new conversation
        const [convResult] = await pool.query(`
            INSERT INTO conversation (c_booking_id, c_subject, c_priority, c_is_active)
            VALUES (?, ?, 'medium', 1)
        `, [bookingId, `Booking #${bookingId}`]);
        conversationId = convResult.insertId;

        // Add participants (user and provider)
        await pool.query(`
            INSERT INTO conversation_participant (cp_conversation_id, cp_user_id, cp_unread_count)
            VALUES (?, ?, 0), (?, ?, 0)
        `, [conversationId, userId, conversationId, providerId]);
    }

    // Get conversation details
    const [convDetails] = await pool.query(`
        SELECT c.*,
               GROUP_CONCAT(cp.cp_user_id) as participant_ids
        FROM conversation c
        LEFT JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
        WHERE c.idconversation = ?
        GROUP BY c.idconversation
    `, [conversationId]);

    return { conversation: convDetails[0] };
}

// ── GET /bookings/:id/provider ─────────────────────────────────────
async function getBookingProvider(bookingId) {
    const pool = getPool();

    const [rows] = await pool.query(`
        SELECT DISTINCT s.s_provider_id, u.u_email as provider_email,
               CONCAT(u.u_fname, ' ', u.u_lname) as provider_name
        FROM booking_service bs
        INNER JOIN service s ON bs.bs_service_id = s.idservice
        INNER JOIN user u ON s.s_provider_id = u.iduser
        WHERE bs.bs_booking_id = ?
        LIMIT 1
    `, [bookingId]);

    if (rows.length === 0) {
        const err = new Error('Provider not found for this booking');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }

    return { provider: rows[0] };
}

// ── GET /user/conversations ────────────────────────────────────────
async function getUserConversations(email) {
    const pool = getPool();

    const userId = await getUserIdByEmail(email);
    if (!userId) return { conversations: [] };

    const [conversations] = await pool.query(`
        SELECT c.*,
               (SELECT m.m_content FROM message m
                WHERE m.m_conversation_id = c.idconversation
                ORDER BY m.m_created_at DESC LIMIT 1) as last_message,
               (SELECT m.m_created_at FROM message m
                WHERE m.m_conversation_id = c.idconversation
                ORDER BY m.m_created_at DESC LIMIT 1) as last_message_time,
               (SELECT COUNT(*) FROM message m
                INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
                WHERE cp.cp_user_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0
                AND m.m_conversation_id = c.idconversation) as unread_count,
               cp.cp_unread_count as participant_unread_count
        FROM conversation c
        INNER JOIN conversation_participant cp ON c.idconversation = cp.cp_conversation_id
        WHERE cp.cp_user_id = ?
        GROUP BY c.idconversation
        ORDER BY c.c_updated_at DESC
    `, [userId, userId, userId]);

    // Batch-fetch other participants for all conversations in one query
    const nonSystemConvIds = conversations
        .filter(c => !(c.c_subject === 'System Notifications' && !c.c_service_id && !c.c_booking_id && !c.c_hiring_request_id))
        .map(c => c.idconversation);

    let participantsByConv = {};
    if (nonSystemConvIds.length > 0) {
        const [allParticipants] = await pool.query(`
            SELECT cp.cp_conversation_id, cp.cp_user_id, u.u_email, CONCAT(u.u_fname, ' ', u.u_lname) as name
            FROM conversation_participant cp
            INNER JOIN user u ON cp.cp_user_id = u.iduser
            WHERE cp.cp_conversation_id IN (?) AND cp.cp_user_id != ?
        `, [nonSystemConvIds, userId]);
        for (const p of allParticipants) {
            if (!participantsByConv[p.cp_conversation_id]) participantsByConv[p.cp_conversation_id] = p;
        }
    }

    for (const conv of conversations) {
        if (conv.c_subject === 'System Notifications' && !conv.c_service_id && !conv.c_booking_id && !conv.c_hiring_request_id) {
            conv.other_participant = { cp_user_id: 0, u_email: 'system@event.com', name: 'System' };
        } else {
            conv.other_participant = participantsByConv[conv.idconversation] || null;
        }
    }

    return { conversations };
}

// ── GET /conversations/:id/messages ────────────────────────────────
async function getConversationMessages(conversationId) {
    const pool = getPool();

    const [messages] = await pool.query(`
        SELECT m.*,
               CONCAT(u.u_fname, ' ', u.u_lname) as sender_name,
               u.u_email as sender_email
        FROM message m
        INNER JOIN user u ON m.m_sender_id = u.iduser
        WHERE m.m_conversation_id = ?
        ORDER BY m.m_created_at ASC
    `, [conversationId]);

    return { messages };
}

// ── POST /conversations/:id/messages ───────────────────────────────
// Returns { message, otherUserEmail, conversationId } so the controller
// can handle socket.io / push-notification side effects.
async function sendMessage(conversationId, userEmail, content) {
    const pool = getPool();

    const userId = await getUserIdByEmail(userEmail);
    if (!userId) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }

    // Verify user is participant in conversation
    const [participantRows] = await pool.query(
        'SELECT cp_user_id FROM conversation_participant WHERE cp_conversation_id = ? AND cp_user_id = ?',
        [conversationId, userId]
    );
    if (participantRows.length === 0) {
        const err = new Error('You are not a participant in this conversation');
        err.code = 'FORBIDDEN'; err.status = 403;
        throw err;
    }

    // Get other participant
    const [otherParticipantRows] = await pool.query(
        'SELECT cp_user_id FROM conversation_participant WHERE cp_conversation_id = ? AND cp_user_id != ?',
        [conversationId, userId]
    );
    if (otherParticipantRows.length === 0) {
        const err = new Error('No other participant found');
        err.code = 'VALIDATION_ERROR'; err.status = 400;
        throw err;
    }

    // Insert message
    const [result] = await pool.query(`
        INSERT INTO message (m_conversation_id, m_sender_id, m_content, m_message_type, m_is_read)
        VALUES (?, ?, ?, 'text', 0)
    `, [conversationId, userId, content.trim()]);

    // Update conversation updated_at
    await pool.query(
        'UPDATE conversation SET c_updated_at = NOW() WHERE idconversation = ?',
        [conversationId]
    );

    // Increment unread count for other participant
    await pool.query(`
        UPDATE conversation_participant
        SET cp_unread_count = cp_unread_count + 1
        WHERE cp_conversation_id = ? AND cp_user_id = ?
    `, [conversationId, otherParticipantRows[0].cp_user_id]);

    // Get the created message
    const [messageRows] = await pool.query(`
        SELECT m.*,
               CONCAT(u.u_fname, ' ', u.u_lname) as sender_name,
               u.u_email as sender_email
        FROM message m
        INNER JOIN user u ON m.m_sender_id = u.iduser
        WHERE m.idmessage = ?
    `, [result.insertId]);

    // Get other user info for notifications
    const [otherUserRows] = await pool.query(
        'SELECT iduser, u_email FROM `user` WHERE iduser = ?',
        [otherParticipantRows[0].cp_user_id]
    );

    // Create notification entry for other participant
    let otherUserEmail = null;
    let otherUserId = null;
    if (otherUserRows.length > 0) {
        otherUserId = otherUserRows[0].iduser;
        otherUserEmail = otherUserRows[0].u_email;
        const senderName = messageRows[0].sender_name || 'Someone';
        const messagePreview = content.trim().length > 50
            ? content.trim().substring(0, 50) + '...'
            : content.trim();

        try {
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

            const notificationTitle = `New message from ${senderName}`;
            const notificationMessage = messagePreview;

            await pool.query(
                'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                [otherUserId, notificationTitle, notificationMessage, 'new_message', 0]
            );

            console.log(`Notification created for user ID ${otherUserId}`);
        } catch (notifErr) {
            console.error('Failed to create notification for message (non-critical):', notifErr);
        }

        // Send push notification
        if (global.sendPushNotification) {
            global.sendPushNotification(
                otherUserEmail,
                `New message from ${senderName}`,
                messagePreview,
                {
                    type: 'message',
                    conversationId: conversationId.toString(),
                    senderId: userId.toString(),
                }
            ).catch(err => console.error('Failed to send push notification:', err));
        }
    }

    return {
        message: messageRows[0],
        otherUserEmail,
        conversationId,
    };
}

// ── POST /conversations/:id/read ──────────────────────────────────
async function markMessagesAsRead(conversationId, userEmail) {
    const pool = getPool();

    const userId = await getUserIdByEmail(userEmail);
    if (!userId) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND'; err.status = 404;
        throw err;
    }

    // Mark all messages in conversation as read for this user
    await pool.query(`
        UPDATE message m
        INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
        SET m.m_is_read = 1
        WHERE m.m_conversation_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0
    `, [conversationId, userId]);

    // Reset unread count
    await pool.query(`
        UPDATE conversation_participant
        SET cp_unread_count = 0
        WHERE cp_conversation_id = ? AND cp_user_id = ?
    `, [conversationId, userId]);

    return { userEmail };
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
