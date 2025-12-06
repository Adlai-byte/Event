# Fix: Port 3001 Already in Use (EADDRINUSE)

## Error

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
```

Port 3001 is already being used by another process.

## Quick Fix

### Step 1: Find What's Using Port 3001

```bash
# Check what process is using port 3001
lsof -i :3001

# Or use netstat
netstat -tlnp | grep 3001

# Or use ss
ss -tlnp | grep 3001
```

### Step 2: Kill the Process

**Option A: If it's a PM2 process**

```bash
# Stop all PM2 processes
pm2 stop all

# Or stop specific process
pm2 stop event-api

# Delete the process
pm2 delete event-api
```

**Option B: If it's another process**

```bash
# Find the process ID (PID) from Step 1
# Then kill it
kill -9 <PID>

# Example: if PID is 1234
kill -9 1234
```

### Step 3: Verify Port is Free

```bash
# Check if port 3001 is now free
lsof -i :3001

# Should show nothing (port is free)
```

### Step 4: Start Application Again

```bash
cd /var/www/event-app/server

# Start with PM2
pm2 start index.js --name event-api
pm2 save
pm2 status
```

## Complete Fix Script

Run this to fix everything:

```bash
# Find and kill process on port 3001
PID=$(lsof -t -i:3001)
if [ ! -z "$PID" ]; then
    echo "Killing process $PID on port 3001"
    kill -9 $PID
fi

# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Verify port is free
lsof -i :3001

# Start application
cd /var/www/event-app/server
pm2 start index.js --name event-api
pm2 save
pm2 status
```

## Alternative: Change Port

If you can't free port 3001, change the port:

```bash
cd /var/www/event-app/server

# Edit .env file
nano .env

# Change PORT from 3001 to 3002
# PORT=3002

# Then start
pm2 start index.js --name event-api
```

## Check PM2 Processes

```bash
# List all PM2 processes
pm2 list

# Stop all
pm2 stop all

# Delete all
pm2 delete all

# Restart all
pm2 restart all
```

## Most Common Cause

Usually it's a previous PM2 process still running:

```bash
# Stop and delete all PM2 processes
pm2 stop all
pm2 delete all

# Start fresh
cd /var/www/event-app/server
pm2 start index.js --name event-api
pm2 save
```

---

**Quick Fix:**
```bash
pm2 stop all && pm2 delete all && cd /var/www/event-app/server && pm2 start index.js --name event-api && pm2 save
```

