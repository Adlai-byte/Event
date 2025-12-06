# Fix: Cannot find module './services/paymongo'

## Error Confirmed

```
Error: Cannot find module './services/paymongo'
```

The `services/paymongo.js` file is missing.

## Quick Fix

### Step 1: Check if services directory exists

```bash
cd /var/www/event-app/server

# Check if services directory exists
ls -la services/

# Check if paymongo.js exists
ls services/paymongo.js
```

### Step 2: Re-transfer services folder

**From your local Windows machine (PowerShell):**

```powershell
cd C:\wamp64\www\FINALLYevent\Event

# Transfer the services folder
scp -r server/services root@72.62.64.59:/var/www/event-app/server/
```

### Step 3: Verify on VPS

After transfer:

```bash
cd /var/www/event-app/server

# Verify services directory
ls -la services/

# Should show:
# - paymongo.js
# - invoice.js
# - dragonpay.js
```

### Step 4: Test again

```bash
cd /var/www/event-app/server

# Test if it runs now
node index.js
```

Should start without the module error.

## Alternative: Check if files are elsewhere

```bash
# Search for paymongo.js
find /var/www/event-app -name "paymongo.js" -type f

# Check if it's in nested directory
ls -la /var/www/event-app/server/server/services/ 2>/dev/null
```

If you find it in a nested location, move it:

```bash
cd /var/www/event-app/server

# If files are in server/services/, move them
mv server/services/* services/ 2>/dev/null
rmdir server/services 2>/dev/null
```

## Complete Re-transfer (If Needed)

If the services folder is completely missing:

**From local machine:**
```powershell
cd C:\wamp64\www\FINALLYevent\Event

# Transfer entire server folder
scp -r server root@72.62.64.59:/var/www/event-app/
```

**Then on VPS:**
```bash
cd /var/www/event-app/server

# Verify
ls services/paymongo.js

# Test
node index.js
```

## After Fixing: Start with PM2

```bash
cd /var/www/event-app/server

# Delete old PM2 process
pm2 delete event-api

# Start fresh
pm2 start index.js --name event-api
pm2 save

# Check status
pm2 status

# View logs
pm2 logs event-api
```

## Quick Verification

Run this to check everything:

```bash
cd /var/www/event-app/server

echo "=== Checking services ==="
[ -d services ] && echo "✅ services/ exists" || echo "❌ services/ MISSING"
[ -f services/paymongo.js ] && echo "✅ paymongo.js exists" || echo "❌ paymongo.js MISSING"
[ -f services/invoice.js ] && echo "✅ invoice.js exists" || echo "❌ invoice.js MISSING"

echo ""
echo "=== Searching for paymongo.js ==="
find /var/www/event-app -name "paymongo.js" -type f
```

---

**Solution:** Re-transfer the `services` folder from your local machine using SCP.

