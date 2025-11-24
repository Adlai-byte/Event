# How to Fix "PayMongo credentials not configured" Error

## Quick Fix

The error you're seeing means the server can't find your PayMongo credentials. Here's how to fix it:

### Step 1: Create `.env` file

1. Go to the `server` folder
2. Create a new file named `.env` (note the dot at the beginning)
3. Copy the contents from `.env.template` or use the template below

### Step 2: Add Your PayMongo Credentials

**Option A: If you have PayMongo account:**
1. Log in to your PayMongo dashboard: https://dashboard.paymongo.com/
2. Go to Settings > API Keys
3. Get your Secret Key (starts with `sk_`)
4. Add it to the `.env` file:

```env
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_MODE=test
```

**Option B: If you don't have PayMongo account yet:**
1. Register at: https://www.paymongo.com/
2. Complete business verification
3. Get your API keys from the dashboard
4. Add them to `.env` file

### Step 3: Restart Your Server

After creating/updating the `.env` file:

1. Stop your server (Ctrl+C in the terminal)
2. Restart it:
   ```bash
   cd server
   node index.js
   ```

### Step 4: Test Again

Try clicking the Pay button again. The error should be gone if credentials are correct.

## Complete .env File Template

Create `server/.env` with this content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=event

# Server Configuration
PORT=3001
API_BASE_URL=http://localhost:3001

# PayMongo Configuration
# IMPORTANT: Replace with your actual PayMongo API keys
# Get these from: https://dashboard.paymongo.com/
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PAYMONGO_MODE=test

# Node Environment
NODE_ENV=development
```

## Important Notes

1. **File name must be exactly `.env`** (with the dot at the beginning)
2. **No spaces around the `=` sign** in environment variables
3. **Don't use quotes** around values (unless the value itself contains spaces)
4. **Restart server** after changing `.env` file
5. **Keep `.env` file secret** - never commit it to git

## Troubleshooting

### Error still appears after adding credentials?
- Check that `.env` file is in the `server` folder (not root folder)
- Verify no typos in variable names
- Make sure you restarted the server
- Check server console for any errors

### Don't have PayMongo credentials?
- Register at: https://www.paymongo.com/
- Contact PayMongo support if you need help: support@paymongo.com

### Testing without real credentials?
- You can't test payments without real PayMongo credentials
- PayMongo provides test API keys after registration
- Register at https://www.paymongo.com/ to get test keys

## What I've Fixed

✅ Added `dotenv` configuration to `server/index.js`
✅ Added `dotenv` configuration to `server/db.js`
✅ Replaced DragonPay with PayMongo integration
✅ Created PayMongo service module

Now you just need to:
1. Create the `.env` file
2. Add your PayMongo API keys
3. Restart the server

