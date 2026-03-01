// server/controllers/bookingController.js
// Request/response handling layer for booking endpoints.
// Delegates all business logic and DB access to bookingService.

const { sendSuccess, sendError } = require('../lib/response');
const bookingService = require('../svc/bookingService');

// ──────────────────────────────────────────────
// Socket helper (needs access to req.app)
// ──────────────────────────────────────────────

function emitBookingUpdate(req, userEmail) {
  const io = req.app.get('io');
  if (io && userEmail) {
    io.to(`user:${userEmail}`).emit('booking-update');
    io.to(`user:${userEmail}`).emit('new-notification');
  }
}

// ──────────────────────────────────────────────
// Helper to map service errors to HTTP responses
// ──────────────────────────────────────────────

function handleServiceError(res, err, fallbackMsg = 'Database error') {
  console.error(`${fallbackMsg}:`, err.code || err.name, err.message);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.statusCode ? err.message : fallbackMsg;
  return sendError(res, code, message, statusCode);
}

// ──────────────────────────────────────────────
// Bookings CRUD
// ──────────────────────────────────────────────

async function listBookings(req, res) {
  try {
    const rows = await bookingService.listBookings();
    return sendSuccess(res, { rows });
  } catch (err) {
    return handleServiceError(res, err, 'List bookings failed');
  }
}

async function getUserBookings(req, res) {
  const email = req.query.email;
  if (!email) {
    return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
  }
  try {
    const rows = await bookingService.getUserBookings(email);
    return sendSuccess(res, { rows });
  } catch (err) {
    return handleServiceError(res, err, 'Get user bookings failed');
  }
}

async function getUserBookingsCount(req, res) {
  const email = req.query.email;
  if (!email) {
    return sendError(res, 'VALIDATION_ERROR', 'Email required', 400);
  }
  try {
    const count = await bookingService.getUserBookingsCount(email);
    return sendSuccess(res, { count });
  } catch (err) {
    return handleServiceError(res, err, 'Get bookings count failed');
  }
}

async function getBookingById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const booking = await bookingService.getBookingById(id);
    if (!booking) {
      return sendError(res, 'NOT_FOUND', 'Booking not found', 404);
    }
    return sendSuccess(res, { booking });
  } catch (err) {
    return handleServiceError(res, err, 'Get booking failed');
  }
}

async function createBooking(req, res) {
  const { clientEmail, serviceId, eventName, eventDate, startTime, endTime, location, attendees, notes } = req.body || {};
  if (!clientEmail || !serviceId || !eventName || !eventDate || !startTime || !endTime || !location) {
    return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
  }
  try {
    const result = await bookingService.createBooking({
      clientEmail, serviceId, eventName, eventDate, startTime, endTime, location, attendees, notes,
    });
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Create booking failed');
  }
}

async function updateBooking(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  const { userEmail } = req.body || {};
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  try {
    const result = await bookingService.updateBooking(id, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Update booking failed');
  }
}

async function updateBookingStatus(req, res) {
  const id = Number(req.params.id);
  const { status, userEmail, cancellation_reason } = req.body || {};
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!Number.isFinite(id) || !validStatuses.includes(status)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid parameters', 400);
  }
  try {
    const { finalStatus, bookingDetails } = await bookingService.updateBookingStatus(id, {
      status, userEmail, cancellation_reason,
    });

    // Emit socket events
    if (bookingDetails) {
      emitBookingUpdate(req, bookingDetails.client_email);
      if (bookingDetails.provider_email && bookingDetails.provider_email !== bookingDetails.client_email) {
        emitBookingUpdate(req, bookingDetails.provider_email);
      }

      // Emit availability-update so provider calendar refreshes in real-time
      if (finalStatus === 'confirmed' || finalStatus === 'cancelled') {
        const io = req.app.get('io');
        if (io && bookingDetails.provider_email) {
          io.to(`user:${bookingDetails.provider_email}`).emit('availability-update', {
            date: bookingDetails.b_event_date,
          });
        }
      }
    }

    return sendSuccess(res, {});
  } catch (err) {
    return handleServiceError(res, err, 'Update booking status failed');
  }
}

// ──────────────────────────────────────────────
// Payment Methods
// ──────────────────────────────────────────────

async function getPaymentMethods(req, res) {
  const email = req.query.email;
  if (!email) {
    return sendError(res, 'VALIDATION_ERROR', 'Email is required', 400);
  }
  try {
    const paymentMethods = await bookingService.getPaymentMethods(email);
    return sendSuccess(res, { paymentMethods });
  } catch (err) {
    return handleServiceError(res, err, 'Get payment methods failed');
  }
}

