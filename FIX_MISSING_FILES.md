# Fix: Missing index.js File

## Problem Confirmed

The `index.js` file is missing from `/var/www/event-app/server/`.

## Solution: Re-transfer Server Files

### Step 1: Check What Files Are Currently There

On your VPS, run:

```bash
cd /var/www/event-app/server
ls -la
```

This will show what files (if any) are in the directory.

### Step 2: Check Directory Structure

```bash
# Check parent directory
ls -la /var/www/event-app/

# Check if there's a nested structure
find /var/www/event-app -type f -name "*.js" | head -10
```

### Step 3: Re-transfer Files from Local Machine

**From your Windows PowerShell (NOT from VPS):**

```powershell
# Navigate to your project directory
cd C:\wamp64\www\FINALLYevent\Event

# Verify server folder exists locally
dir server\index.js

# If it exists, transfer the entire server folder
scp -r server root@72.62.64.59:/var/www/event-app/
```

**Important:**
- Run this from your **local Windows machine**, not from the VPS
- You'll be prompted for the root password
- This will overwrite/replace files in `/var/www/event-app/server/`

### Step 4: Verify Transfer on VPS

After transfer completes, on your VPS:

```bash
# Navigate to server directory
cd /var/www/event-app/server

# Check if index.js now exists
ls -la index.js

# Should show something like:
# -rw-r--r-- 1 root root 12345 Nov 30 13:00 index.js

# List all files to verify
ls -la
```

### Step 5: Verify Essential Files

Make sure these files exist:

```bash
cd /var/www/event-app/server

# Essential files
ls index.js          # Main server file
ls package.json      # Dependencies
ls db.js            # Database connection
ls -d services/     # Services directory
ls -d uploads/      # Uploads directory
```

### Step 6: Install Dependencies

```bash
cd /var/www/event-app/server

# Install Node.js packages
npm install --production
```

### Step 7: Start with PM2

```bash
cd /var/www/event-app/server

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

## Alternative: Check if Files Are Elsewhere

If re-transfer doesn't work, check if files are in a different location:

```bash
# Search entire VPS for index.js
find /var/www -name "index.js" -type f

# Check common locations
ls -la /var/www/event-app/server/server/  # Nested?
ls -la /root/server/                      # Wrong location?
```

## If Files Are in Wrong Location

If you find files in `/var/www/event-app/server/server/` (nested):

```bash
# Move files up one level
cd /var/www/event-app/server
mv server/* .
rmdir server

# Verify
ls index.js
```

## Complete File Checklist

After transfer, verify these exist:

```bash
cd /var/www/event-app/server

# Required files
[ -f index.js ] && echo "✅ index.js" || echo "❌ index.js MISSING"
[ -f package.json ] && echo "✅ package.json" || echo "❌ package.json MISSING"
[ -f db.js ] && echo "✅ db.js" || echo "❌ db.js MISSING"

# Required directories
[ -d services ] && echo "✅ services/" || echo "❌ services/ MISSING"
[ -d uploads ] && echo "✅ uploads/" || echo "❌ uploads/ MISSING"
[ -d public ] && echo "✅ public/" || echo "❌ public/ MISSING"
```

## Troubleshooting Transfer Issues

### Issue: SCP Connection Fails

```powershell
# Test SSH connection first
ssh root@72.62.64.59

# If SSH works, SCP should work too
```

### Issue: Permission Denied

On VPS, fix permissions:

```bash
chown -R root:root /var/www/event-app
chmod -R 755 /var/www/event-app
```

### Issue: Transfer Seems to Work But Files Missing

```bash
# Check if files are in a subdirectory
find /var/www/event-app -name "index.js"

# Check file count
find /var/www/event-app/server -type f | wc -l
```

## Quick One-Liner to Check Everything

```bash
cd /var/www/event-app/server && \
echo "=== Files ===" && \
ls -la && \
echo "=== Looking for index.js ===" && \
find . -name "index.js" -type f && \
echo "=== Directory structure ===" && \
tree -L 2 . 2>/dev/null || find . -maxdepth 2 -type d
```

---

**Next Steps:**
1. Re-transfer server folder from local machine
2. Verify files exist
3. Install dependencies
4. Start with PM2

