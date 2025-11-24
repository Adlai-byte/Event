# How to Fix "Merchant info not found" Error

## The Problem

You're seeing this error because the system is using default test credentials (`TESTMERCHANT`) that don't exist in DragonPay's system.

## Solution: Get Real DragonPay Credentials

### Step 1: Register with DragonPay

1. Go to: **https://www.dragonpay.ph/**
2. Click "Sign Up" or "Register as Merchant"
3. Complete the registration form
4. Verify your email address
5. Complete merchant verification (may require business documents)

### Step 2: Get Your Credentials

After registration, DragonPay will provide:
- **Merchant ID** - Your unique merchant identifier
- **Secret Key** - Your secret key for API authentication

These are usually found in:
- Your DragonPay merchant dashboard
- Email confirmation from DragonPay
- Under "API Settings" or "Integration" section

### Step 3: Configure Your Application

1. **Create `.env` file** in the `server` directory (if it doesn't exist)

2. **Add your DragonPay credentials:**

```env
# DragonPay Configuration
DRAGONPAY_MERCHANT_ID=your_actual_merchant_id_here
DRAGONPAY_SECRET_KEY=your_actual_secret_key_here
DRAGONPAY_MODE=test

# API Base URL (for callbacks)
API_BASE_URL=http://localhost:3001
```

**Important:**
- Replace `your_actual_merchant_id_here` with your real Merchant ID
- Replace `your_actual_secret_key_here` with your real Secret Key
- Use `test` mode for testing, `production` for live payments

### Step 4: Restart Your Server

After adding credentials, restart your Node.js server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd server
node index.js
```

### Step 5: Test Again

1. Click the Pay button again
2. You should now be redirected to DragonPay with your merchant account
3. Complete the payment flow

## For Testing Without Real Account

If you don't have a DragonPay account yet, you can:

1. **Register for a test account** - DragonPay may provide test credentials
2. **Contact DragonPay support** - They can provide test merchant credentials
3. **Wait for approval** - Real merchant accounts may take time to approve

## Quick Checklist

- [ ] Registered with DragonPay
- [ ] Received Merchant ID and Secret Key
- [ ] Created `server/.env` file
- [ ] Added credentials to `.env` file
- [ ] Restarted server
- [ ] Tested payment flow

## Need Help?

- **DragonPay Support:** https://www.dragonpay.ph/contact
- **DragonPay Documentation:** https://www.dragonpay.ph/developers/
- **Check server logs** for detailed error messages

## Example .env File

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=event

# Server
PORT=3001
API_BASE_URL=http://localhost:3001

# DragonPay (REPLACE WITH YOUR ACTUAL CREDENTIALS)
DRAGONPAY_MERCHANT_ID=DP123456789
DRAGONPAY_SECRET_KEY=your_secret_key_here
DRAGONPAY_MODE=test
```





