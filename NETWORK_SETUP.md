# Network Setup Guide for Expo Go

## Problem: Network Request Failed Errors

If you're seeing errors like:
```
ERROR  Error fetching user data on auth state change: [TypeError: Network request failed]
ERROR  Error loading dashboard data: [TypeError: Network request failed]
```

This means your Expo app cannot connect to your backend server.

## Solutions

### Option 1: Using Expo Go on Physical Device (Recommended Fix)

When using Expo Go on a **physical device**, `localhost` won't work. You need to use your computer's IP address.

1. **Find your computer's IP address:**
   - **Windows**: Open Command Prompt and run `ipconfig`
     - Look for "IPv4 Address" under your active network adapter
     - Example: `192.168.1.100`
   - **Mac/Linux**: Open Terminal and run `ifconfig` or `ip addr`
     - Look for `inet` address (usually starts with `192.168.x.x` or `10.x.x.x`)

2. **Set the environment variable:**
   Create a `.env` file in your project root (or add to existing):
   ```
   EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP_ADDRESS:3001
   ```
   Example:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001
   ```

3. **Restart Expo:**
   ```bash
   npm start -- --clear
   ```

4. **Make sure your server is running:**
   ```bash
   npm run server
   ```
   Or:
   ```bash
   node server/index.js
   ```

5. **Check firewall:**
   - Make sure Windows Firewall allows connections on port 3001
   - Or temporarily disable firewall to test

### Option 2: Using Emulator/Simulator

If using an **Android emulator** or **iOS simulator**:
- The default `localhost:3001` should work
- For Android emulator, it automatically uses `10.0.2.2:3001`
- No configuration needed!

### Option 3: Using Web

If running on **web**:
- `localhost:3001` should work
- Make sure your server is running

## Verify Your Setup

1. **Check if server is running:**
   Open browser and go to: `http://localhost:3001/api/health`
   (or `http://YOUR_IP:3001/api/health` if using physical device)
   
   You should see a response (even if it's an error, it means the server is reachable)

2. **Check the API base URL in your app:**
   Look at the console logs - you should see:
   ```
   🌐 Using API base URL from environment: http://192.168.1.100:3001
   ```

3. **Test from your device:**
   - Make sure your phone and computer are on the same WiFi network
   - Try accessing `http://YOUR_IP:3001/api/health` from your phone's browser

## Common Issues

### Issue: "Network request failed" on physical device
**Solution:** Set `EXPO_PUBLIC_API_BASE_URL` to your computer's IP address (not localhost)

### Issue: "Connection refused"
**Solution:** 
- Make sure your server is running (`npm run server`)
- Check if port 3001 is already in use
- Check Windows Firewall settings

### Issue: "Can't connect" even with correct IP
**Solution:**
- Make sure phone and computer are on the same WiFi network
- Try disabling VPN if you're using one
- Check if your router blocks device-to-device communication

### Issue: Works on emulator but not physical device
**Solution:** This is expected! Emulators can use localhost, but physical devices need the actual IP address.

## Quick Test

Run this in your terminal to test if your server is accessible:
```bash
# On Windows PowerShell
Test-NetConnection -ComputerName YOUR_IP -Port 3001

# Or use curl
curl http://YOUR_IP:3001/api/health
```

If this fails, the issue is with your server or network configuration, not the Expo app.




