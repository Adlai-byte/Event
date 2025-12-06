# Cleanup and Start Application

## Current Status

✅ Files are now in the correct location: `/var/www/event-app/server/`
✅ `index.js` is present
✅ The nested `server` directory is empty

## Final Cleanup

### Step 1: Remove Empty Nested Directory

```bash
cd /var/www/event-app/server

# Check if nested server directory is empty
ls server/

# If empty or has minimal files, remove it
rmdir server
# or if it has hidden files:
rm -rf server
```

### Step 2: Verify Files Are in Place

```bash
cd /var/www/event-app/server

# Check essential files
ls -la index.js
ls -la package.json
ls -la db.js

# Should all show files exist
```

### Step 3: Install Dependencies (if not done)

```bash
cd /var/www/event-app/server

# Install Node.js packages
npm install --production
```

### Step 4: Start Application with PM2

```bash
cd /var/www/event-app/server

# Verify you're in the right directory
pwd  # Should show: /var/www/event-app/server

# Verify index.js exists
ls index.js

# Start the application
pm2 start index.js --name event-api

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs event-api
```

## Quick One-Liner

```bash
cd /var/www/event-app/server && \
rmdir server 2>/dev/null || rm -rf server && \
npm install --production && \
pm2 start index.js --name event-api && \
pm2 save && \
pm2 status
```

## Verify Everything Works

```bash
# Check PM2 status
pm2 status

# Should show:
# ┌─────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name        │ status  │ restart │ uptime   │
# ├─────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ event-api   │ online  │ 0       │ 0s       │
# └─────┴─────────────┴─────────┴─────────┴──────────┘

# Check logs for any errors
pm2 logs event-api --lines 20

# Test API endpoint
curl http://localhost:3001/api/health
```

## If PM2 Still Can't Find index.js

If you still get "Script not found" error:

```bash
# Use absolute path
pm2 start /var/www/event-app/server/index.js --name event-api

# Or verify the exact path
ls -la /var/www/event-app/server/index.js
```

---

**Next Steps After Starting:**
1. Configure Nginx (if not done)
2. Setup SSL certificate (if you have a domain)
3. Test API from browser

