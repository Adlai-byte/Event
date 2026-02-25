const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

function emitNotification(req, userEmail) {
  const io = req.app.get('io');
  if (io && userEmail) {
    io.to(`user:${userEmail}`).emit('new-notification');
    io.to(`user:${userEmail}`).emit('unread-update');
  }
}

// ============================================
// MESSAGING API ENDPOINTS
// ============================================

// Get unread messages count for a user
router.get('/user/messages/count', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.json({ ok: true, count: 0 });
        }
        const userId = userRows[0].iduser;
        const [countRows] = await pool.query(`
            SELECT COUNT(*) as count
            FROM message m
            INNER JOIN conversation_participant cp ON m.m_conversation_id = cp.cp_conversation_id
            WHERE cp.cp_user_id = ? AND m.m_sender_id != ? AND m.m_is_read = 0
        `, [userId, userId]);
        return res.json({ ok: true, count: countRows[0].count || 0 });
    } catch (err) {
        console.error('Get messages count failed:', err.code, err.message);
        return res.json({ ok: true, count: 0 }); // Return 0 on error to not break UI
    }
});

// Get or create conversation for a booking
router.post('/bookings/:id/conversation', async (req, res) => {
    const bookingId = Number(req.params.id);
    const { userEmail } = req.body || {};

    if (!Number.isFinite(bookingId) || !userEmail) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Get booking and verify it belongs to user
        const [bookingRows] = await pool.query(
            'SELECT b_client_id, b_status FROM booking WHERE idbooking = ?',
            [bookingId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        const booking = bookingRows[0];

        if (booking.b_client_id !== userId) {
            return res.status(403).json({ ok: false, error: 'You do not have permission to access this booking' });
        }

        // Check if booking is confirmed
        if (booking.b_status !== 'confirmed') {
            return res.status(400).json({ ok: false, error: 'Booking must be confirmed to start messaging' });
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
            return res.status(404).json({ ok: false, error: 'No services found for this booking' });
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

        return res.json({ ok: true, conversation: convDetails[0] });
    } catch (err) {
        console.error('Get or create booking conversation failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get provider ID from booking
router.get('/bookings/:id/provider', async (req, res) => {
    const bookingId = Number(req.params.id);

    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
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
            return res.status(404).json({ ok: false, error: 'Provider not found for this booking' });
        }

        return res.json({ ok: true, provider: rows[0] });
    } catch (err) {
        console.error('Get booking provider failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user conversations
router.get('/user/conversations', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.json({ ok: true, conversations: [] });
        }
        const userId = userRows[0].iduser;

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

        // Get other participant info for each conversation
        for (const conv of conversations) {
            // For system conversations, set a special other_participant
            if (conv.c_subject === 'System Notifications' && !conv.c_service_id && !conv.c_booking_id && !conv.c_hiring_request_id) {
                conv.other_participant = {
                    cp_user_id: 0,
                    u_email: 'system@event.com',
                    name: 'System'
                };
            } else {
            const [participants] = await pool.query(`
                SELECT cp.cp_user_id, u.u_email, CONCAT(u.u_fname, ' ', u.u_lname) as name
                FROM conversation_participant cp
                INNER JOIN user u ON cp.cp_user_id = u.iduser
                WHERE cp.cp_conversation_id = ? AND cp.cp_user_id != ?
            `, [conv.idconversation, userId]);
            conv.other_participant = participants[0] || null;
            }
        }

        return res.json({ ok: true, conversations });
    } catch (err) {
        console.error('Get conversations failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get conversation messages
router.get('/conversations/:id/messages', async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
        return res.status(400).json({ ok: false, error: 'Invalid conversation ID' });
    }
    try {
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

        return res.json({ ok: true, messages });
    } catch (err) {
        console.error('Get messages failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Send message
router.post('/conversations/:id/messages', async (req, res) => {
    const conversationId = Number(req.params.id);
    const { userEmail, content } = req.body || {};

    if (!Number.isFinite(conversationId) || !userEmail || !content) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }

    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Verify user is participant in conversation
        const [participantRows] = await pool.query(
            'SELECT cp_user_id FROM conversation_participant WHERE cp_conversation_id = ? AND cp_user_id = ?',
            [conversationId, userId]
        );
        if (participantRows.length === 0) {
            return res.status(403).json({ ok: false, error: 'You are not a participant in this conversation' });
        }

        // Get other participant
        const [otherParticipantRows] = await pool.query(
            'SELECT cp_user_id FROM conversation_participant WHERE cp_conversation_id = ? AND cp_user_id != ?',
            [conversationId, userId]
        );
        if (otherParticipantRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No other participant found' });
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

        // Send push notification and create notification entry for other participant
        const [otherUserRows] = await pool.query(
            'SELECT iduser, u_email FROM `user` WHERE iduser = ?',
            [otherParticipantRows[0].cp_user_id]
        );
        if (otherUserRows.length > 0) {
            const otherUserId = otherUserRows[0].iduser;
            const otherUserEmail = otherUserRows[0].u_email;
            const senderName = messageRows[0].sender_name || 'Someone';
            const messagePreview = content.trim().length > 50
                ? content.trim().substring(0, 50) + '...'
                : content.trim();

            // Create notification entry for the message
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

                // Create notification entry
                await pool.query(
                    'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                    [
                        otherUserId,
                        notificationTitle,
                        notificationMessage,
                        'new_message',
                        0
                    ]
                );

                console.log(`✅ Notification created for user ID ${otherUserId}`);
            } catch (notifErr) {
                console.error('⚠️ Failed to create notification for message (non-critical):', notifErr);
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

        // Emit socket events for real-time updates
        const io = req.app.get('io');
        if (io) {
          io.to(`conversation:${conversationId}`).emit('new-message', {
            conversationId: conversationId.toString(),
            message: messageRows[0],
          });

          if (otherUserRows.length > 0) {
            emitNotification(req, otherUserRows[0].u_email);
          }
        }

        return res.json({ ok: true, message: messageRows[0] });
    } catch (err) {
        console.error('Send message failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Mark messages as read
router.post('/conversations/:id/read', async (req, res) => {
    const conversationId = Number(req.params.id);
    const { userEmail } = req.body || {};

    if (!Number.isFinite(conversationId) || !userEmail) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }

    try {
        const pool = getPool();
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

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

        // Emit socket event for unread count update
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${userEmail}`).emit('unread-update');
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('Mark messages as read failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

module.exports = router;
