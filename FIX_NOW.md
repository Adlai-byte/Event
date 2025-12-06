# 🔧 FIX NETWORK ERRORS - Step by Step

## Current Problem
- ✅ Server IS running on port 3001
- ✅ Server responds to localhost
- ❌ Android emulator CANNOT connect (Windows Firewall blocking)

## Solution: Add Firewall Rule (5 minutes)

### Method 1: Using PowerShell Script (Easiest)

1. **Right-click** on `fix-firewall.ps1` in File Explorer
2. Select **"Run with PowerShell"**
3. If you see a UAC prompt, click **"Yes"**
4. Wait for the script to complete
5. You should see: `✅ Firewall rule created successfully!`

### Method 2: Manual Windows Firewall Configuration

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. **Create Inbound Rule:**
   - Click **"Inbound Rules"** in the left panel
   - Click **"New Rule..."** in the right panel

3. **Rule Type:**
   - Select **"Port"**
   - Click **Next**

4. **Protocol and Ports:**
   - Select **"TCP"**
   - Select **"Specific local ports"**
   - Enter: `3001`
   - Click **Next**

5. **Action:**
   - Select **"Allow the connection"**
   - Click **Next**

6. **Profile:**
   - Check **ALL THREE**: Domain, Private, Public
   - Click **Next**

7. **Name:**
   - Name: `Expo Development Server - Port 3001`
   - Click **Finish**

## After Adding Firewall Rule

1. **Restart Android Emulator:**
   - Close the emulator completely
   - Restart it from Android Studio or Expo

2. **Verify Server is Running:**
   ```bash
   npm run server:check
   ```
   Should show: `✅ Server is running!`

3. **Test Emulator Connection:**
   ```bash
   npm run server:test-emulator
   ```
   Should show: `✅ SUCCESS` (instead of connection timeout)

4. **Restart Expo:**
   ```bash
   npm start -- --clear
   ```

5. **Try Your App Again:**
   - The network errors should be gone!

## Quick Verification

After fixing the firewall, test these:

```bash
# Test 1: Server responds locally
npm run server:check
# Expected: ✅ Server is running!

# Test 2: Emulator can reach server
npm run server:test-emulator
# Expected: ✅ SUCCESS (not timeout)

# Test 3: Browser test
# Open: http://localhost:3001/api/health
# Expected: {"ok":true}
```

## If Still Not Working

1. **Check if rule was created:**
   - Open `wf.msc`
   - Look for "Expo Development Server - Port 3001" in Inbound Rules
   - Make sure it's **Enabled** (green checkmark)

2. **Try disabling Windows Firewall temporarily:**
   - Only for testing! Turn it back on after.
   - If this works, the firewall rule wasn't created correctly

3. **Check antivirus:**
   - Some antivirus software has its own firewall
   - Temporarily disable to test

4. **Restart everything:**
   - Stop server (Ctrl+C)
   - Close emulator
   - Restart server: `npm run server`
   - Restart emulator
   - Restart Expo: `npm start`

## Summary

**The Problem:** Windows Firewall is blocking port 3001 from the Android emulator

**The Solution:** Add a firewall rule allowing port 3001 (see methods above)

**Time Required:** 5 minutes

**After Fix:** Your Android emulator will be able to connect to `http://10.0.2.2:3001` ✅














