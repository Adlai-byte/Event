# Fix: Files in Nested Directory

## Problem Found

Your files are in `/var/www/event-app/server/server/` (nested) instead of `/var/www/event-app/server/`.

## Quick Fix: Move Files Up One Level

### Step 1: Navigate to the Nested Directory

```bash
cd /var/www/event-app/server/server
ls -la
```

You should see `index.js` and other files here.

### Step 2: Move All Files Up One Level

**If you get "Directory not empty" error for `uploads` or other directories:**

```bash
# First, move individual files (not directories)
cd /var/www/event-app/server
mv server/*.js .
mv server/*.json .
mv server/*.md .
mv server/Dockerfile .

# Then handle directories - merge or replace
# Option A: If existing directories are empty, remove them first
rmdir uploads 2>/dev/null || true
rmdir services 2>/dev/null || true
rmdir public 2>/dev/null || true
rmdir database 2>/dev/null || true

# Then move directories
mv server/uploads .
mv server/services .
mv server/public .
mv server/database .

# Remove the now-empty nested directory
rmdir server
```

**Or use this safer approach that merges directories:**

```bash
cd /var/www/event-app/server

# Move files (not directories)
find server -maxdepth 1 -type f -exec mv {} . \;

# Merge directories
for dir in server/*/; do
    dirname=$(basename "$dir")
    if [ -d "$dirname" ]; then
        # Directory exists, merge contents
        cp -r "$dir"* "$dirname/" 2>/dev/null || true
    else
        # Directory doesn't exist, just move it
        mv "$dir" .
    fi
done

# Remove nested directory
rmdir server
```

### Step 3: Verify Files Are in Correct Location

```bash
cd /var/www/event-app/server
ls -la index.js
```

Should now show `index.js` exists.

### Step 4: Verify All Files

```bash
cd /var/www/event-app/server

# Check essential files
ls index.js
ls package.json
ls db.js
ls -d services/
ls -d uploads/
```

### Step 5: Start with PM2

```bash
cd /var/www/event-app/server

# Verify you're in the right place
pwd  # Should show: /var/www/event-app/server

# Verify index.js exists
ls index.js

# Install dependencies (if not done)
npm install --production

# Start the application
pm2 start index.js --name event-api
pm2 save
pm2 status
```

## One-Line Fix

If you want to do it all at once:

```bash
cd /var/www/event-app/server && \
mv server/* . && \
rmdir server && \
ls -la index.js
```

## Why This Happened

This happens when you use:
```bash
scp -r server root@72.62.64.59:/var/www/event-app/server
```

Instead of:
```bash
scp -r server root@72.62.64.59:/var/www/event-app/
```

The first command creates `/var/www/event-app/server/server/` (nested).
The second command creates `/var/www/event-app/server/` (correct).

## After Fixing: Verify Structure

```bash
# Should show files directly in server/
ls -la /var/www/event-app/server/

# Should NOT show a nested server/server/ directory
ls /var/www/event-app/server/server/ 2>&1
# Should show: No such file or directory
```

---

**Quick Fix Command:**
```bash
cd /var/www/event-app/server && mv server/* . && rmdir server
```

