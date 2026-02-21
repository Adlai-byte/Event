const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { createPaymentLink, createCheckoutSession } = require('../services/paymongo');
const { generateInvoicePDF } = require('../services/invoice');

// ============================================
// BOOKINGS API ENDPOINTS
// ============================================

// Helper: emit socket events to notify both parties of a booking change
function emitBookingUpdate(req, userEmail) {
  const io = req.app.get('io');
  if (io && userEmail) {
    io.to(`user:${userEmail}`).emit('booking-update');
    io.to(`user:${userEmail}`).emit('new-notification');
  }
}

// Get all bookings
router.get('/bookings', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT b.*,
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            ORDER BY b.b_created_at DESC
        `);

        // Get services for each booking
        for (const booking of rows) {
            const [services] = await pool.query(`
                SELECT s.s_name, bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price
                FROM booking_service bs
                LEFT JOIN service s ON bs.bs_service_id = s.idservice
                WHERE bs.bs_booking_id = ?
            `, [booking.idbooking]);
            booking.services = services.map(s => s.s_name);
        }

        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('List bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user's bookings
router.get('/user/bookings', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
    }
    try {
        const pool = getPool();
        // Get user ID from email
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.json({ ok: true, rows: [] });
        }
        const userId = userRows[0].iduser;

        // Get bookings for this user with payment status (including cancelled and completed)
        const [rows] = await pool.query(`
            SELECT b.*,
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email,
                   CASE WHEN EXISTS (
                       SELECT 1 FROM payment p
                       WHERE p.p_booking_id = b.idbooking
                       AND p.p_status = 'completed'
                   ) THEN 1 ELSE 0 END as is_paid
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE b.b_client_id = ?
            ORDER BY b.b_event_date DESC, b.b_created_at DESC
        `, [userId]);

        // Get services for each booking with images and full details
        for (const booking of rows) {
            const [services] = await pool.query(`
                SELECT s.idservice, s.s_name, s.s_description, s.s_base_price, s.s_category,
                       s.s_duration, s.s_max_capacity, s.s_city, s.s_state, s.s_address,
                       bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price,
                       (SELECT si.si_image_url
                        FROM service_image si
                        WHERE si.si_service_id = s.idservice
                        AND si.si_is_primary = 1
                        LIMIT 1) as primary_image
                FROM booking_service bs
                LEFT JOIN service s ON bs.bs_service_id = s.idservice
                WHERE bs.bs_booking_id = ?
            `, [booking.idbooking]);
            // Store both service names (for suppliers list) and full service details
            booking.services = services.map(s => s.s_name);
            booking.serviceDetails = services.map(s => ({
                serviceId: s.idservice,
                name: s.s_name,
                description: s.s_description,
                price: s.s_base_price,
                category: s.s_category,
                duration: s.s_duration,
                capacity: s.s_max_capacity,
                location: s.s_city ? `${s.s_city}${s.s_state ? ', ' + s.s_state : ''}` : (s.s_address || ''),
                quantity: s.bs_quantity,
                unitPrice: s.bs_unit_price,
                totalPrice: s.bs_total_price,
                image: s.primary_image
            }));
            // Get the first service's image as the booking image
            if (services.length > 0 && services[0].primary_image) {
                booking.primary_image = services[0].primary_image;
            }
        }

        return res.json({ ok: true, rows });
    } catch (err) {
        console.error('Get user bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user's bookings count
router.get('/user/bookings/count', async (req, res) => {
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
        const [countRows] = await pool.query(
            'SELECT COUNT(*) as count FROM booking WHERE b_client_id = ? AND b_status != ?',
            [userId, 'cancelled']
        );
        return res.json({ ok: true, count: countRows[0].count || 0 });
    } catch (err) {
        console.error('Get bookings count failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Get user payment methods
router.get('/user/payment-methods', async (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Get payment methods
        const [paymentMethods] = await pool.query(
            `SELECT
                idpayment_method as id,
                pm_type as type,
                pm_account_name as account_name,
                pm_account_number as account_number,
                pm_is_default as is_default,
                pm_created_at as created_at
             FROM payment_method
             WHERE pm_user_id = ?
             ORDER BY pm_is_default DESC, pm_created_at DESC`,
            [userId]
        );

        return res.json({ ok: true, paymentMethods });
    } catch (err) {
        console.error('Get payment methods failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Add payment method
router.post('/user/payment-methods', async (req, res) => {
    const { userEmail, type, account_name, account_number, is_default } = req.body || {};

    if (!userEmail || !type || !account_name || !account_number) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // If setting as default, unset other defaults
        if (is_default) {
            await pool.query(
                'UPDATE payment_method SET pm_is_default = 0 WHERE pm_user_id = ?',
                [userId]
            );
        }

        // Insert payment method
        await pool.query(
            `INSERT INTO payment_method
             (pm_user_id, pm_type, pm_account_name, pm_account_number, pm_is_default)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, type, account_name.trim(), account_number.trim(), is_default ? 1 : 0]
        );

        return res.json({ ok: true, message: 'Payment method added successfully' });
    } catch (err) {
        console.error('Add payment method failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Set default payment method
router.post('/user/payment-methods/:id/set-default', async (req, res) => {
    const id = Number(req.params.id);
    const { userEmail } = req.body || {};

    if (!Number.isFinite(id) || !userEmail) {
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

        // Verify payment method belongs to user
        const [pmRows] = await pool.query(
            'SELECT idpayment_method FROM payment_method WHERE idpayment_method = ? AND pm_user_id = ?',
            [id, userId]
        );
        if (pmRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Payment method not found' });
        }

        // Unset all defaults for this user
        await pool.query(
            'UPDATE payment_method SET pm_is_default = 0 WHERE pm_user_id = ?',
            [userId]
        );

        // Set this one as default
        await pool.query(
            'UPDATE payment_method SET pm_is_default = 1 WHERE idpayment_method = ?',
            [id]
        );

        return res.json({ ok: true, message: 'Default payment method updated' });
    } catch (err) {
        console.error('Set default payment method failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Delete payment method
router.delete('/user/payment-methods/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { userEmail } = req.body || {};

    if (!Number.isFinite(id) || !userEmail) {
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

        // Verify payment method belongs to user
        const [pmRows] = await pool.query(
            'SELECT idpayment_method FROM payment_method WHERE idpayment_method = ? AND pm_user_id = ?',
            [id, userId]
        );
        if (pmRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Payment method not found' });
        }

        // Delete payment method
        await pool.query(
            'DELETE FROM payment_method WHERE idpayment_method = ?',
            [id]
        );

        return res.json({ ok: true, message: 'Payment method deleted successfully' });
    } catch (err) {
        console.error('Delete payment method failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// PAYMENT PROCESSING API ENDPOINT
// ============================================

// Create PayMongo payment using API
router.post('/bookings/:bookingId/pay', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { userEmail } = req.body || {};

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    if (isNaN(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Verify booking exists and belongs to user
        const [bookingRows] = await pool.query(
            'SELECT idbooking, b_total_cost, b_status, b_event_name FROM booking WHERE idbooking = ? AND b_client_id = ?',
            [bookingId, userId]
        );

        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }

        const booking = bookingRows[0];

        // Check if booking is confirmed
        if (booking.b_status !== 'confirmed') {
            return res.status(400).json({
                ok: false,
                error: 'Booking must be confirmed before payment'
            });
        }

        // Check if already paid
        const [existingPayment] = await pool.query(
            'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
            [bookingId]
        );

        if (existingPayment.length > 0) {
            return res.status(400).json({
                ok: false,
                error: 'This booking has already been paid'
            });
        }

        const amount = parseFloat(booking.b_total_cost);
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

        // Create success and failed redirect URLs
        const successUrl = `${apiBaseUrl}/api/payments/paymongo/success?bookingId=${bookingId}&userEmail=${encodeURIComponent(userEmail)}`;
        const failedUrl = `${apiBaseUrl}/api/payments/paymongo/failed?bookingId=${bookingId}&userEmail=${encodeURIComponent(userEmail)}`;

        // Create pending payment record first
        const transactionId = `EVT-${bookingId}-${Date.now()}`;
        const connection = await pool.getConnection();
        let paymentId = null;

        try {
            await connection.beginTransaction();

            // Check if there's already a pending payment
            const [existingPendingPayment] = await connection.query(
                'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status IN ("pending", "processing")',
                [bookingId]
            );

            if (existingPendingPayment.length === 0) {
                const [paymentResult] = await connection.query(
                    `INSERT INTO payment
                     (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
                     VALUES (?, ?, ?, 'PHP', 'pending', 'PayMongo GCash', ?)`,
                    [bookingId, userId, amount, transactionId]
                );
                paymentId = paymentResult.insertId;
            } else {
                paymentId = existingPendingPayment[0].idpayment;
            }

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

        // Get provider's PayMongo credentials from the booking's services
        const [providerRows] = await pool.query(`
            SELECT DISTINCT u.u_paymongo_secret_key, u.u_paymongo_public_key, u.u_paymongo_mode, u.u_email, u.u_fname, u.u_lname
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user u ON s.s_provider_id = u.iduser
            WHERE bs.bs_booking_id = ?
        `, [bookingId]);

        console.log(`[Payment] Found ${providerRows.length} provider(s) for booking ${bookingId}`);

        let providerCredentials = null;
        if (providerRows.length > 0) {
            // If multiple providers, use the first one with credentials, or first one if none have credentials
            const providerWithCredentials = providerRows.find(p => p.u_paymongo_secret_key) || providerRows[0];

            if (providerWithCredentials.u_paymongo_secret_key) {
                providerCredentials = {
                    secretKey: providerWithCredentials.u_paymongo_secret_key,
                    publicKey: providerWithCredentials.u_paymongo_public_key,
                    mode: providerWithCredentials.u_paymongo_mode || (providerWithCredentials.u_paymongo_secret_key.startsWith('sk_test_') ? 'test' : 'live'),
                    providerEmail: providerWithCredentials.u_email,
                    providerName: `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim(),
                };
                console.log('Using provider PayMongo credentials:', {
                    providerName: providerCredentials.providerName,
                    providerEmail: providerCredentials.providerEmail,
                    mode: providerCredentials.mode,
                    secretKeyPrefix: providerCredentials.secretKey.substring(0, 10) + '...',
                });
            } else {
                // Provider found but no payment setup - return error
                const providerName = `${providerWithCredentials.u_fname || ''} ${providerWithCredentials.u_lname || ''}`.trim() || providerWithCredentials.u_email;
                console.log('Provider found but no PayMongo credentials configured:', {
                    providerEmail: providerWithCredentials.u_email,
                    providerName: providerName,
                });
                return res.status(400).json({
                    ok: false,
                    error: 'Provider not yet set up his payment'
                });
            }
        } else {
            console.log('No provider found for booking');
            return res.status(400).json({
                ok: false,
                error: 'Provider not yet set up his payment'
            });
        }

        // Try to create PayMongo Checkout Session first (recommended by PayMongo docs)
        // If that fails, try Payment Link, then fall back to provider's configured payment link
        let paymentData;
        let paymentMethod = 'PayMongo Checkout Session';

        try {
            // Try Checkout Session first (recommended API method)
            paymentData = await createCheckoutSession({
                amount: amount,
                description: `Payment for booking: ${booking.b_event_name || 'Event Booking'}`,
                successUrl: successUrl,
                failedUrl: failedUrl,
                metadata: {
                    booking_id: bookingId.toString(),
                    user_id: userId.toString(),
                    payment_id: paymentId?.toString(),
                    transaction_id: transactionId,
                },
                secretKey: providerCredentials?.secretKey,
                mode: providerCredentials?.mode,
            });

            // Update payment record with PayMongo session ID
            if (paymentId && paymentData.sessionId) {
                await pool.query(
                    'UPDATE payment SET p_transaction_id = ?, p_payment_method = ? WHERE idpayment = ?',
                    [`${transactionId}|${paymentData.sessionId}`, paymentMethod, paymentId]
                );
            }

            console.log('PayMongo Checkout Session created:', {
                bookingId,
                amount,
                checkoutUrl: paymentData.checkoutUrl,
                sessionId: paymentData.sessionId,
            });
        } catch (checkoutError) {
            console.error('Checkout Session creation failed, trying Payment Link:', checkoutError.message);

            try {
                // Fallback to Payment Link API
                paymentData = await createPaymentLink({
                    amount: amount,
                    description: `Payment for booking: ${booking.b_event_name || 'Event Booking'}`,
                    successUrl: successUrl,
                    failedUrl: failedUrl,
                    metadata: {
                        booking_id: bookingId.toString(),
                        user_id: userId.toString(),
                        payment_id: paymentId?.toString(),
                        transaction_id: transactionId,
                    },
                    secretKey: providerCredentials?.secretKey,
                    mode: providerCredentials?.mode,
                });

                paymentMethod = 'PayMongo Payment Link';

                // Update payment record with PayMongo link ID
                if (paymentId && paymentData.linkId) {
                    await pool.query(
                        'UPDATE payment SET p_transaction_id = ?, p_payment_method = ? WHERE idpayment = ?',
                        [`${transactionId}|${paymentData.linkId}`, paymentMethod, paymentId]
                    );
                }

                console.log('PayMongo Payment Link created:', {
                    bookingId,
                    amount,
                    checkoutUrl: paymentData.checkoutUrl,
                    linkId: paymentData.linkId,
                });
            } catch (linkError) {
                console.error('Payment Link API creation failed, trying provider payment link:', linkError.message);

                // Final fallback to provider's configured payment link
                // Use the providerRows we already fetched, or fetch again if needed
                let providerLinkRows = providerRows;
                if (!providerLinkRows || providerLinkRows.length === 0) {
                    [providerLinkRows] = await pool.query(`
                    SELECT DISTINCT u.u_paymongo_payment_link
                    FROM booking_service bs
                    INNER JOIN service s ON bs.bs_service_id = s.idservice
                    INNER JOIN user u ON s.s_provider_id = u.iduser
                    WHERE bs.bs_booking_id = ?
                    LIMIT 1
                `, [bookingId]);
                }

                if (providerLinkRows.length > 0 && providerLinkRows[0].u_paymongo_payment_link) {
                    const providerLink = providerLinkRows[0].u_paymongo_payment_link;
                    paymentMethod = 'PayMongo Provider Link';

                    // Append amount as query parameter if possible
                    let finalLink = providerLink;
                    try {
                        const url = new URL(providerLink);
                        url.searchParams.set('amount', amount.toString());
                        finalLink = url.toString();
                    } catch (e) {
                        // If URL parsing fails, use original link
                        const separator = providerLink.includes('?') ? '&' : '?';
                        finalLink = `${providerLink}${separator}amount=${amount}`;
                    }

                    paymentData = {
                        linkId: null,
                        sessionId: null,
                        checkoutUrl: finalLink,
                        status: 'pending',
                        amount: amountInCents,
                        currency: 'PHP',
                    };

                    console.log('Using provider payment link as final fallback:', {
                        bookingId,
                        amount,
                        checkoutUrl: finalLink,
                    });
                } else {
                    throw new Error(`Payment creation failed. Checkout Session: ${checkoutError.message}, Payment Link: ${linkError.message}. Provider payment link also not configured.`);
                }
            }
        }

        return res.json({
            ok: true,
            paymentUrl: paymentData.checkoutUrl,
            sessionId: paymentData.sessionId || null,
            linkId: paymentData.linkId || null,
            sourceId: paymentData.sourceId || null,
            paymentIntentId: paymentData.paymentIntentId || null,
            amount: amount,
            paymentId: paymentId,
        });
    } catch (err) {
        console.error('Create PayMongo payment failed:', err);
        return res.status(500).json({
            ok: false,
            error: err.message || 'Failed to create payment. Please try again.'
        });
    }
});

// Process cash payment
router.post('/bookings/:bookingId/pay-cash', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { userEmail } = req.body || {};

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Get booking details
        const [bookingRows] = await pool.query(
            'SELECT b_client_id, b_total_cost, b_status FROM booking WHERE idbooking = ?',
            [bookingId]
        );

        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }

        const booking = bookingRows[0];

        // Verify booking belongs to user
        if (booking.b_client_id !== userId) {
            return res.status(403).json({ ok: false, error: 'You can only pay for your own bookings' });
        }

        // Check if booking is already paid
        const [existingPayment] = await pool.query(
            'SELECT idpayment, p_status FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
            [bookingId]
        );

        if (existingPayment.length > 0) {
            return res.status(400).json({ ok: false, error: 'This booking has already been paid' });
        }

        const amount = parseFloat(booking.b_total_cost) || 0;

        // Create cash payment record
        const connection = await pool.getConnection();
        let paymentId = null;

        try {
            await connection.beginTransaction();

            // Check if there's already a pending cash payment
            const [existingPendingPayment] = await connection.query(
                'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status IN ("pending", "processing") AND p_payment_method = "Cash on Hand"',
                [bookingId]
            );

            if (existingPendingPayment.length === 0) {
                // Create new cash payment record
                const [paymentResult] = await connection.query(
                    `INSERT INTO payment
                     (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
                     VALUES (?, ?, ?, 'PHP', 'pending', 'Cash on Hand', ?)`,
                    [bookingId, userId, amount, `CASH-${Date.now()}-${bookingId}`]
                );
                paymentId = paymentResult.insertId;
            } else {
                paymentId = existingPendingPayment[0].idpayment;
            }

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

        console.log(`Cash payment recorded for booking ${bookingId} (Payment ID: ${paymentId})`);

        return res.json({
            ok: true,
            message: 'Cash payment recorded successfully',
            paymentId: paymentId
        });
    } catch (err) {
        console.error('Process cash payment failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// PayMongo payment success redirect handler
router.get('/payments/paymongo/success', async (req, res) => {
    const { bookingId, userEmail } = req.query || {};

    if (!bookingId || !userEmail) {
        return res.status(400).send(`
            <html>
                <body>
                    <h1>Payment Error</h1>
                    <p>Missing required parameters.</p>
                </body>
            </html>
        `);
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).send(`
                <html>
                    <body>
                        <h1>Payment Error</h1>
                        <p>User not found.</p>
                    </body>
                </html>
            `);
        }
        const userId = userRows[0].iduser;

        // Update payment status to completed
        const [updateResult] = await pool.query(
            `UPDATE payment
             SET p_status = 'completed',
                 p_paid_at = NOW()
             WHERE p_booking_id = ?
             AND p_user_id = ?
             AND p_status IN ('pending', 'processing')`,
            [parseInt(bookingId), userId]
        );

        if (updateResult.affectedRows > 0) {
            console.log('Payment marked as completed for booking:', bookingId);
        }

        // Redirect to user homepage (configurable via environment variable)
        const homepageUrl = process.env.FRONTEND_URL || 'http://localhost:8081';

        // Set headers to allow popup communication
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

        return res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Payment Success</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="refresh" content="2;url=${homepageUrl}">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: #f5f5f5;
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            text-align: center;
                            max-width: 400px;
                        }
                        .success-icon {
                            font-size: 64px;
                            color: #10b981;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #10b981;
                            margin-bottom: 10px;
                        }
                        p {
                            color: #666;
                            margin-bottom: 30px;
                        }
                        .loading {
                            color: #10b981;
                            font-size: 14px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">\u2714</div>
                        <h1>Payment Successful!</h1>
                        <p>Your payment has been processed successfully.</p>
                        <p class="loading">Redirecting to homepage...</p>
                    </div>
                    <script>
                        // Redirect immediately
                        setTimeout(() => {
                            window.location.href = '${homepageUrl}';
                        }, 1000);

                        // Also try to notify parent window if opened in popup
                        if (window.opener) {
                            window.opener.postMessage('payment-success', '*');
                            setTimeout(() => {
                                window.close();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('Payment success handler error:', err);
        return res.status(500).send(`
            <html>
                <body>
                    <h1>Payment Processing Error</h1>
                    <p>An error occurred while processing your payment. Please contact support.</p>
                </body>
            </html>
        `);
    }
});

// PayMongo payment failed redirect handler
router.get('/payments/paymongo/failed', async (req, res) => {
    const { bookingId, userEmail } = req.query || {};

    try {
        if (bookingId && userEmail) {
            const pool = getPool();

            // Get user ID
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
            if (userRows.length > 0) {
                const userId = userRows[0].iduser;

                // Update payment status to failed
                await pool.query(
                    `UPDATE payment
                     SET p_status = 'failed'
                     WHERE p_booking_id = ?
                     AND p_user_id = ?
                     AND p_status IN ('pending', 'processing')`,
                    [parseInt(bookingId), userId]
                );

                console.log('Payment marked as failed for booking:', bookingId);
            }
        }
    } catch (err) {
        console.error('Payment failed handler error:', err);
    }

    // Redirect to user homepage (configurable via environment variable)
    const homepageUrl = process.env.FRONTEND_URL || 'http://localhost:8081';

    // Set headers to allow popup communication
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    // Return failed page with redirect
    return res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Payment Failed</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="refresh" content="3;url=${homepageUrl}">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                        max-width: 400px;
                    }
                    .error-icon {
                        font-size: 64px;
                        color: #ef4444;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #ef4444;
                        margin-bottom: 10px;
                    }
                    p {
                        color: #666;
                        margin-bottom: 30px;
                    }
                    .loading {
                        color: #ef4444;
                        font-size: 14px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">\u2718</div>
                    <h1>Payment Failed</h1>
                    <p>Your payment could not be processed.</p>
                    <p>Please try again or contact support if the problem persists.</p>
                    <p class="loading">Redirecting to homepage...</p>
                </div>
                <script>
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '${homepageUrl}';
                    }, 2000);

                    // Also try to notify parent window if opened in popup
                    try {
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage({ type: 'payment-failed', bookingId: '${bookingId}' }, '*');
                            setTimeout(() => {
                                if (!window.opener.closed) {
                                    window.close();
                                }
                            }, 500);
                        }
                    } catch (e) {
                        // Ignore COOP errors - just redirect
                        console.log('Popup communication blocked, redirecting normally');
                    }
                </script>
            </body>
        </html>
    `);
});

// Mark payment as completed (can be called manually or via webhook)
router.post('/bookings/:bookingId/payment/complete', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { userEmail } = req.body || {};

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    if (isNaN(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Verify booking exists and belongs to user
        const [bookingRows] = await pool.query(
            'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
            [bookingId, userId]
        );

        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }

        // Update payment status to completed
        const [updateResult] = await pool.query(
            `UPDATE payment
             SET p_status = 'completed',
                 p_paid_at = NOW()
             WHERE p_booking_id = ?
             AND p_user_id = ?
             AND p_status IN ('pending', 'processing')`,
            [bookingId, userId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: 'No pending payment found for this booking'
            });
        }

        console.log('Payment marked as completed for booking:', bookingId);

        // Emit socket events to both client and provider
        emitBookingUpdate(req, userEmail);
        try {
            const [providerRow] = await pool.query(`
                SELECT DISTINCT p.u_email as provider_email
                FROM booking_service bs
                INNER JOIN service s ON bs.bs_service_id = s.idservice
                INNER JOIN user p ON s.s_provider_id = p.iduser
                WHERE bs.bs_booking_id = ?
                LIMIT 1
            `, [bookingId]);
            if (providerRow.length > 0 && providerRow[0].provider_email !== userEmail) {
                emitBookingUpdate(req, providerRow[0].provider_email);
            }
        } catch (socketErr) {
            console.error('Socket emit failed (non-critical):', socketErr);
        }

        return res.json({
            ok: true,
            message: 'Payment marked as completed',
            bookingId: bookingId
        });
    } catch (err) {
        console.error('Mark payment complete failed:', err.code, err.message);
        return res.status(500).json({
            ok: false,
            error: err.message || 'Database error'
        });
    }
});

// Get provider's bookings (bookings for services owned by the provider)
// Get provider bookings with client details
router.get('/provider/bookings', async (req, res) => {
    const providerId = req.query.providerId; // Firebase UID
    const providerEmail = req.query.providerEmail;

    if (!providerId && !providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider ID or email is required' });
    }

    try {
        const pool = getPool();

        // Get provider's database user ID
        let userId;
        if (providerEmail) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
            if (userRows.length === 0) {
                return res.json({ ok: true, rows: [] });
            }
            userId = userRows[0].iduser;
        } else if (providerId) {
            // If providerId is a Firebase UID, we need to find by email or create a mapping
            // For now, let's try to find by email if the UID format matches
            // Otherwise, we'll need to store Firebase UID in the user table
            // Let's use a workaround: check if providerId looks like an email
            if (providerId.includes('@')) {
                const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
                if (userRows.length === 0) {
                    return res.json({ ok: true, rows: [] });
                }
                userId = userRows[0].iduser;
            } else {
                // If it's a Firebase UID, we need to get the email from the user object
                // For now, return empty - we'll need to add Firebase UID to user table or use email
                return res.json({ ok: true, rows: [] });
            }
        }

        // Get bookings for services owned by this provider with payment information and client details
        const [rows] = await pool.query(`
            SELECT DISTINCT
                b.idbooking,
                b.b_event_name,
                b.b_event_date,
                b.b_start_time,
                b.b_end_time,
                b.b_location,
                b.b_total_cost,
                b.b_status,
                b.b_created_at,
                CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                u.u_email as client_email,
                u.u_phone as client_phone,
                CONCAT(
                    COALESCE(u.u_address, ''),
                    CASE WHEN u.u_address IS NOT NULL AND u.u_address != '' AND u.u_city IS NOT NULL AND u.u_city != '' THEN ', ' ELSE '' END,
                    COALESCE(u.u_city, ''),
                    CASE WHEN u.u_city IS NOT NULL AND u.u_city != '' AND u.u_state IS NOT NULL AND u.u_state != '' THEN ', ' ELSE '' END,
                    COALESCE(u.u_state, ''),
                    CASE WHEN u.u_zip_code IS NOT NULL AND u.u_zip_code != '' THEN ' ' ELSE '' END,
                    COALESCE(u.u_zip_code, '')
                ) as client_address,
                GROUP_CONCAT(DISTINCT s.s_name SEPARATOR ', ') as service_name,
                MAX(CASE WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN p.p_payment_method ELSE NULL END) as payment_method,
                MAX(CASE WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN p.p_status ELSE NULL END) as payment_status,
                MAX(CASE
                    WHEN p.p_payment_method = 'Cash on Hand' AND p.p_status = 'pending' THEN 1
                    ELSE 0
                END) as has_pending_cash_payment,
                MAX(CASE WHEN p.p_status = 'completed' THEN 1 ELSE 0 END) as is_paid
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            LEFT JOIN user u ON b.b_client_id = u.iduser
            LEFT JOIN payment p ON b.idbooking = p.p_booking_id
            WHERE s.s_provider_id = ?
            GROUP BY b.idbooking, b.b_event_name, b.b_event_date, b.b_start_time, b.b_end_time,
                     b.b_location, b.b_total_cost, b.b_status, b.b_created_at,
                     u.u_fname, u.u_lname, u.u_email, u.u_phone, u.u_address, u.u_city, u.u_state, u.u_zip_code
            ORDER BY b.b_event_date DESC, b.b_created_at DESC
        `, [userId]);

        // Process rows: if status is 'completed' but not paid, change to 'cancelled'
        const processedRows = rows.map(row => {
            if (row.b_status === 'completed' && row.is_paid !== 1) {
                // Update in database
                pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', ['cancelled', row.idbooking]).catch(err => {
                    console.error('Error updating booking status:', err);
                });
                return {
                    ...row,
                    b_status: 'cancelled'
                };
            }
            return row;
        });

        return res.json({ ok: true, rows: processedRows });
    } catch (err) {
        console.error('Get provider bookings failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Mark cash payment as paid (for providers)
router.post('/provider/bookings/:bookingId/mark-payment-paid', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const { providerEmail } = req.body || {};

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        // Get provider's database user ID
        const [providerRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
        if (providerRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        const providerId = providerRows[0].iduser;

        // Verify that this booking belongs to a service owned by this provider
        const [bookingRows] = await pool.query(`
            SELECT b.idbooking
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            WHERE b.idbooking = ? AND s.s_provider_id = ?
            LIMIT 1
        `, [bookingId, providerId]);

        if (bookingRows.length === 0) {
            return res.status(403).json({ ok: false, error: 'You can only mark payments for your own bookings' });
        }

        // Update cash payment status to completed
        const [updateResult] = await pool.query(
            `UPDATE payment
             SET p_status = 'completed',
                 p_paid_at = NOW()
             WHERE p_booking_id = ?
             AND p_payment_method = 'Cash on Hand'
             AND p_status = 'pending'`,
            [bookingId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: 'No pending cash payment found for this booking'
            });
        }

        console.log(`Cash payment marked as paid for booking ${bookingId} by provider ${providerEmail}`);

        // Emit socket events to both provider and client
        emitBookingUpdate(req, providerEmail);
        try {
            const [clientRow] = await pool.query(`
                SELECT u.u_email as client_email
                FROM booking b
                INNER JOIN user u ON b.b_client_id = u.iduser
                WHERE b.idbooking = ?
                LIMIT 1
            `, [bookingId]);
            if (clientRow.length > 0 && clientRow[0].client_email !== providerEmail) {
                emitBookingUpdate(req, clientRow[0].client_email);
            }
        } catch (socketErr) {
            console.error('Socket emit failed (non-critical):', socketErr);
        }

        // Get payment details for invoice
        const [paymentRows] = await pool.query(
            'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
            [bookingId]
        );

        return res.json({
            ok: true,
            message: 'Payment marked as paid successfully',
            payment: paymentRows.length > 0 ? paymentRows[0] : null
        });
    } catch (err) {
        console.error('Mark payment as paid failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Generate and download invoice PDF
router.get('/provider/bookings/:bookingId/invoice', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const providerEmail = req.query.providerEmail;

    if (!providerEmail) {
        return res.status(400).json({ ok: false, error: 'Provider email is required' });
    }

    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        // Get provider's database user ID
        const [providerRows] = await pool.query('SELECT iduser, u_fname, u_lname, u_email, u_address, u_city, u_state FROM `user` WHERE u_email = ?', [providerEmail]);
        if (providerRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        const provider = providerRows[0];

        // Get booking details
        const [bookingRows] = await pool.query(`
            SELECT b.*,
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email,
                   u.u_address as client_address,
                   u.u_city as client_city,
                   u.u_state as client_state
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE b.idbooking = ?
        `, [bookingId]);

        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }

        const booking = bookingRows[0];

        // Verify booking belongs to provider
        const [serviceRows] = await pool.query(`
            SELECT s.idservice
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ? AND s.s_provider_id = ?
            LIMIT 1
        `, [bookingId, provider.iduser]);

        if (serviceRows.length === 0) {
            return res.status(403).json({ ok: false, error: 'You can only generate invoices for your own bookings' });
        }

        // Get services
        const [services] = await pool.query(`
            SELECT s.s_name as name,
                   bs.bs_quantity as quantity,
                   bs.bs_unit_price as unitPrice,
                   bs.bs_total_price as totalPrice
            FROM booking_service bs
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
        `, [bookingId]);

        // Get payment information
        const [paymentRows] = await pool.query(
            'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
            [bookingId]
        );

        if (paymentRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No completed payment found for this booking' });
        }

        const payment = paymentRows[0];

        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const time = timeStr.toString().slice(0, 5);
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        };

        // Prepare invoice data
        const invoiceData = {
            booking: {
                id: booking.idbooking,
                eventName: booking.b_event_name,
                date: formatDate(booking.b_event_date),
                time: `${formatTime(booking.b_start_time)} - ${formatTime(booking.b_end_time)}`,
                location: booking.b_location,
                totalCost: parseFloat(booking.b_total_cost) || 0
            },
            client: {
                name: booking.client_name || 'Client',
                email: booking.client_email || '',
                address: [booking.client_address, booking.client_city, booking.client_state].filter(Boolean).join(', ') || ''
            },
            provider: {
                name: `${provider.u_fname} ${provider.u_lname}`.trim() || 'Service Provider',
                email: provider.u_email || '',
                address: [provider.u_address, provider.u_city, provider.u_state].filter(Boolean).join(', ') || ''
            },
            payment: {
                method: payment.p_payment_method || 'Cash on Hand',
                status: payment.p_status || 'completed',
                paidAt: formatDate(payment.p_paid_at),
                transactionId: payment.p_transaction_id || ''
            },
            services: services.map(s => ({
                name: s.name || 'Service',
                quantity: s.quantity || 1,
                unitPrice: parseFloat(s.unitPrice) || 0,
                totalPrice: parseFloat(s.totalPrice) || 0
            }))
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Set response headers
        const invoiceNumber = `INV-${bookingId}-${Date.now()}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Generate invoice failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Failed to generate invoice: ' + err.message });
    }
});

// Generate and download invoice PDF for user
router.get('/user/bookings/:bookingId/invoice', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const userEmail = req.query.userEmail;

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    if (!Number.isFinite(bookingId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    try {
        const pool = getPool();

        // Get user's database user ID
        const [userRows] = await pool.query('SELECT iduser, u_fname, u_lname, u_email, u_address, u_city, u_state FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const user = userRows[0];

        // Get booking details
        const [bookingRows] = await pool.query(`
            SELECT b.*
            FROM booking b
            WHERE b.idbooking = ? AND b.b_client_id = ?
        `, [bookingId, user.iduser]);

        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found or does not belong to you' });
        }

        const booking = bookingRows[0];

        // Get provider information from the booking's services
        const [providerRows] = await pool.query(`
            SELECT DISTINCT u.u_fname, u.u_lname, u.u_email, u.u_address, u.u_city, u.u_state
            FROM booking_service bs
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user u ON s.s_provider_id = u.iduser
            WHERE bs.bs_booking_id = ?
            LIMIT 1
        `, [bookingId]);

        const provider = providerRows.length > 0 ? providerRows[0] : {
            u_fname: 'Service',
            u_lname: 'Provider',
            u_email: '',
            u_address: '',
            u_city: '',
            u_state: ''
        };

        // Get services
        const [services] = await pool.query(`
            SELECT s.s_name as name,
                   bs.bs_quantity as quantity,
                   bs.bs_unit_price as unitPrice,
                   bs.bs_total_price as totalPrice
            FROM booking_service bs
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
        `, [bookingId]);

        // Get payment information
        const [paymentRows] = await pool.query(
            'SELECT p_payment_method, p_status, p_paid_at, p_transaction_id FROM payment WHERE p_booking_id = ? AND p_status = "completed" ORDER BY p_paid_at DESC LIMIT 1',
            [bookingId]
        );

        if (paymentRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No completed payment found for this booking' });
        }

        const payment = paymentRows[0];

        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const time = timeStr.toString().slice(0, 5);
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        };

        // Prepare invoice data
        const invoiceData = {
            booking: {
                id: booking.idbooking,
                eventName: booking.b_event_name,
                date: formatDate(booking.b_event_date),
                time: `${formatTime(booking.b_start_time)} - ${formatTime(booking.b_end_time)}`,
                location: booking.b_location,
                totalCost: parseFloat(booking.b_total_cost) || 0
            },
            client: {
                name: `${user.u_fname} ${user.u_lname}`.trim() || 'Client',
                email: user.u_email || '',
                address: [user.u_address, user.u_city, user.u_state].filter(Boolean).join(', ') || ''
            },
            provider: {
                name: `${provider.u_fname} ${provider.u_lname}`.trim() || 'Service Provider',
                email: provider.u_email || '',
                address: [provider.u_address, provider.u_city, provider.u_state].filter(Boolean).join(', ') || ''
            },
            payment: {
                method: payment.p_payment_method || 'Cash on Hand',
                status: payment.p_status || 'completed',
                paidAt: formatDate(payment.p_paid_at),
                transactionId: payment.p_transaction_id || ''
            },
            services: services.map(s => ({
                name: s.name || 'Service',
                quantity: s.quantity || 1,
                unitPrice: parseFloat(s.unitPrice) || 0,
                totalPrice: parseFloat(s.totalPrice) || 0
            }))
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Set response headers
        const invoiceNumber = `INV-${bookingId}-${Date.now()}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Generate user invoice failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Failed to generate invoice: ' + err.message });
    }
});

// Get booking by ID
router.get('/bookings/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT b.*,
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email
            FROM booking b
            LEFT JOIN user u ON b.b_client_id = u.iduser
            WHERE b.idbooking = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        const booking = rows[0];

        // Get services for booking
        const [services] = await pool.query(`
            SELECT s.s_name, bs.bs_quantity, bs.bs_unit_price, bs.bs_total_price
            FROM booking_service bs
            LEFT JOIN service s ON bs.bs_service_id = s.idservice
            WHERE bs.bs_booking_id = ?
        `, [id]);
        booking.services = services;

        return res.json({ ok: true, booking });
    } catch (err) {
        console.error('Get booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Create a new booking
router.post('/bookings', async (req, res) => {
    const { clientEmail, serviceId, eventName, eventDate, startTime, endTime, location, attendees, notes } = req.body || {};

    if (!clientEmail || !serviceId || !eventName || !eventDate || !startTime || !endTime || !location) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    try {
        const pool = getPool();

        // Get client user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [clientEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const clientId = userRows[0].iduser;

        // Parse date range from notes if it's a multi-day booking
        let dateRangeInfo = null;
        let checkDates = [eventDate];

        if (notes) {
            try {
                dateRangeInfo = JSON.parse(notes);
                if (dateRangeInfo.startDate && dateRangeInfo.endDate && dateRangeInfo.allDates) {
                    // For multi-day bookings, check all dates in the range
                    checkDates = dateRangeInfo.allDates;
                    console.log(`Multi-day booking detected: ${dateRangeInfo.startDate} to ${dateRangeInfo.endDate} (${checkDates.length} days)`);
                }
            } catch (e) {
                // Notes is not JSON, treat as regular notes
            }
        }

        // Check for overlapping bookings for all dates in the range
        for (const checkDate of checkDates) {
        const [overlappingBookings] = await pool.query(
            `SELECT b.b_start_time, b.b_end_time, b.b_event_name, b.b_status
             FROM booking b
             INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
             WHERE bs.bs_service_id = ?
             AND b.b_event_date = ?
             AND b.b_status IN ('pending', 'confirmed')
             AND (
                 (b.b_start_time < ? AND b.b_end_time > ?) OR
                 (b.b_start_time < ? AND b.b_end_time > ?) OR
                     (b.b_start_time >= ? AND b.b_end_time <= ?) OR
                     (b.b_start_time = '00:00:00' AND b.b_end_time = '23:59:59' AND ? = '00:00:00' AND ? = '23:59:59')
             )`,
                [serviceId, checkDate, endTime, startTime, startTime, endTime, startTime, endTime, startTime, endTime]
        );

        if (overlappingBookings.length > 0) {
            const conflict = overlappingBookings[0];
            const conflictStart = conflict.b_start_time.toString().slice(0, 5);
            const conflictEnd = conflict.b_end_time.toString().slice(0, 5);
                const conflictDate = new Date(checkDate).toLocaleDateString();
                console.log(`Overlap detected for service ${serviceId} on ${checkDate}: ${conflictStart} - ${conflictEnd}`);
            return res.status(409).json({
                ok: false,
                    error: `This time slot overlaps with an existing booking on ${conflictDate} (${conflictStart} - ${conflictEnd}). Please select a different time.`,
                conflict: {
                    start: conflict.b_start_time,
                    end: conflict.b_end_time,
                        eventName: conflict.b_event_name,
                        date: checkDate
                }
            });
            }
        }

        console.log(`No overlap detected for service ${serviceId} on date range: ${checkDates.join(', ')} (${startTime} - ${endTime})`);

        // Get service details for pricing and provider info
        const [serviceRows] = await pool.query(`
            SELECT s.s_base_price, s.s_duration, s.s_category, s.s_provider_id, s.s_name,
                   u.iduser as provider_user_id, u.u_email as provider_email, u.u_fname as provider_fname, u.u_lname as provider_lname
            FROM service s
            LEFT JOIN user u ON s.s_provider_id = u.iduser
            WHERE s.idservice = ?
        `, [serviceId]);
        if (serviceRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }
        const basePrice = parseFloat(serviceRows[0].s_base_price) || 0;
        const serviceDuration = parseInt(serviceRows[0].s_duration) || 60; // Default to 60 minutes
        const serviceCategory = serviceRows[0].s_category || '';
        const providerUserId = serviceRows[0].provider_user_id;
        const providerEmail = serviceRows[0].provider_email;
        const providerName = `${serviceRows[0].provider_fname || ''} ${serviceRows[0].provider_lname || ''}`.trim() || 'Provider';
        const serviceName = serviceRows[0].s_name || 'Service';

        let calculatedCost = 0;

        // For catering services, calculate based on attendees (per pax)
        if (serviceCategory.toLowerCase() === 'catering') {
            const numAttendees = parseInt(attendees) || 1;
            calculatedCost = basePrice * numAttendees;
        } else {
            const MINUTES_PER_DAY = 1440; // 24 hours * 60 minutes

            // If we have date range info (multi-day booking), use it for calculation
            if (dateRangeInfo && dateRangeInfo.totalDays) {
                // For multi-day bookings, calculate based on number of days in the range
                calculatedCost = basePrice * dateRangeInfo.totalDays;
                console.log(`Multi-day booking cost: ${basePrice} * ${dateRangeInfo.totalDays} = ${calculatedCost}`);
            } else if (serviceDuration >= MINUTES_PER_DAY) {
                // If service is per day (1440 minutes = 24 hours) but no dateRangeInfo, calculate based on time duration
                // Calculate duration from start and end time
                const startParts = startTime.split(':').map(Number);
                const endParts = endTime.split(':').map(Number);
                const startMinutes = startParts[0] * 60 + startParts[1];
                const endMinutes = endParts[0] * 60 + endParts[1];
                const selectedDurationMinutes = endMinutes - startMinutes;

                // Calculate how many days the selected duration covers
                const selectedDays = Math.ceil(selectedDurationMinutes / MINUTES_PER_DAY);
                // Each day is 1 unit of the base price
                calculatedCost = basePrice * selectedDays;
                console.log(`Per-day booking cost: ${basePrice} * ${selectedDays} = ${calculatedCost} (duration: ${selectedDurationMinutes} minutes)`);
            } else {
                // For hourly or shorter services, calculate based on duration ratio
                // Calculate duration from start and end time
                const startParts = startTime.split(':').map(Number);
                const endParts = endTime.split(':').map(Number);
                const startMinutes = startParts[0] * 60 + startParts[1];
                const endMinutes = endParts[0] * 60 + endParts[1];
                const selectedDurationMinutes = endMinutes - startMinutes;

                // Calculate cost: (selected_duration_minutes / service_duration_minutes) * base_price
                // Example: If service is 60 minutes and user selects 9 hours (540 minutes)
                // Cost = (540 / 60) * price = 9 * price
                calculatedCost = (selectedDurationMinutes / serviceDuration) * basePrice;
                console.log(`Hourly booking cost: (${selectedDurationMinutes} / ${serviceDuration}) * ${basePrice} = ${calculatedCost}`);
            }
        }

        // Create booking
        const [result] = await pool.query(
            `INSERT INTO booking
             (b_client_id, b_event_name, b_event_date, b_start_time, b_end_time, b_location, b_total_cost, b_attendees, b_notes, b_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [clientId, eventName, eventDate, startTime, endTime, location, calculatedCost, attendees || null, notes || null]
        );

        const bookingId = result.insertId;

        // Link service to booking
        await pool.query(
            `INSERT INTO booking_service
             (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price)
             VALUES (?, ?, 1, ?, ?)`,
            [bookingId, serviceId, basePrice, calculatedCost]
        );

        // Create notification for provider about new booking
        if (providerUserId) {
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

                // Get client name for notification
                const [clientRows] = await pool.query(
                    'SELECT CONCAT(u_fname, " ", u_lname) as client_name FROM `user` WHERE iduser = ?',
                    [clientId]
                );
                const clientName = clientRows.length > 0 ? clientRows[0].client_name : 'A client';

                const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const formattedStartTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                const formattedEndTime = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                const notificationTitle = 'New Booking Received';
                const notificationMessage = `${clientName} has booked "${serviceName}" for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.\n\nEvent: ${eventName}\nLocation: ${location}${attendees ? `\nAttendees: ${attendees}` : ''}`;

                // Create notification entry
                await pool.query(
                    'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                    [
                        providerUserId,
                        notificationTitle,
                        notificationMessage,
                        'new_booking',
                        0
                    ]
                );

                console.log(`Notification created for provider user ID ${providerUserId}`);

                // Send push notification to provider
                try {
                    if (global.sendPushNotification && providerEmail) {
                        await global.sendPushNotification(
                            providerEmail,
                            notificationTitle,
                            `${clientName} booked "${serviceName}" for ${formattedDate}`,
                            {
                                type: 'new_booking',
                                bookingId: bookingId.toString(),
                                serviceId: serviceId.toString(),
                            }
                        );
                        console.log(`Push notification sent to provider ${providerEmail}`);
                    }
                } catch (pushErr) {
                    console.error('Failed to send push notification to provider (non-critical):', pushErr);
                }
            } catch (notifErr) {
                console.error('Failed to create notification for provider (non-critical):', notifErr);
            }
        }

        return res.json({ ok: true, id: bookingId, message: 'Booking created successfully' });
    } catch (err) {
        console.error('Create booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// ============================================
// SERVICE RATINGS API ENDPOINTS
// ============================================

// Submit a rating for a service in a completed booking
router.post('/bookings/:bookingId/services/:serviceId/rate', async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const serviceId = Number(req.params.serviceId);
    const { userEmail, rating, comment } = req.body || {};

    if (!Number.isFinite(bookingId) || !Number.isFinite(serviceId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking or service ID' });
    }

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ ok: false, error: 'Rating must be between 1 and 5' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Verify booking exists and is completed, and belongs to this user
        const [bookingRows] = await pool.query(
            'SELECT b_client_id, b_status FROM booking WHERE idbooking = ?',
            [bookingId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        const booking = bookingRows[0];

        if (booking.b_client_id !== userId) {
            return res.status(403).json({ ok: false, error: 'You can only rate services for your own bookings' });
        }

        if (booking.b_status !== 'completed') {
            return res.status(400).json({ ok: false, error: 'You can only rate services for completed bookings' });
        }

        // Verify service is part of this booking
        const [serviceRows] = await pool.query(
            'SELECT bs_service_id FROM booking_service WHERE bs_booking_id = ? AND bs_service_id = ?',
            [bookingId, serviceId]
        );
        if (serviceRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Service not found in this booking' });
        }

        // Check if user has already rated this service for this booking
        const [existingRating] = await pool.query(
            'SELECT idreview FROM service_review WHERE sr_booking_id = ? AND sr_service_id = ? AND sr_user_id = ?',
            [bookingId, serviceId, userId]
        );

        if (existingRating.length > 0) {
            // Update existing rating
            await pool.query(
                'UPDATE service_review SET sr_rating = ?, sr_comment = ?, sr_updated_at = NOW() WHERE idreview = ?',
                [rating, comment || null, existingRating[0].idreview]
            );
        } else {
            // Create new rating
            await pool.query(
                'INSERT INTO service_review (sr_service_id, sr_booking_id, sr_user_id, sr_rating, sr_comment) VALUES (?, ?, ?, ?, ?)',
                [serviceId, bookingId, userId, rating, comment || null]
            );
        }

        // Update service average rating and review count
        const [ratingStats] = await pool.query(`
            SELECT AVG(sr_rating) as avg_rating, COUNT(*) as review_count
            FROM service_review
            WHERE sr_service_id = ?
        `, [serviceId]);

        if (ratingStats.length > 0) {
            const avgRating = parseFloat(ratingStats[0].avg_rating) || 0;
            const reviewCount = parseInt(ratingStats[0].review_count) || 0;

            await pool.query(
                'UPDATE service SET s_rating = ?, s_review_count = ? WHERE idservice = ?',
                [avgRating, reviewCount, serviceId]
            );
        }

        return res.json({ ok: true, message: 'Rating submitted successfully' });
    } catch (err) {
        console.error('Submit rating failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get rating for a service in a booking
router.get('/bookings/:bookingId/services/:serviceId/rating', async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const serviceId = Number(req.params.serviceId);
    const userEmail = req.query.email;

    if (!Number.isFinite(bookingId) || !Number.isFinite(serviceId)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking or service ID' });
    }

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.json({ ok: true, rating: null });
        }
        const userId = userRows[0].iduser;

        // Get rating
        const [ratingRows] = await pool.query(
            'SELECT sr_rating, sr_comment, sr_created_at, sr_updated_at FROM service_review WHERE sr_booking_id = ? AND sr_service_id = ? AND sr_user_id = ?',
            [bookingId, serviceId, userId]
        );

        if (ratingRows.length === 0) {
            return res.json({ ok: true, rating: null });
        }

        return res.json({ ok: true, rating: {
            rating: ratingRows[0].sr_rating,
            comment: ratingRows[0].sr_comment,
            createdAt: ratingRows[0].sr_created_at,
            updatedAt: ratingRows[0].sr_updated_at
        }});
    } catch (err) {
        console.error('Get rating failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Update booking status
router.post('/bookings/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { status, userEmail, cancellation_reason } = req.body || {};
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!Number.isFinite(id) || !validStatuses.includes(status)) {
        return res.status(400).json({ ok: false, error: 'Invalid parameters' });
    }
    try {
        const pool = getPool();

        // If userEmail is provided, verify the booking belongs to the user
        if (userEmail) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
            if (userRows.length === 0) {
                return res.status(404).json({ ok: false, error: 'User not found' });
            }
            const userId = userRows[0].iduser;

            const [bookingRows] = await pool.query(
                'SELECT idbooking FROM booking WHERE idbooking = ? AND b_client_id = ?',
                [id, userId]
            );
            if (bookingRows.length === 0) {
                return res.status(403).json({ ok: false, error: 'You do not have permission to update this booking' });
            }
        }

        // If status is 'completed', check if booking is paid
        // If not paid, automatically set status to 'cancelled'
        let finalStatus = status;
        if (status === 'completed') {
            const [paymentRows] = await pool.query(
                'SELECT p_status FROM payment WHERE p_booking_id = ? AND p_status = ? LIMIT 1',
                [id, 'completed']
            );
            // Check if there's a completed payment
            if (paymentRows.length === 0) {
                // No completed payment found, check is_paid flag in booking
                const [bookingCheck] = await pool.query(
                    'SELECT is_paid FROM booking WHERE idbooking = ?',
                    [id]
                );
                if (bookingCheck.length > 0 && bookingCheck[0].is_paid !== 1) {
                    // Not paid, change to cancelled
                    finalStatus = 'cancelled';
                    console.log(`Booking ${id} is completed but not paid, changing status to cancelled`);
                }
            }
        }

        // Update booking status and store cancellation reason if provided
        if (finalStatus === 'cancelled' && cancellation_reason) {
            // Store cancellation reason in b_notes
            await pool.query('UPDATE booking SET b_status = ?, b_notes = ? WHERE idbooking = ?',
                [finalStatus, cancellation_reason, id]);
        } else {
        await pool.query('UPDATE booking SET b_status = ? WHERE idbooking = ?', [finalStatus, id]);
        }

        // Get booking details and send push notifications
        const [bookingDetails] = await pool.query(`
            SELECT b.b_event_name, b.b_client_id, b.b_event_date,
                   CONCAT(u.u_fname, ' ', u.u_lname) as client_name,
                   u.u_email as client_email,
                   u.iduser as client_user_id,
                   s.s_provider_id,
                   CONCAT(p.u_fname, ' ', p.u_lname) as provider_name,
                   p.u_email as provider_email,
                   p.iduser as provider_user_id
            FROM booking b
            INNER JOIN user u ON b.b_client_id = u.iduser
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user p ON s.s_provider_id = p.iduser
            WHERE b.idbooking = ?
            LIMIT 1
        `, [id]);

        if (bookingDetails.length > 0) {
            const booking = bookingDetails[0];

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

            if (finalStatus === 'cancelled') {
                // Create cancellation message with reason
                const cancellationMessage = cancellation_reason
                    ? `Your booking "${booking.b_event_name}" has been cancelled.\n\nReason: ${cancellation_reason}`
                    : `Your booking "${booking.b_event_name}" has been cancelled.`;

                const providerCancellationMessage = cancellation_reason
                    ? `${booking.client_name}'s booking "${booking.b_event_name}" has been cancelled.\n\nReason: ${cancellation_reason}`
                    : `${booking.client_name}'s booking "${booking.b_event_name}" has been cancelled.`;

                // Create database notification for client
                if (booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.client_user_id,
                                'Booking Cancelled',
                                cancellationMessage,
                                'booking_cancelled',
                                0
                            ]
                        );
                        console.log(`Notification created for client user ID ${booking.client_user_id}`);
                    } catch (notifErr) {
                        console.error('Failed to create notification for client (non-critical):', notifErr);
                    }
                }

                // Create database notification for provider
                if (booking.provider_user_id && booking.provider_user_id !== booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.provider_user_id,
                                'Booking Cancelled',
                                providerCancellationMessage,
                                'booking_cancelled',
                                0
                            ]
                        );
                        console.log(`Notification created for provider user ID ${booking.provider_user_id}`);
                    } catch (notifErr) {
                        console.error('Failed to create notification for provider (non-critical):', notifErr);
                    }
                }

                // Send push notifications
                if (booking.client_email) {
                    if (global.sendPushNotification) {
                    global.sendPushNotification(
                        booking.client_email,
                        'Booking Cancelled',
                        cancellationMessage,
                        {
                            type: 'booking_cancelled',
                            bookingId: id.toString(),
                            status: 'cancelled',
                        }
                    ).catch(err => console.error('Failed to send push notification to client:', err));
                    }
                }

                if (booking.provider_email && booking.provider_email !== booking.client_email) {
                    if (global.sendPushNotification) {
                    global.sendPushNotification(
                        booking.provider_email,
                        'Booking Cancelled',
                        providerCancellationMessage,
                        {
                            type: 'booking_cancelled',
                            bookingId: id.toString(),
                            status: 'cancelled',
                        }
                    ).catch(err => console.error('Failed to send push notification to provider:', err));
                    }
                }
            } else if (finalStatus === 'confirmed') {
                // Create confirmation message
                const confirmationMessage = `Your booking "${booking.b_event_name}" has been confirmed!`;
                const providerConfirmationMessage = `${booking.client_name}'s booking "${booking.b_event_name}" has been confirmed.`;

                // Create database notification for client
                if (booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.client_user_id,
                                'Booking Confirmed',
                                confirmationMessage,
                                'booking_confirmed',
                                0
                            ]
                        );
                        console.log(`Notification created for client user ID ${booking.client_user_id}`);
                    } catch (notifErr) {
                        console.error('Failed to create notification for client (non-critical):', notifErr);
                    }
                }

                // Create database notification for provider
                if (booking.provider_user_id && booking.provider_user_id !== booking.client_user_id) {
                    try {
                        await pool.query(
                            'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                            [
                                booking.provider_user_id,
                                'Booking Confirmed',
                                providerConfirmationMessage,
                                'booking_confirmed',
                                0
                            ]
                        );
                        console.log(`Notification created for provider user ID ${booking.provider_user_id}`);
                    } catch (notifErr) {
                        console.error('Failed to create notification for provider (non-critical):', notifErr);
                    }
                }

                // Send push notifications
                if (booking.client_email) {
                    if (global.sendPushNotification) {
                    global.sendPushNotification(
                        booking.client_email,
                        'Booking Confirmed',
                        confirmationMessage,
                        {
                            type: 'booking_confirmed',
                            bookingId: id.toString(),
                            status: 'confirmed',
                        }
                    ).catch(err => console.error('Failed to send push notification to client:', err));
                    }
                }

                if (booking.provider_email && booking.provider_email !== booking.client_email) {
                    if (global.sendPushNotification) {
                    global.sendPushNotification(
                        booking.provider_email,
                        'Booking Confirmed',
                        providerConfirmationMessage,
                        {
                            type: 'booking_confirmed',
                            bookingId: id.toString(),
                            status: 'confirmed',
                        }
                    ).catch(err => console.error('Failed to send push notification to provider:', err));
                    }
                }
            } else {
                // For other statuses (completed, pending), use existing push notification logic
            const statusMessages = {
                'completed': 'Your booking has been completed.',
                'pending': 'Your booking is pending confirmation.'
            };

            if (booking.client_email) {
                if (global.sendPushNotification) {
                global.sendPushNotification(
                    booking.client_email,
                    `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}`,
                    statusMessages[finalStatus] || `Your booking status has been updated to ${finalStatus}`,
                    {
                        type: 'booking',
                        bookingId: id.toString(),
                        status: finalStatus,
                    }
                ).catch(err => console.error('Failed to send push notification to client:', err));
                }
            }

            if (booking.provider_email && booking.provider_email !== booking.client_email) {
                if (global.sendPushNotification) {
                global.sendPushNotification(
                    booking.provider_email,
                    `Booking ${finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}`,
                    `${booking.client_name}'s booking has been ${finalStatus}`,
                    {
                        type: 'booking',
                        bookingId: id.toString(),
                        status: finalStatus,
                    }
                ).catch(err => console.error('Failed to send push notification to provider:', err));
                }
                }
            }

            // Emit socket events to both client and provider
            emitBookingUpdate(req, booking.client_email);
            if (booking.provider_email && booking.provider_email !== booking.client_email) {
                emitBookingUpdate(req, booking.provider_email);
            }
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('Update booking status failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

// Update booking details
router.put('/bookings/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { userEmail, eventName, eventDate, startTime, endTime, location, attendees, notes } = req.body || {};

    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking ID' });
    }

    if (!userEmail) {
        return res.status(400).json({ ok: false, error: 'User email is required' });
    }

    try {
        const pool = getPool();

        // Get user ID
        const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        const userId = userRows[0].iduser;

        // Verify booking exists and belongs to user
        const [bookingRows] = await pool.query(
            'SELECT idbooking, b_status FROM booking WHERE idbooking = ? AND b_client_id = ?',
            [id, userId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Booking not found' });
        }

        const booking = bookingRows[0];

        // Check if booking is paid
        const [paymentRows] = await pool.query(
            'SELECT idpayment FROM payment WHERE p_booking_id = ? AND p_status = "completed"',
            [id]
        );
        if (paymentRows.length > 0) {
            return res.status(400).json({ ok: false, error: 'Cannot edit a booking that has been paid' });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (eventName !== undefined) {
            updateFields.push('b_event_name = ?');
            updateValues.push(eventName);
        }
        if (eventDate !== undefined) {
            updateFields.push('b_event_date = ?');
            updateValues.push(eventDate);
        }
        if (startTime !== undefined) {
            updateFields.push('b_start_time = ?');
            updateValues.push(startTime);
        }
        if (endTime !== undefined) {
            updateFields.push('b_end_time = ?');
            updateValues.push(endTime);
        }
        if (location !== undefined) {
            updateFields.push('b_location = ?');
            updateValues.push(location);
        }
        if (attendees !== undefined) {
            updateFields.push('b_attendees = ?');
            updateValues.push(attendees || null);
        }
        if (notes !== undefined) {
            updateFields.push('b_notes = ?');
            updateValues.push(notes || null);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }

        // Add updated_at
        updateFields.push('b_updated_at = NOW()');
        updateValues.push(id);

        // Check for overlapping bookings if date/time is being updated
        if (eventDate !== undefined || startTime !== undefined || endTime !== undefined) {
            const finalDate = eventDate || bookingRows[0].b_event_date;
            const finalStartTime = startTime || bookingRows[0].b_start_time;
            const finalEndTime = endTime || bookingRows[0].b_end_time;

            // Get services for this booking
            const [serviceRows] = await pool.query(
                'SELECT bs_service_id FROM booking_service WHERE bs_booking_id = ?',
                [id]
            );

            if (serviceRows.length > 0) {
                const serviceIds = serviceRows.map((r) => r.bs_service_id);

                // Check for overlapping bookings
                const [overlappingBookings] = await pool.query(`
                    SELECT b.b_start_time, b.b_end_time, b.b_event_name, b.b_status
                    FROM booking b
                    INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
                    WHERE bs.bs_service_id IN (${serviceIds.map(() => '?').join(',')})
                    AND b.idbooking != ?
                    AND b.b_event_date = ?
                    AND b.b_status IN ('pending', 'confirmed')
                    AND (
                        (b.b_start_time < ? AND b.b_end_time > ?) OR
                        (b.b_start_time < ? AND b.b_end_time > ?) OR
                        (b.b_start_time >= ? AND b.b_end_time <= ?)
                    )
                `, [...serviceIds, id, finalDate, finalStartTime, finalEndTime, finalStartTime, finalEndTime, finalStartTime, finalEndTime]);

                if (overlappingBookings.length > 0) {
                    const conflict = overlappingBookings[0];
                    const conflictStart = conflict.b_start_time.toString().slice(0, 5);
                    const conflictEnd = conflict.b_end_time.toString().slice(0, 5);
                    return res.status(409).json({
                        ok: false,
                        error: `This time slot overlaps with an existing booking (${conflictStart} - ${conflictEnd}). Please select a different time.`,
                        conflict: {
                            start: conflict.b_start_time,
                            end: conflict.b_end_time,
                            eventName: conflict.b_event_name
                        }
                    });
                }
            }
        }

        const query = `UPDATE booking SET ${updateFields.join(', ')} WHERE idbooking = ?`;
        await pool.query(query, updateValues);

        return res.json({ ok: true, message: 'Booking updated successfully' });
    } catch (err) {
        console.error('Update booking failed:', err.code, err.message);
        return res.status(500).json({ ok: false, error: 'Database error' });
    }
});

module.exports = router;
