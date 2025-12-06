# PM2 Application Error Troubleshooting

## Problem: Application Status "errored"

When PM2 shows status `errored` with many restarts, the application is crashing on startup.

## Step 1: Check Error Logs

```bash
# View recent error logs
pm2 logs event-api --lines 50

# Or view all logs
pm2 logs event-api

# Check error log file directly
cat ~/.pm2/logs/event-api-error.log
```

## Common Errors and Fixes

### Error 1: Missing Dependencies

**Symptom:** `Cannot find module 'express'` or similar

**Fix:**
```bash
cd /var/www/event-app/server
npm install --production
```

### Error 2: Missing .env File

**Symptom:** `DB_HOST is not defined` or database connection errors

**Fix:**
```bash
cd /var/www/event-app/server

# Create .env file
nano .env
```

Add these contents (replace with your actual values):
```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=your_password_here
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

### Error 3: Database Connection Failed

**Symptom:** `ECONNREFUSED` or `Access denied for user`

**Fix:**
```bash
# Test database connection
mysql -u event_user -p event_db

# If connection fails, check:
# 1. MySQL is running
systemctl status mysql

# 2. Database exists
mysql -u root -p -e "SHOW DATABASES;"

# 3. User has permissions
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='event_user';"
```

### Error 4: Port Already in Use

**Symptom:** `EADDRINUSE: address already in use :::3001`

**Fix:**
```bash
# Check what's using port 3001
lsof -i :3001
# or
netstat -tlnp | grep 3001

# Kill the process if needed
kill -9 <PID>

# Or change port in .env file
nano /var/www/event-app/server/.env
# Change: PORT=3002
```

### Error 5: Missing Required Files

**Symptom:** `Cannot find module './db'` or similar

**Fix:**
```bash
cd /var/www/event-app/server

# Verify all required files exist
ls db.js
ls services/paymongo.js
ls services/invoice.js

# If missing, re-transfer files
```

### Error 6: Syntax Error in Code

**Symptom:** `SyntaxError: Unexpected token` or similar

**Fix:**
```bash
# Test the file directly
cd /var/www/event-app/server
node index.js

# This will show the exact error
```

## Step 2: Stop and Restart with Fresh Logs

```bash
# Stop the errored process
pm2 stop event-api
pm2 delete event-api

# Clear logs
pm2 flush

# Start fresh
cd /var/www/event-app/server
pm2 start index.js --name event-api

# Watch logs in real-time
pm2 logs event-api
```

## Step 3: Test Application Directly

Before using PM2, test if the app runs directly:

```bash
cd /var/www/event-app/server

# Run directly to see errors
node index.js
```

This will show the exact error message.

## Step 4: Check Environment Variables

```bash
cd /var/www/event-app/server

# Check if .env file exists
ls -la .env

# View .env contents (be careful with passwords)
cat .env

# Test if Node.js can read it
node -e "require('dotenv').config(); console.log(process.env.DB_HOST);"
```

## Step 5: Verify Database Setup

```bash
# Check MySQL is running
systemctl status mysql

# Test database connection
mysql -u event_user -p event_db

# If connection fails, recreate database/user
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS event_db;
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

## Quick Diagnostic Commands

Run these to diagnose:

```bash
cd /var/www/event-app/server

# 1. Check Node.js version
node --version

# 2. Check if dependencies are installed
ls node_modules/express

# 3. Check if .env exists
ls -la .env

# 4. Test database connection
node test-db-connection.js

# 5. Try running directly
node index.js
```

## Most Common Fix

Usually the issue is a missing `.env` file:

```bash
cd /var/www/event-app/server

# Create .env file
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=your_password_here
DB_NAME=event_db
DB_PORT=3006

PORT=3001
NODE_ENV=production
API_BASE_URL=http://72.62.64.59:3001

PAYMONGO_SECRET_KEY=sk_live_your_key
PAYMONGO_PUBLIC_KEY=pk_live_your_key
PAYMONGO_MODE=live
EOF

# Edit with your actual values
nano .env

# Then restart
pm2 restart event-api
```

## After Fixing: Verify

```bash
# Check PM2 status
pm2 status

# Should show: status: online (not errored)

# Check logs
pm2 logs event-api --lines 20

# Test API
curl http://localhost:3001/api/health
```

---

**First Step:** Always check the logs: `pm2 logs event-api`