async function addPaymentMethod(req, res) {
  const { userEmail, type, account_name, account_number, is_default } = req.body || {};
  if (!userEmail || !type || !account_name || !account_number) {
    return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
  }
  try {
    const result = await bookingService.addPaymentMethod({ userEmail, type, account_name, account_number, is_default });
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Add payment method failed');
  }
}

async function setDefaultPaymentMethod(req, res) {
  const id = Number(req.params.id);
  const { userEmail } = req.body || {};
  if (!Number.isFinite(id) || !userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid request', 400);
  }
  try {
    const result = await bookingService.setDefaultPaymentMethod(id, userEmail);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Set default payment method failed');
  }
}

async function deletePaymentMethod(req, res) {
  const id = Number(req.params.id);
  const { userEmail } = req.body || {};
  if (!Number.isFinite(id) || !userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid request', 400);
  }
  try {
    const result = await bookingService.deletePaymentMethod(id, userEmail);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Delete payment method failed');
  }
}

// ──────────────────────────────────────────────
// Payment Processing
// ──────────────────────────────────────────────

async function createPaymongoPayment(req, res) {
  const bookingId = parseInt(req.params.bookingId);
  const { userEmail } = req.body || {};
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  if (isNaN(bookingId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const result = await bookingService.createPaymongoPayment(bookingId, userEmail);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.code === 'PAYMENT_ERROR' || err.code === 'DUPLICATE' || err.code === 'VALIDATION_ERROR' || err.code === 'NOT_FOUND') {
      return sendError(res, err.code, err.message, err.statusCode || 400);
    }
    console.error('Create PayMongo payment failed:', err);
    return sendError(res, 'PAYMENT_ERROR', err.message || 'Failed to create payment. Please try again.', 500);
  }
}

async function processCashPayment(req, res) {
  const bookingId = parseInt(req.params.bookingId);
  const { userEmail } = req.body || {};
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  if (!Number.isFinite(bookingId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const result = await bookingService.processCashPayment(bookingId, userEmail);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Process cash payment failed');
  }
}

async function paymongoSuccess(req, res) {
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
    const result = await bookingService.handlePaymongoSuccess(bookingId, userEmail);
    if (!result.found) {
      return res.status(404).send(`
        <html>
          <body>
            <h1>Payment Error</h1>
            <p>User not found.</p>
          </body>
        </html>
      `);
    }

    const homepageUrl = process.env.FRONTEND_URL || 'http://localhost:8081';

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
            setTimeout(() => {
              window.location.href = '${homepageUrl}';
            }, 1000);
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
}

async function paymongoFailed(req, res) {
  const { bookingId, userEmail } = req.query || {};

  try {
    await bookingService.handlePaymongoFailed(bookingId, userEmail);
  } catch (err) {
    console.error('Payment failed handler error:', err);
  }

  const homepageUrl = process.env.FRONTEND_URL || 'http://localhost:8081';

  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

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
          setTimeout(() => {
            window.location.href = '${homepageUrl}';
          }, 2000);
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
            console.log('Popup communication blocked, redirecting normally');
          }
        </script>
      </body>
    </html>
  `);
}

async function markPaymentComplete(req, res) {
  const bookingId = parseInt(req.params.bookingId);
  const { userEmail } = req.body || {};
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  if (isNaN(bookingId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const result = await bookingService.markPaymentComplete(bookingId, userEmail);

    // Emit socket events
    emitBookingUpdate(req, userEmail);
    if (result.providerEmail && result.providerEmail !== userEmail) {
      emitBookingUpdate(req, result.providerEmail);
    }

    return sendSuccess(res, {
      message: 'Payment marked as completed',
      bookingId: result.bookingId,
    });
  } catch (err) {
    return handleServiceError(res, err, 'Mark payment complete failed');
  }
}

// ──────────────────────────────────────────────
// Provider Bookings
// ──────────────────────────────────────────────

async function getProviderBookings(req, res) {
  const providerId = req.query.providerId;
  const providerEmail = req.query.providerEmail;
  if (!providerId && !providerEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'Provider ID or email is required', 400);
  }
  try {
    const rows = await bookingService.getProviderBookings({ providerId, providerEmail });
    return sendSuccess(res, { rows });
  } catch (err) {
    return handleServiceError(res, err, 'Get provider bookings failed');
  }
}

async function markCashPaymentPaid(req, res) {
  const bookingId = parseInt(req.params.bookingId);
  const { providerEmail } = req.body || {};
  if (!providerEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
  }
  if (!Number.isFinite(bookingId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const result = await bookingService.markCashPaymentPaid(bookingId, providerEmail);

    // Emit socket events
    emitBookingUpdate(req, providerEmail);
    if (result.clientEmail && result.clientEmail !== providerEmail) {
      emitBookingUpdate(req, result.clientEmail);
    }

    return sendSuccess(res, {
      message: result.message,
      payment: result.payment,
    });
  } catch (err) {
    return handleServiceError(res, err, 'Mark payment as paid failed');
  }
}

// ──────────────────────────────────────────────
// Invoices
// ──────────────────────────────────────────────

async function getProviderInvoice(req, res) {
  const bookingId = parseInt(req.params.bookingId);
  const providerEmail = req.query.providerEmail;
  if (!providerEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
  }
  if (!Number.isFinite(bookingId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const pdfBuffer = await bookingService.generateProviderInvoice(bookingId, providerEmail);
    const invoiceNumber = `INV-${bookingId}-${Date.now()}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    return handleServiceError(res, err, 'Generate invoice failed');
  }
}

