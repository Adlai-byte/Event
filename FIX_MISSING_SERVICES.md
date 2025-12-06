# Fix: Missing services/paymongo Module

## Error Found

```
Error: Cannot find module './services/paymongo'
```

This means the `services` directory or `paymongo.js` file is missing.

## Quick Fix Steps

### Step 1: Check if services directory exists

```bash
cd /var/www/event-app/server

# Check if services directory exists
ls -la services/

# Check what's in services (if it exists)
ls services/
```

### Step 2: Check if files are in nested directory

```bash
# Check if services is in the nested server directory
ls -la server/services/ 2>/dev/null

# Or search for paymongo.js
find /var/www/event-app -name "paymongo.js" -type f
```

### Step 3: Fix Based on What You Find

#### Option A: Services directory is missing completely

If `services/` doesn't exist, you need to re-transfer files:

**From your local machine (PowerShell):**
```powershell
cd C:\wamp64\www\FINALLYevent\Event
scp -r server/services root@72.62.64.59:/var/www/event-app/server/
```

#### Option B: Services directory exists but is empty

```bash
cd /var/www/event-app/server

# Check if it's empty
ls services/

# If empty, re-transfer just the services folder
```

#### Option C: Files are in nested directory

If you find files in `server/services/`:

```bash
cd /var/www/event-app/server

# Move services from nested directory
mv server/services/* services/ 2>/dev/null || mv server/services services

# Remove nested directory
rmdir server/services 2>/dev/null
rmdir server 2>/dev/null
```

## Required Files in services/

The `services/` directory should contain:

```bash
cd /var/www/event-app/server

# Check for required service files
ls services/paymongo.js
ls services/invoice.js
ls services/dragonpay.js  # If you use it
```

## Complete Re-transfer (If Needed)

If the services directory is completely missing:

**From your local Windows machine:**
```powershell
cd C:\wamp64\www\FINALLYevent\Event

# Transfer entire server folder again (will overwrite)
scp -r server root@72.62.64.59:/var/www/event-app/
```

**Then on VPS, verify:**
```bash
cd /var/www/event-app/server
ls -la services/paymongo.js
ls -la services/invoice.js
```

## After Fixing: Test Again

```bash
cd /var/www/event-app/server

# Test if it runs now
node index.js

# If it works, start with PM2
pm2 delete event-api
pm2 start index.js --name event-api
pm2 save
pm2 status
```

## Quick Diagnostic

Run this to see what's missing:

```bash
cd /var/www/event-app/server

echo "=== Checking services directory ==="
[ -d services ] && echo "✅ services/ exists" || echo "❌ services/ MISSING"
[ -f services/paymongo.js ] && echo "✅ paymongo.js exists" || echo "❌ paymongo.js MISSING"
[ -f services/invoice.js ] && echo "✅ invoice.js exists" || echo "❌ invoice.js MISSING"

echo "=== Searching for paymongo.js ==="
find /var/www/event-app -name "paymongo.js" -type f

echo "=== Current directory structure ==="
ls -la
```

## Most Likely Solution

The services directory wasn't transferred. Re-transfer the entire server folder:

**From local machine:**
```powershell
cd C:\wamp64\www\FINALLYevent\Event
scp -r server root@72.62.64.59:/var/www/event-app/
```

**On VPS, verify:**
```bash
cd /var/www/event-app/server
ls services/
```

---

**Next:** After fixing, run `node index.js` again to check for other missing files.

