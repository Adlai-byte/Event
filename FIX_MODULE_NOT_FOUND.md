# Fix: MODULE NOT FOUND Error

## Problem

PM2 shows the app is starting (listening on port 3001) but then crashes with `MODULE NOT FOUND` error.

## Step 1: See the Full Error Message

The PM2 logs are truncated. Run the app directly to see the complete error:

```bash
cd /var/www/event-app/server

# Stop PM2 first
pm2 stop event-api

# Run directly to see full error
node index.js
```

This will show you **exactly which module is missing**.

## Step 2: Common Missing Modules

### Check if All Required Files Exist

```bash
cd /var/www/event-app/server

# Check essential files
echo "=== Checking files ==="
[ -f index.js ] && echo "✅ index.js" || echo "❌ index.js MISSING"
[ -f db.js ] && echo "✅ db.js" || echo "❌ db.js MISSING"
[ -f package.json ] && echo "✅ package.json" || echo "❌ package.json MISSING"

# Check services directory
echo "=== Checking services ==="
[ -d services ] && echo "✅ services/" || echo "❌ services/ MISSING"
[ -f services/paymongo.js ] && echo "✅ paymongo.js" || echo "❌ paymongo.js MISSING"
[ -f services/invoice.js ] && echo "✅ invoice.js" || echo "❌ invoice.js MISSING"

# Check node_modules
echo "=== Checking dependencies ==="
[ -d node_modules ] && echo "✅ node_modules/" || echo "❌ node_modules/ MISSING"
[ -d node_modules/express ] && echo "✅ express" || echo "❌ express MISSING"
[ -d node_modules/mysql2 ] && echo "✅ mysql2" || echo "❌ mysql2 MISSING"
```

## Step 3: Reinstall Dependencies

If node_modules is missing or incomplete:

```bash
cd /var/www/event-app/server

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install --production
```

## Step 4: Check for Missing Local Modules

The error might be a local file (not from node_modules). Check what `index.js` requires:

```bash
cd /var/www/event-app/server

# See what modules index.js requires
grep -E "require\(|import " index.js | head -20
```

Common local modules that might be missing:
- `./db` → needs `db.js`
- `./services/paymongo` → needs `services/paymongo.js`
- `./services/invoice` → needs `services/invoice.js`

## Step 5: Verify File Structure

```bash
cd /var/www/event-app/server

# Show directory structure
ls -la

# Check if there are any nested directories
find . -maxdepth 2 -type d

# Check if files are in wrong location
find . -name "*.js" -type f | grep -E "(db|paymongo|invoice)" | head -10
```

## Step 6: Complete File Check Script

Run this to check everything:

```bash
cd /var/www/event-app/server

echo "=== File Structure ==="
ls -la

echo ""
echo "=== Required Files ==="
for file in index.js db.js package.json services/paymongo.js services/invoice.js; do
    [ -f "$file" ] && echo "✅ $file" || echo "❌ $file MISSING"
done

echo ""
echo "=== Dependencies ==="
[ -d node_modules ] && echo "✅ node_modules exists" || echo "❌ node_modules MISSING"
[ -d node_modules/express ] && echo "✅ express installed" || echo "❌ express NOT installed"

echo ""
echo "=== Try to see error ==="
node index.js 2>&1 | head -30
```

## Step 7: Most Likely Issues

### Issue 1: Missing services Directory

```bash
# Check if services exists
ls -la services/

# If missing, re-transfer from local machine
# From local: scp -r server/services root@72.62.64.59:/var/www/event-app/server/
```

### Issue 2: Missing node_modules

```bash
cd /var/www/event-app/server
npm install --production
```

### Issue 3: Files in Wrong Location

```bash
# Check if files are nested
ls -la server/

# If they are, move them
mv server/* . 2>/dev/null
rmdir server 2>/dev/null
```

## Quick Fix: Re-transfer Everything

If you're not sure what's missing, re-transfer the entire server folder:

**From your local machine:**
```powershell
cd C:\wamp64\www\FINALLYevent\Event
scp -r server root@72.62.64.59:/var/www/event-app/
```

**Then on VPS:**
```bash
cd /var/www/event-app/server

# Install dependencies
npm install --production

# Test
node index.js
```

## After Fixing: Restart PM2

```bash
cd /var/www/event-app/server

# Delete old process
pm2 delete event-api

# Start fresh
pm2 start index.js --name event-api
pm2 save

# Watch logs
pm2 logs event-api
```

---

**First Step:** Run `node index.js` directly to see the exact missing module name!

