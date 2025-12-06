# Troubleshooting Network Issues

## Quick Diagnosis

### Step 1: Check if server is running
```bash
npm run server:check
```

This will tell you if your server is accessible on port 3001.

### Step 2: Check what's using port 3001
**Windows:**
```bash
netstat -ano | findstr :3001
```

**Mac/Linux:**
```bash
lsof -i :3001
```

If you see output, something is using port 3001. If not, the port is free.

### Step 3: Start the server
```bash
npm run server
```

You should see:
```
✅ API server listening on http://localhost:3001
✅ Server accessible from network on port 3001
✅ For Android emulator: http://10.0.2.2:3001
```

## Common Issues

### Issue 1: "Server is NOT running"
**Solution:** Start the server:
```bash
npm run server
```

Keep this terminal open! The server must be running while you use the app.

### Issue 2: "Port 3001 already in use"
**Solution:** 
1. Find what's using the port (see Step 2 above)
2. Kill that process or use a different port
3. To use a different port, create a `.env` file in the `server` folder:
   ```
   PORT=3002
   ```
   Then update your app's API URL accordingly.

### Issue 3: Server running but Android emulator can't connect

**Check 1: Is server listening on 0.0.0.0?**
The server should be configured to listen on `0.0.0.0` (all interfaces), not just `localhost`.

**Check 2: Windows Firewall**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Firewall"
3. Find "Node.js" and make sure both Private and Public are checked
4. If Node.js isn't listed, click "Allow another app" and add Node.js

**Check 3: Test from browser**
Open `http://localhost:3001/api/health` in your browser.
- If it works: Server is fine, issue is with emulator connection
- If it doesn't work: Server has a problem

### Issue 4: "Network request failed" on physical device

**Solution:** You MUST set the IP address in `.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:3001
```

Find your IP:
- **Windows:** `ipconfig` → Look for "IPv4 Address"
- **Mac/Linux:** `ifconfig` or `ip addr`

**Important:** Your phone and computer must be on the same WiFi network!

## Step-by-Step Fix for Android Emulator

1. **Open Terminal 1** - Start the server:
   ```bash
   npm run server
   ```
   Wait for: `✅ API server listening on http://localhost:3001`

2. **Open Terminal 2** - Test the server:
   ```bash
   npm run server:check
   ```
   Should show: `✅ Server is running!`

3. **Open Terminal 3** - Start Expo:
   ```bash
   npm start
   ```

4. **In your browser** - Test: `http://localhost:3001/api/health`
   Should show: `{"ok":true}`

5. **If all above work but emulator still fails:**
   - Check Windows Firewall (see Issue 3 above)
   - Try restarting the Android emulator
   - Make sure you're using the correct API URL (should be `http://10.0.2.2:3001` for emulator)

## Still Not Working?

1. **Check server logs** - Look for errors in the server terminal
2. **Check Expo logs** - Look for the API URL being used
3. **Try different port** - Change to 3002 or 8080
4. **Restart everything** - Close all terminals, restart emulator, try again

## Quick Test Commands

```bash
# Check if server is running
npm run server:check

# Check what's on port 3001
netstat -ano | findstr :3001

# Start server
npm run server

# Test in browser (open this URL)
# http://localhost:3001/api/health
```














