# DragonPay Integration Setup Guide

This guide will help you set up DragonPay API integration for GCash payments.

## Prerequisites

1. **DragonPay Merchant Account**
   - Register at: https://www.dragonpay.ph/
   - Complete merchant verification
   - Obtain your Merchant ID and Secret Key

## Configuration

### 1. Environment Variables

Add the following environment variables to your `.env` file in the `server` directory:

```env
# DragonPay Configuration
DRAGONPAY_MERCHANT_ID=your_merchant_id_here
DRAGONPAY_SECRET_KEY=your_secret_key_here
DRAGONPAY_MODE=test  # Use 'test' for testing, 'production' for live

# API Base URL (for callbacks)
API_BASE_URL=http://localhost:3001  # Change to your production URL
```

### 2. Test Mode vs Production Mode

**Test Mode:**
- Use `DRAGONPAY_MODE=test`
- Test credentials provided by DragonPay
- Use test GCash accounts for testing
- URL: `https://test.dragonpay.ph/Pay.aspx`

**Production Mode:**
- Use `DRAGONPAY_MODE=production`
- Your actual merchant credentials
- Real GCash payments
- URL: `https://gw.dragonpay.ph/Pay.aspx`

### 3. Callback URLs

DragonPay will send payment status updates to your callback URL. Make sure:

1. Your server is accessible from the internet (use ngrok for local testing)
2. The callback URL is configured in your DragonPay merchant dashboard
3. The callback endpoint is: `https://your-domain.com/api/payments/dragonpay/callback`

### 4. Return URLs

After payment completion, users are redirected to:
- Success: `https://your-domain.com/api/payments/dragonpay/return?bookingId={id}&txnid={id}&status=S`
- Failure: `https://your-domain.com/api/payments/dragonpay/return?bookingId={id}&txnid={id}&status=F`

## Testing

### Local Testing with ngrok

1. Install ngrok: https://ngrok.com/
2. Start your server: `node server/index.js`
3. In another terminal, run: `ngrok http 3001`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
5. Update `API_BASE_URL` in `.env` to the ngrok URL
6. Configure this URL in DragonPay merchant dashboard for callbacks

### Test Payment Flow

1. Create a booking and confirm it
2. Click "PAY" button
3. You'll be redirected to DragonPay payment page
4. Use test GCash credentials (provided by DragonPay)
5. Complete payment
6. You'll be redirected back to your app
7. Payment status will be updated via callback

## Payment Status Codes

DragonPay uses the following status codes:
- `S` - Success (Payment completed)
- `F` - Failed (Payment failed)
- `P` - Pending (Payment pending)
- `U` - Unknown
- `R` - Refunded
- `K` - Cancelled
- `V` - Voided
- `A` - Authorized

## Security

- All callbacks are verified using SHA1 digest
- Transaction IDs are unique and include booking ID
- Payment amounts are validated before processing
- Only confirmed bookings can be paid

## Troubleshooting

### Callback not received
- Check if your server is accessible from internet
- Verify callback URL in DragonPay dashboard
- Check server logs for errors
- Ensure callback endpoint returns "OK"

### Payment URL not generating
- Verify DragonPay credentials in `.env`
- Check transaction ID format
- Verify booking status is "confirmed"
- Check server logs for errors

### Payment status not updating
- Verify callback endpoint is working
- Check database connection
- Verify transaction ID matches
- Check DragonPay merchant dashboard for transaction status

## Support

For DragonPay API documentation:
- https://www.dragonpay.ph/developers/
- Contact DragonPay support for merchant account issues





