# Fix: "Directory not empty" Error When Moving Files

## Problem

When trying to move files from `server/server/` to `server/`, you get:
```
mv: cannot overwrite './uploads': Directory not empty
```

This happens because both directories have an `uploads` folder.

## Solution: Merge or Replace Directories

### Option 1: Replace Existing Directories (Recommended)

If the existing directories are empty or you want to replace them:

```bash
cd /var/www/event-app/server

# Remove existing directories (if they exist)
rm -rf uploads services public database 2>/dev/null

# Now move everything
mv server/* .

# Remove nested directory
rmdir server
```

### Option 2: Merge Directories (Keep Both)

If you want to keep files from both locations:

```bash
cd /var/www/event-app/server

# Move individual files first
find server -maxdepth 1 -type f -exec mv {} . \;

# Merge directories (copy contents, don't overwrite)
for dir in server/*/; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        if [ -d "$dirname" ]; then
            # Directory exists, merge contents
            cp -r "$dir"* "$dirname/" 2>/dev/null
        else
            # Directory doesn't exist, move it
            mv "$dir" .
        fi
    fi
done

# Remove nested directory
rmdir server
```

### Option 3: Step-by-Step Safe Approach

```bash
cd /var/www/event-app/server

# Step 1: Move all files (not directories)
mv server/*.js . 2>/dev/null
mv server/*.json . 2>/dev/null
mv server/*.md . 2>/dev/null
mv server/Dockerfile . 2>/dev/null
mv server/production-*.js . 2>/dev/null

# Step 2: Handle each directory individually
# For uploads - replace if empty, merge if has content
if [ -d "uploads" ] && [ -d "server/uploads" ]; then
    # Check if existing is empty
    if [ -z "$(ls -A uploads)" ]; then
        rm -rf uploads
        mv server/uploads .
    else
        # Merge: copy from nested to existing
        cp -r server/uploads/* uploads/ 2>/dev/null
        rm -rf server/uploads
    fi
else
    mv server/uploads . 2>/dev/null
fi

# Repeat for other directories
[ -d "server/services" ] && mv server/services . 2>/dev/null || true
[ -d "server/public" ] && mv server/public . 2>/dev/null || true
[ -d "server/database" ] && mv server/database . 2>/dev/null || true

# Step 3: Remove nested directory
rmdir server 2>/dev/null || rm -rf server
```

## Quick Fix (Recommended)

If you just want to get it working quickly:

```bash
cd /var/www/event-app/server

# Backup existing directories (optional)
mkdir -p ../backup
cp -r uploads ../backup/ 2>/dev/null || true

# Remove existing directories
rm -rf uploads services public database

# Move everything from nested directory
mv server/* .

# Remove nested directory
rmdir server

# Verify
ls -la index.js
```

## Verify After Fix

```bash
cd /var/www/event-app/server

# Check essential files
ls index.js
ls package.json
ls db.js

# Check directories
ls -d services/
ls -d uploads/
ls -d public/

# Should NOT have nested server/server/
ls server/ 2>&1
# Should show: No such file or directory
```

## Then Start PM2

```bash
cd /var/www/event-app/server

# Verify index.js exists
ls index.js

# Install dependencies
npm install --production

# Start application
pm2 start index.js --name event-api
pm2 save
pm2 status
```

---

**Easiest Solution:**
```bash
cd /var/www/event-app/server && \
rm -rf uploads services public database && \
mv server/* . && \
rmdir server && \
ls index.js
```

