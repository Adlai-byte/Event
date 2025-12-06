# How to Transfer Services Files Correctly

## Problem

You created an empty `services` directory on VPS, but the files didn't transfer.

## Solution: Transfer from Local Machine

### Step 1: On Your Local Windows Machine

**Open PowerShell** (NOT the VPS terminal):

```powershell
# Navigate to your project directory
cd C:\wamp64\www\FINALLYevent\Event

# Verify services folder exists locally with files
dir server\services

# Should show:
# - paymongo.js
# - invoice.js
# - dragonpay.js
```

### Step 2: Transfer Services Folder

**From your local PowerShell**, run:

```powershell
# Transfer just the services folder
scp -r server/services root@72.62.64.59:/var/www/event-app/server/
```

**Important:**
- Run this from your **local Windows machine**, NOT from VPS
- You'll be prompted for the root password
- This will **overwrite** the empty services directory with the files

### Step 3: Verify Transfer on VPS

**On your VPS**, check:

```bash
cd /var/www/event-app/server

# Check services directory
ls -la services/

# Should now show:
# - paymongo.js
# - invoice.js
# - dragonpay.js
```

## Alternative: Transfer Entire Server Folder

If transferring just services doesn't work, transfer the entire server folder:

**From local PowerShell:**
```powershell
cd C:\wamp64\www\FINALLYevent\Event

# Transfer entire server folder (will overwrite)
scp -r server root@72.62.64.59:/var/www/event-app/
```

**Then on VPS:**
```bash
cd /var/www/event-app/server
ls services/
```

## Troubleshooting

### Issue 1: "No such file or directory" Error

**Problem:** You're running SCP from the wrong location.

**Fix:**
```powershell
# Make sure you're in the project root
cd C:\wamp64\www\FINALLYevent\Event

# Verify you're in the right place
dir server\services

# Then transfer
scp -r server/services root@72.62.64.59:/var/www/event-app/server/
```

### Issue 2: Connection Refused

**Problem:** SSH connection issue.

**Fix:**
```powershell
# Test SSH connection first
ssh root@72.62.64.59

# If SSH works, SCP should work
```

### Issue 3: Files Still Not There After Transfer

**Problem:** Transfer might have failed silently.

**Fix:**
```bash
# On VPS, check if files arrived
cd /var/www/event-app/server
ls -la services/

# If still empty, try removing and transferring again
rmdir services
# Then transfer again from local
```

## Step-by-Step Complete Process

### On Local Machine (PowerShell):

```powershell
# 1. Navigate to project
cd C:\wamp64\www\FINALLYevent\Event

# 2. Verify files exist locally
dir server\services\*.js

# 3. Transfer services folder
scp -r server/services root@72.62.64.59:/var/www/event-app/server/

# 4. Enter root password when prompted
```

### On VPS (SSH):

```bash
# 1. Check services directory
cd /var/www/event-app/server
ls -la services/

# 2. Should see files now
# - paymongo.js
# - invoice.js
# - dragonpay.js

# 3. Test application
node index.js
```

## Quick Verification

After transfer, run this on VPS:

```bash
cd /var/www/event-app/server

echo "=== Services Files ==="
ls services/*.js

echo ""
echo "=== File Check ==="
[ -f services/paymongo.js ] && echo "✅ paymongo.js" || echo "❌ paymongo.js MISSING"
[ -f services/invoice.js ] && echo "✅ invoice.js" || echo "❌ invoice.js MISSING"
```

---

**Remember:** 
- Run SCP from your **local Windows machine** (PowerShell)
- NOT from the VPS terminal
- Make sure you're in `C:\wamp64\www\FINALLYevent\Event` directory
- Use: `scp -r server/services root@72.62.64.59:/var/www/event-app/server/`

