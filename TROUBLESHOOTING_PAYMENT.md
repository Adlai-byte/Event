# Payment Troubleshooting Guide

## Common Issues and Solutions

### 1. "Payment Failed" Error When Clicking Pay Button

**Possible Causes:**
- Server not running
- DragonPay credentials not configured
- Network connection issues
- API endpoint not accessible

**Solutions:**
1. **Check Server Status:**
   ```bash
   # Make sure your Node.js server is running
   cd server
   node index.js
   ```

2. **Verify Environment Variables:**
   Create or check `server/.env` file:
   ```env
   DRAGONPAY_MERCHANT_ID=your_merchant_id
   DRAGONPAY_SECRET_KEY=your_secret_key
   DRAGONPAY_MODE=test
   API_BASE_URL=http://localhost:3001
   ```

3. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for error messages when clicking Pay
   - Check Network tab for failed API calls

4. **Test API Endpoint:**
   ```bash
   # Test if server is responding
   curl http://localhost:3001/api/health
   ```

### 2. Payment URL Not Generated

**Check:**
1. **Backend Logs:**
   - Check server console for errors
   - Look for "Process payment failed" messages

2. **Database Connection:**
   - Verify database is running
   - Check if booking exists in database
   - Verify booking status is "confirmed"

3. **DragonPay Configuration:**
   - Verify merchant ID and secret key are correct
   - Check if using test or production mode
   - Ensure credentials match DragonPay dashboard

### 3. Redirect to DragonPay Not Working

**For Web:**
- Check browser console for errors
- Verify `window.location.href` is not blocked
- Try opening URL manually in new tab

**For Mobile:**
- Check if Linking is properly imported
- Verify app has internet permission
- Test if URL can be opened manually

### 4. DragonPay Page Shows Error

**Common DragonPay Errors:**
- **Invalid Merchant ID:** Check your merchant ID in `.env`
- **Invalid Digest:** Secret key might be wrong
- **Invalid Amount:** Amount format must be correct (e.g., "50000.00")

**Solutions:**
1. **Verify Credentials:**
   - Double-check merchant ID and secret key
   - Ensure no extra spaces in `.env` file
   - Restart server after changing `.env`

2. **Check Digest Format:**
   DragonPay digest format: `merchantid:txnid:amount:ccy:description:email:secretkey`
   - Verify all fields are included
   - Check for special characters in description

### 5. Payment Status Not Updating

**Check:**
1. **Callback URL:**
   - Verify callback URL is accessible from internet
   - Use ngrok for local testing
   - Check DragonPay dashboard for callback configuration

2. **Server Logs:**
   - Look for "DragonPay callback" messages
   - Check for "Invalid callback" errors

3. **Database:**
   - Verify payment record was created
   - Check payment status in database
   - Ensure transaction ID matches

### 6. Testing Without Real DragonPay Account

**For Development:**
1. Use test mode with test credentials
2. DragonPay provides test merchant ID and secret key
3. Test payments won't charge real money

**Test Credentials (if available from DragonPay):**
```env
DRAGONPAY_MERCHANT_ID=TESTMERCHANT
DRAGONPAY_SECRET_KEY=TEST_SECRET_KEY
DRAGONPAY_MODE=test
```

## Debugging Steps

### Step 1: Check Server Logs
```bash
# Start server with verbose logging
cd server
node index.js
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors when clicking Pay button
4. Check Network tab for API requests

### Step 3: Test API Directly
```bash
# Test payment endpoint (replace with actual values)
curl -X POST http://localhost:3001/api/bookings/1/pay \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "user@example.com",
    "paymentMethodId": 1,
    "amount": 50000
  }'
```

### Step 4: Verify Database
```sql
-- Check if booking exists and is confirmed
SELECT * FROM booking WHERE idbooking = 1;

-- Check if payment record was created
SELECT * FROM payment WHERE p_booking_id = 1;
```

## Quick Checklist

- [ ] Server is running on port 3001
- [ ] Database is running and accessible
- [ ] `.env` file exists with DragonPay credentials
- [ ] Booking status is "confirmed"
- [ ] User has linked GCash account
- [ ] Network connection is active
- [ ] Browser console shows no errors
- [ ] API endpoint returns payment URL

## Getting Help

If issues persist:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test API endpoints directly with curl or Postman
4. Check DragonPay merchant dashboard for transaction status
5. Review DragonPay API documentation for latest requirements





