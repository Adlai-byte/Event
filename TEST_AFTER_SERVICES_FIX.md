# Test Application After Services Folder is Fixed

## Services Directory is Now Present ✅

The `services` directory now exists in `/var/www/event-app/server/`.

## Step 1: Verify Services Files

```bash
cd /var/www/event-app/server

# Check services directory contents
ls -la services/

# Should show:
# - paymongo.js
# - invoice.js
# - dragonpay.js
```

## Step 2: Test Application

```bash
cd /var/www/event-app/server

# Test if it runs without errors
node index.js
```

If it starts successfully, you'll see:
```
✓ API server listening on http://localhost:3001
✓ Server accessible from network on port 3001
```

Press `Ctrl+C` to stop it.

## Step 3: Start with PM2

```bash
cd /var/www/event-app/server

# Delete old errored process
pm2 delete event-api

# Start fresh
pm2 start index.js --name event-api

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# Should show: status: online (not errored)
```

## Step 4: Check Logs

```bash
# View logs
pm2 logs event-api --lines 20

# Should show successful startup messages
```

## Step 5: Test API Endpoint

```bash
# Test if API is responding
curl http://localhost:3001/api/health

# Or test from browser (if Nginx is configured)
curl http://72.62.64.59:3001/api/health
```

## If You Still Get Errors

### Check for Other Missing Files

```bash
cd /var/www/event-app/server

# Check all required files
ls -la index.js
ls -la db.js
ls -la services/paymongo.js
ls -la services/invoice.js
ls -la .env
```

### Check Database Connection

```bash
# Test database
node test-db-connection.js
```

### Check Dependencies

```bash
# Verify all dependencies are installed
npm list --depth=0
```

## Note About SCP

**Important:** The `scp` command must be run from your **local Windows machine**, not from the VPS.

**Correct way:**
- From your local Windows PowerShell: `scp -r server/services root@72.62.64.59:/var/www/event-app/server/`

**Wrong way:**
- From VPS: `scp -r server root@72.62.64.59:...` (this won't work because `server` folder doesn't exist on VPS)

Since the services folder is now present, you should be good to test!

---

**Next Steps:**
1. Verify services files: `ls services/`
2. Test app: `node index.js`
3. Start with PM2: `pm2 start index.js --name event-api`

