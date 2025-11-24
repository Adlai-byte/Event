# PayMongo Integration Setup Guide

This guide will help you set up PayMongo API integration for GCash payments.

## Prerequisites

1. **PayMongo Account**
   - Register at: https://www.paymongo.com/
   - Complete business verification
   - Activate your account

2. **Enable GCash**
   - GCash activation may take up to 7 business days
   - Subject to approval by PayMongo's financial partners
   - Check your PayMongo dashboard for GCash activation status

## Configuration

### 1. Environment Variables

Add the following environment variables to your `.env` file in the `server` directory:

```env
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PAYMONGO_MODE=test  # Use 'test' for testing, 'live' for production

# API Base URL (for redirects)
API_BASE_URL=http://localhost:3001  # Change to your production URL
```

### 2. Get Your API Keys

1. Log in to PayMongo Dashboard: https://dashboard.paymongo.com/
2. Go to **Settings** > **API Keys**
3. Copy your **Secret Key** (starts with `sk_`)
4. Copy your **Public Key** (starts with `pk_`) - optional for server-side

**Test vs Live Keys:**
- Test keys start with `sk_test_` and `pk_test_`
- Live keys start with `sk_live_` and `pk_live_`

### 3. Test Mode vs Live Mode

**Test Mode:**
- Use `PAYMONGO_MODE=test`
- Use test API keys (`sk_test_...`)
- Test payments won't charge real money
- Perfect for development

**Live Mode:**
- Use `PAYMONGO_MODE=live`
- Use live API keys (`sk_live_...`)
- Real payments will be processed
- Only use after thorough testing

## Payment Flow

1. **User clicks Pay** → Frontend calls `/api/bookings/:id/pay`
2. **Backend creates PayMongo source** → Returns checkout URL
3. **User redirected to PayMongo** → GCash payment page
4. **User completes payment** → Redirected back to your app
5. **Payment status updated** → Via webhook or redirect callback

## GCash Deep Links

GCash requires users to complete payments through the GCash mobile app. PayMongo handles this automatically:

- **Web:** Users are redirected to GCash web payment page
- **Mobile:** Deep links (`gcash://`) automatically open GCash app
- **No code changes needed** for basic web integration

## Webhook Setup (Optional but Recommended)

For real-time payment status updates:

1. Go to PayMongo Dashboard > **Settings** > **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/payments/paymongo/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Save webhook

**For Local Testing:**
- Use ngrok to expose your local server
- Update webhook URL in PayMongo dashboard

## Testing

### Test Payment Flow

1. Create a booking and confirm it
2. Click "PAY" button
3. You'll be redirected to PayMongo payment page
4. Use test GCash credentials (provided by PayMongo)
5. Complete payment
6. You'll be redirected back to your app
7. Payment status will be updated

### Test Cards/Accounts

PayMongo provides test credentials in their dashboard for testing various scenarios.

## Troubleshooting

### "PayMongo credentials not configured" Error
- Check that `.env` file exists in `server` folder
- Verify `PAYMONGO_SECRET_KEY` is set correctly
- Restart server after updating `.env`

### Payment URL not generating
- Verify PayMongo credentials in `.env`
- Check server logs for detailed errors
- Ensure GCash is enabled in your PayMongo account

### GCash not showing as payment option
- GCash may not be activated yet (can take 7 business days)
- Check PayMongo dashboard for activation status
- Contact PayMongo support if needed

### Payment status not updating
- Verify webhook is configured (if using webhooks)
- Check redirect URLs are correct
- Review server logs for webhook/callback errors

## Support

- **PayMongo Documentation:** https://developers.paymongo.com/
- **PayMongo Dashboard:** https://dashboard.paymongo.com/
- **PayMongo Support:** support@paymongo.com
- **GCash Deep Links Guide:** https://developers.paymongo.com/docs/handle-gcash-deep-links

## Migration from DragonPay

✅ **Completed:**
- Replaced DragonPay service with PayMongo
- Updated payment endpoints
- Updated environment variables
- Updated documentation

**Next Steps:**
1. Create PayMongo account
2. Get API keys
3. Add to `.env` file
4. Test payment flow
5. Enable GCash in PayMongo dashboard