async function getUserInvoice(req, res) {
  const bookingId = parseInt(req.params.bookingId);
  const userEmail = req.query.userEmail;
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  if (!Number.isFinite(bookingId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking ID', 400);
  }
  try {
    const pdfBuffer = await bookingService.generateUserInvoice(bookingId, userEmail);
    const invoiceNumber = `INV-${bookingId}-${Date.now()}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    return handleServiceError(res, err, 'Generate user invoice failed');
  }
}

// ──────────────────────────────────────────────
// Ratings
// ──────────────────────────────────────────────

async function submitRating(req, res) {
  const bookingId = Number(req.params.bookingId);
  const serviceId = Number(req.params.serviceId);
  const { userEmail, rating, comment } = req.body || {};

  if (!Number.isFinite(bookingId) || !Number.isFinite(serviceId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking or service ID', 400);
  }
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  if (!rating || rating < 1 || rating > 5) {
    return sendError(res, 'VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
  }
  try {
    const result = await bookingService.submitRating(bookingId, serviceId, { userEmail, rating, comment });
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Submit rating failed');
  }
}

async function getRating(req, res) {
  const bookingId = Number(req.params.bookingId);
  const serviceId = Number(req.params.serviceId);
  const userEmail = req.query.email;

  if (!Number.isFinite(bookingId) || !Number.isFinite(serviceId)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid booking or service ID', 400);
  }
  if (!userEmail) {
    return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
  }
  try {
    const rating = await bookingService.getRating(bookingId, serviceId, userEmail);
    return sendSuccess(res, { rating });
  } catch (err) {
    return handleServiceError(res, err, 'Get rating failed');
  }
}

// ──────────────────────────────────────────────
// Deposit / Balance / Cancellation
// ──────────────────────────────────────────────

async function getPaymentSchedule(req, res) {
  try {
    const schedule = await bookingService.getPaymentSchedule(Number(req.params.bookingId));
    return sendSuccess(res, { rows: schedule });
  } catch (err) {
    return handleServiceError(res, err, 'Get payment schedule failed');
  }
}

async function payDeposit(req, res) {
  try {
    const result = await bookingService.payDeposit(Number(req.params.bookingId), req.user.email, req.body.paymentMethod);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Pay deposit failed');
  }
}

async function payBalance(req, res) {
  try {
    const result = await bookingService.payBalance(Number(req.params.bookingId), req.user.email, req.body.paymentMethod);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Pay balance failed');
  }
}

async function getRefundEstimate(req, res) {
  try {
    const result = await bookingService.getRefundEstimate(Number(req.params.bookingId), req.user.email);
    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Get refund estimate failed');
  }
}

async function cancelBooking(req, res) {
  try {
    const result = await bookingService.cancelBookingWithRefund(
      Number(req.params.bookingId), req.user.email, req.body.reason
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('booking-update', { bookingId: req.params.bookingId, status: 'cancelled' });
    }

    return sendSuccess(res, result);
  } catch (err) {
    return handleServiceError(res, err, 'Cancel booking failed');
  }
}

// ──────────────────────────────────────────────
module.exports = {
  // Bookings CRUD
  listBookings,
  getUserBookings,
  getUserBookingsCount,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  // Payment methods
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  // Payment processing
  createPaymongoPayment,
  processCashPayment,
  paymongoSuccess,
  paymongoFailed,
  markPaymentComplete,
  // Deposit / Balance / Cancellation
  getPaymentSchedule,
  payDeposit,
  payBalance,
  getRefundEstimate,
  cancelBooking,
  // Provider
  getProviderBookings,
  markCashPaymentPaid,
  // Invoices
  getProviderInvoice,
  getUserInvoice,
  // Ratings
  submitRating,
  getRating,
};
