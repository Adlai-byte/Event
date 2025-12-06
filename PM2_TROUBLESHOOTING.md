# PM2 "Script not found" Troubleshooting

## Error: Script not found

If you see:
```
[PM2] [ERROR] Script not found: /var/www/event-app/server/index.js
```

## Quick Fix Steps

### Step 1: Verify Current Directory

```bash
# Check where you are
pwd

# Should show: /var/www/event-app/server
# If not, navigate there:
cd /var/www/event-app/server
```

### Step 2: Check if Files Exist

```bash
# List all files
ls -la

# Check specifically for index.js
ls -la index.js

# Check for other important files
ls -la package.json
ls -la db.js
```

### Step 3: Find Where Files Actually Are

```bash
# Search for index.js on the VPS
find /var/www -name "index.js" -type f

# Check if server folder exists
ls -la /var/www/event-app/

# Check server directory structure
ls -la /var/www/event-app/server/
```

## Common Causes and Solutions

### Cause 1: Files Not Transferred

**Problem:** The `server` folder wasn't transferred correctly to the VPS.

**Solution:** Re-transfer the files:

**From your local Windows machine (PowerShell):**
```powershell
cd C:\wamp64\www\FINALLYevent\Event
scp -r server root@72.62.64.59:/var/www/event-app/
```

**Then on VPS, verify:**
```bash
ls -la /var/www/event-app/server/index.js
```

### Cause 2: Wrong Directory Structure

**Problem:** Files might be in a nested directory.

**Check:**
```bash
# Check if there's a nested server/server structure
ls -la /var/www/event-app/server/server/

# If files are there, move them up:
mv /var/www/event-app/server/server/* /var/www/event-app/server/
rmdir /var/www/event-app/server/server
```

### Cause 3: Files in Different Location

**Problem:** Files might have been transferred to a different location.

**Find them:**
```bash
# Search entire VPS for index.js
find / -name "index.js" -type f 2>/dev/null

# Or search in common locations
ls -la /var/www/
ls -la /root/
ls -la /home/
```

### Cause 4: Wrong Path in PM2 Command

**Problem:** You might be running PM2 from the wrong directory.

**Solution:**
```bash
# Always navigate to server directory first
cd /var/www/event-app/server

# Verify you're in the right place
pwd
ls index.js

# Then start PM2
pm2 start index.js --name event-api
```

## Complete File Transfer Checklist

Verify these files exist in `/var/www/event-app/server/`:

```bash
cd /var/www/event-app/server

# Essential files
ls -la index.js          # Main server file
ls -la package.json      # Dependencies
ls -la db.js            # Database connection
ls -la .env             # Environment variables (you create this)

# Directories
ls -la services/        # PayMongo, invoice services
ls -la uploads/         # File uploads directory
ls -la public/          # Public files
```

## Re-transfer Files (Complete Process)

If files are missing, re-transfer:

### Step 1: On Your Local Machine

```powershell
# Navigate to project
cd C:\wamp64\www\FINALLYevent\Event

# Verify server folder exists locally
dir server\index.js

# Transfer entire server folder
scp -r server root@72.62.64.59:/var/www/event-app/
```

### Step 2: On VPS - Verify Transfer

```bash
# Check if files arrived
ls -la /var/www/event-app/server/

# Should see:
# - index.js
# - package.json
# - db.js
# - services/
# - etc.
```

### Step 3: Install Dependencies

```bash
cd /var/www/event-app/server
npm install --production
```

### Step 4: Start with PM2

```bash
# Make sure you're in the right directory
cd /var/www/event-app/server

# Verify index.js exists
ls index.js

# Start PM2
pm2 start index.js --name event-api
pm2 save
pm2 status
```

## Alternative: Use Absolute Path

If files are in a different location, use absolute path:

```bash
# Find where index.js actually is
find /var/www -name "index.js" -type f

# Then use full path in PM2
pm2 start /full/path/to/index.js --name event-api
```

## Verify PM2 is Working

After starting:

```bash
# Check status
pm2 status

# Should show:
# ┌─────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name        │ status  │ restart │ uptime   │
# ├─────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ event-api   │ online  │ 0       │ 0s       │
# └─────┴─────────────┴─────────┴─────────┴──────────┘

# Check logs
pm2 logs event-api

# Should show server starting messages
```

## Quick Diagnostic Commands

Run these to diagnose the issue:

```bash
# 1. Check current directory
pwd

# 2. List files in current directory
ls -la

# 3. Check if index.js exists
test -f index.js && echo "index.js exists" || echo "index.js NOT found"

# 4. Check server directory structure
tree /var/www/event-app/server/ 2>/dev/null || find /var/www/event-app/server -type f | head -20

# 5. Check file permissions
ls -la /var/www/event-app/server/index.js

# 6. Try running directly (to see actual error)
cd /var/www/event-app/server
node index.js
```

## Still Having Issues?

1. **Verify file transfer completed:**
   - Check file sizes match
   - Check file count matches

2. **Check permissions:**
   ```bash
   chmod +x /var/www/event-app/server/index.js
   chown -R www-data:www-data /var/www/event-app
   ```

3. **Check Node.js can read the file:**
   ```bash
   cd /var/www/event-app/server
   node -e "console.log(require('fs').existsSync('index.js'))"
   # Should output: true
   ```

---

**Most Common Fix:** Re-transfer the server folder using SCP from your local machine.

