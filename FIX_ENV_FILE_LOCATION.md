# Fix: .env File Location Issue

## Problem

Your `.env` file shows `DB_USER=event_user`, but the error still says `'root'@'localhost'`.

This means the `.env` file is in the wrong location or not being read.

## Issue Found

Looking at `server/db.js`:
- It loads `.env` from: `path.join(__dirname, '..', '.env')`
- This means: `/var/www/event-app/.env` (parent of server directory)
- But your `.env` file is probably in: `/var/www/event-app/server/.env`

## Solution: Move or Create .env in Correct Location

### Option 1: Move .env File (Recommended)

```bash
# Check where .env currently is
ls -la /var/www/event-app/server/.env
ls -la /var/www/event-app/.env

# Move it to the correct location (parent directory)
mv /var/www/event-app/server/.env /var/www/event-app/.env

# Verify
cat /var/www/event-app/.env | grep DB_
```

### Option 2: Create .env in Parent Directory

```bash
cd /var/www/event-app

# Create .env file here (not in server/)
nano .env
```

Add this content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=YourSecurePassword123!
DB_NAME=event_db
DB_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production
API_BASE_URL=http://72.62.64.59:3001

# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_live_your_key_here
PAYMONGO_PUBLIC_KEY=pk_live_your_key_here
PAYMONGO_MODE=live
```

**Important:** 
- Replace `YourSecurePassword123!` with your actual database password
- File should be at: `/var/www/event-app/.env` (NOT in server/ subdirectory)

### Step 3: Verify .env is Being Read

```bash
cd /var/www/event-app/server

# Test database connection
node test-db-connection.js
```

Should now use `event_user` instead of `root`.

### Step 4: Restart Application

```bash
pm2 restart event-api

# Check logs
pm2 logs event-api --lines 20
```

## Quick Fix

```bash
# Create .env in correct location
cd /var/www/event-app

cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=YourPasswordHere
DB_NAME=event_db
DB_PORT=3306

PORT=3001
NODE_ENV=production
API_BASE_URL=http://72.62.64.59:3001

PAYMONGO_SECRET_KEY=sk_live_your_key
PAYMONGO_PUBLIC_KEY=pk_live_your_key
PAYMONGO_MODE=live
EOF

# Edit with your actual password
nano .env

# Test
cd server
node test-db-connection.js
```

## Verify File Locations

```bash
# Check both locations
echo "=== .env in server/ ==="
cat /var/www/event-app/server/.env 2>/dev/null | head -5 || echo "File not found"

echo ""
echo "=== .env in parent ==="
cat /var/www/event-app/.env 2>/dev/null | head -5 || echo "File not found"

echo ""
echo "=== What db.js expects ==="
echo "Looking for: /var/www/event-app/.env (parent of server/)"
```

---

**Action:** Move your `.env` file from `/var/www/event-app/server/.env` to `/var/www/event-app/.env`

