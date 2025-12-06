# Fix: 500 Internal Server Error on API Endpoints

## Problem

Your app is connecting to the VPS (`http://72.62.64.59:3001`), but API endpoints are returning `500 Internal Server Error`.

## Root Cause

500 errors usually mean:
1. **Database connection failed** - Most common
2. **Database tables don't exist** - Tables not created
3. **SQL query errors** - Syntax or missing columns
4. **Missing environment variables** - Database credentials not set

## Step 1: Check Server Logs on VPS

**On your VPS, check PM2 logs to see the actual error:**

```bash
# View recent error logs
pm2 logs event-api --lines 50

# Or check error log file
cat ~/.pm2/logs/event-api-error.log | tail -50
```

This will show you the **exact error message** causing the 500 errors.

## Step 2: Check Database Connection

**On your VPS:**

```bash
cd /var/www/event-app/server

# Test database connection
node test-db-connection.js
```

If this fails, your database isn't configured correctly.

## Step 3: Verify Database Tables Exist

**On your VPS:**

```bash
mysql -u event_user -p event_db

# Then run:
SHOW TABLES;
```

**Expected tables:**
- `user`
- `service`
- `service_image`
- `booking`
- `payment`
- etc.

If tables are missing, you need to import the database schema.

## Step 4: Import Database Schema

**On your VPS:**

```bash
# First, transfer schema.sql to VPS (from local machine)
# From local PowerShell:
scp server/database/schema.sql root@72.62.64.59:/var/www/event-app/

# Then on VPS, import it:
cd /var/www/event-app
mysql -u event_user -p event_db < database/schema.sql
```

## Step 5: Check .env File

**On your VPS:**

```bash
cd /var/www/event-app/server

# Check .env file exists and has correct values
cat .env | grep DB_

# Should show:
# DB_HOST=localhost
# DB_USER=event_user
# DB_PASSWORD=your_password
# DB_NAME=event_db
```

## Common 500 Error Causes

### Cause 1: Database Connection Failed

**Error in logs:** `ECONNREFUSED` or `Access denied`

**Fix:**
```bash
# Test connection
mysql -u event_user -p event_db

# If fails, recreate user:
mysql -u root -p << EOF
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### Cause 2: Tables Don't Exist

**Error in logs:** `Table 'event_db.service' doesn't exist`

**Fix:**
```bash
# Import schema
mysql -u event_user -p event_db < /var/www/event-app/database/schema.sql
```

### Cause 3: Missing Columns

**Error in logs:** `Unknown column 'column_name'`

**Fix:**
- Check if schema.sql was fully imported
- Run migrations if available

## Quick Diagnostic Script

Run this on your VPS:

```bash
cd /var/www/event-app/server

echo "=== Database Connection ==="
node test-db-connection.js

echo ""
echo "=== Check Tables ==="
mysql -u event_user -p event_db -e "SHOW TABLES;" 2>/dev/null

echo ""
echo "=== Check .env ==="
cat .env | grep DB_

echo ""
echo "=== PM2 Logs (last 20 lines) ==="
pm2 logs event-api --lines 20 --nostream
```

## Most Likely Fix

**Import the database schema:**

1. **Transfer schema.sql to VPS:**
   ```powershell
   # From local PowerShell
   cd C:\wamp64\www\FINALLYevent\Event
   scp server/database/schema.sql root@72.62.64.59:/var/www/event-app/
   ```

2. **Import on VPS:**
   ```bash
   cd /var/www/event-app
   mysql -u event_user -p event_db < database/schema.sql
   ```

3. **Restart application:**
   ```bash
   pm2 restart event-api
   ```

---

**First Step:** Check PM2 logs to see the exact error: `pm2 logs event-api --lines 50`

