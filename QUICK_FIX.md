# Quick Fix: Network Request Failed on Android Emulator

## ✅ Good News: Your Server IS Running!

Your server is running correctly on port 3001. The issue is **Windows Firewall** blocking the Android emulator from connecting.

## 🔧 Quick Fix (Choose One)

### Option 1: Run Firewall Script (Easiest)

1. **Right-click** on `fix-firewall.ps1`
2. Select **"Run with PowerShell"** (or "Run as Administrator")
3. If prompted, click "Yes" to allow the script to run
4. The script will configure Windows Firewall automatically

### Option 2: Manual Firewall Configuration

1. Open **Windows Defender Firewall**
   - Press `Win + R`, type `firewall.cpl`, press Enter
   
2. Click **"Advanced settings"** on the left

3. Click **"Inbound Rules"** → **"New Rule..."**

4. Select **"Port"** → Click **Next**

5. Select **"TCP"** and enter port **3001** → Click **Next**

6. Select **"Allow the connection"** → Click **Next**

7. Check all three (Domain, Private, Public) → Click **Next**

8. Name it: **"Node.js Server - Port 3001"** → Click **Finish**

### Option 3: Temporarily Disable Firewall (For Testing Only)

⚠️ **Warning:** Only do this temporarily to test if firewall is the issue!

1. Open **Windows Defender Firewall**
2. Click **"Turn Windows Defender Firewall on or off"**
3. Turn off for **Private networks** (temporarily)
4. Test your app
5. **Turn it back on** after testing!

## ✅ Verify the Fix

After configuring the firewall:

1. **Restart your Android emulator** (important!)

2. **Test the server:**
   ```bash
   npm run server:check
   ```
   Should show: `✅ Server is running!`

3. **Try your Expo app again**

4. Check the Expo logs - you should no longer see network errors

## 🔍 Still Not Working?

If you still see errors after fixing the firewall:

1. **Check server is still running:**
   ```bash
   npm run server:check
   ```

2. **Verify server is listening on all interfaces:**
   The server should show:
   ```
   ✅ API server listening on http://localhost:3001
   ✅ Server accessible from network on port 3001
   ```

3. **Try restarting everything:**
   - Stop the server (Ctrl+C)
   - Close Android emulator
   - Restart server: `npm run server`
   - Restart emulator
   - Restart Expo: `npm start`

4. **Check if another firewall/antivirus is blocking:**
   - Some antivirus software has its own firewall
   - Check Windows Defender settings
   - Check if you have any VPN running

## 📝 Summary

- ✅ Server is running correctly
- ✅ Server is accessible from localhost
- ❌ Android emulator can't connect (Firewall issue)
- ✅ Solution: Configure Windows Firewall (see above)

After fixing the firewall, your Android emulator should be able to connect to `http://10.0.2.2:3001` successfully!




