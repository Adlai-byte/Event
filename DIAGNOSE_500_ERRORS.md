# Diagnose and Fix 500 Internal Server Errors

## Current Status

✅ App is connecting to VPS: `http://72.62.64.59:3001`  
✅ `/api/health` endpoint works: Returns `{"ok":true}`  
❌ Other endpoints return `500 Internal Server Error`

## Step 1: Check Server Logs (Most Important)

**On your VPS, check what the actual error is:**

```bash
# View recent error logs
pm2 logs event-api --lines 100

# Or check error log file directly
tail -100 ~/.pm2/logs/event-api-error.log
```

This will show you the **exact error message** causing the 500 errors.

## Step 2: Check Database Connection

```bash
cd /var/www/event-app/server

# Test database connection
node test-db-connection.js
```

**Expected output:** `✅ Database connection successful!`  
**If it fails:** Database credentials are wrong or database doesn't exist.

## Step 3: Check if Database Tables Exist

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

**If no tables or empty:** You need to import the database schema.

## Step 4: Import Database Schema

### Option A: Use schema.sql

```bash
# First, transfer schema.sql to VPS (from local machine)
# From local PowerShell:
cd C:\wamp64\www\FINALLYevent\Event
scp server/database/schema.sql root@72.62.64.59:/var/www/event-app/

# Then on VPS, import it:
cd /var/www/event-app
mysql -u event_user -p event_db < database/schema.sql
```

### Option B: Use event.sql (if you have data)

```bash
# Transfer event.sql
scp server/database/event.sql root@72.62.64.59:/var/www/event-app/

# Import on VPS
mysql -u event_user -p event_db < database/event.sql
```

## Step 5: Verify .env File

```bash
cd /var/www/event-app/server

# Check .env file
cat .env

# Should have:
# DB_HOST=localhost
# DB_USER=event_user
# DB_PASSWORD=your_password
# DB_NAME=event_db
# DB_PORT=3306
```

## Step 6: Restart Application

```bash
pm2 restart event-api

# Check logs
pm2 logs event-api --lines 20
```

## Common Error Messages and Fixes

### Error: "Table 'event_db.user' doesn't exist"

**Fix:** Import database schema:
```bash
mysql -u event_user -p event_db < /var/www/event-app/database/schema.sql
```

### Error: "Access denied for user 'event_user'@'localhost'"

**Fix:** Create/recreate database user:
```bash
mysql -u root -p << EOF
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### Error: "Unknown column 'column_name'"

**Fix:** Database schema is outdated. Re-import schema:
```bash
mysql -u event_user -p event_db < /var/www/event-app/database/schema.sql
```

### Error: "ECONNREFUSED"

**Fix:** MySQL service not running:
```bash
systemctl status mysql
systemctl start mysql
```

## Quick Diagnostic Script

Run this on your VPS to check everything:

```bash
cd /var/www/event-app/server

echo "=== 1. Database Connection ==="
node test-db-connection.js

echo ""
echo "=== 2. Check Tables ==="
mysql -u event_user -p event_db -e "SHOW TABLES;" 2>/dev/null | head -20

echo ""
echo "=== 3. Check .env ==="
cat .env | grep DB_

echo ""
echo "=== 4. PM2 Status ==="
pm2 status

echo ""
echo "=== 5. Recent Errors ==="
pm2 logs event-api --lines 10 --nostream | grep -i error
```

## Most Likely Solution

**Import the database schema:**

1. **Transfer schema.sql:**
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

3. **Restart:**
   ```bash
   pm2 restart event-api
   ```

---

**First Action:** Check PM2 logs: `pm2 logs event-api --lines 50`

