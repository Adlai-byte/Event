# Network Error Analysis: Request Timeout

## Error Summary
**Error Type:** Request timeout - Server is not responding  
**Location:** `mvc/controllers/AuthController.ts` (lines 117-136)  
**API URL:** `http://192.168.254.111:3001` (was `192.168.254.104:3001` - **FIXED**)  
**Platform:** web  
**Error Message:** "Request timeout: Server is not responding"

---

## Root Cause

### 1. **Where the Error Occurs**
The error originates from the `fetchWithTimeout` function call in `AuthController.ts`:

```9:27:mvc/controllers/AuthController.ts
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Server is not responding');
    }
    throw error;
  }
};
```

### 2. **When It Happens**
The timeout occurs when:
- The app tries to fetch user data from the API (line 52 in `AuthController.ts`)
- The server at `http://192.168.254.104:3001` doesn't respond within 10 seconds
- The `AbortController` aborts the request, triggering the timeout error

### 3. **Error Logging Location**
The detailed error messages you see are logged here:

```117:136:mvc/controllers/AuthController.ts
console.error('🌐 Network Error Details:');
console.error('  - API Base URL:', apiUrl);
console.error('  - Platform:', Platform.OS);
console.error('  - Error:', error.message);

if (isTimeout) {
  console.error('  - ⚠️  Connection Timeout: Server is not responding');
}

if (isEmulator) {
  console.error('  - ⚠️  Android Emulator Detected');
  console.error('  - Solution: Make sure your server is running: npm run server');
  console.error('  - Test server: Open http://localhost:3001/api/health in your browser');
  console.error('  - If server is running, check Windows Firewall settings');
} else if (isPhysicalDevice) {
  console.error('  - ⚠️  Physical Device Detected');
  console.error('  - Solution: Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 in .env file');
  console.error('  - Find your IP: Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux)');
} else {
  console.error('  - Solution: Make sure your server is running: npm run server');
}
```

---

## The Fix

### **Primary Solution: Start the Server**

The server must be running for the app to connect. Start it with:

```bash
npm run server
```

This will:
- Start the Express server on port 3001
- Listen on `0.0.0.0` (all network interfaces)
- Make it accessible at `http://192.168.254.104:3001`

### **Verification Steps**

1. **Check if server is running:**
   ```bash
   npm run server:check
   ```

2. **Test server in browser:**
   Open: `http://192.168.254.104:3001/api/health`
   - If you see a response → Server is running ✅
   - If connection fails → Server is not running ❌

3. **Check what's using port 3001 (Windows):**
   ```powershell
   netstat -ano | findstr :3001
   ```
   - If you see output → Something is using the port
   - If no output → Port is free

### **Common Issues & Solutions**

#### Issue 1: Server Not Running
**Solution:** 
```bash
npm run server
```
Keep this terminal open! The server must run continuously.

#### Issue 2: Port Already in Use
**Solution:**
```bash
npm run server:restart
```
This will kill any existing process on port 3001 and restart the server.

#### Issue 3: Firewall Blocking Connection
**Solution:**
1. Open Windows Defender Firewall
2. Allow Node.js through firewall (both Private and Public networks)
3. Or temporarily disable firewall to test

#### Issue 4: Wrong IP Address
**Check your current IP:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

If your IP changed, update `package.json`:
```json
"start": "cross-env EXPO_PUBLIC_API_BASE_URL=http://YOUR_NEW_IP:3001 expo start --clear"
```

---

## Code Flow

1. **App Initialization** → `AuthController.initializeAuth()` is called
2. **Firebase Auth State Change** → User authentication state changes
3. **API Call** → `fetchWithTimeout()` tries to fetch user data from API
4. **Timeout** → Server doesn't respond within 10 seconds
5. **Error Handling** → Error is caught and logged with detailed information
6. **User Impact** → App continues with default values, but user data may be incomplete

---

## Prevention

To prevent this error:
1. ✅ Always start the server before running the app: `npm run server`
2. ✅ Keep the server terminal open while developing
3. ✅ Use `npm run server:check` to verify server status
4. ✅ Ensure firewall allows Node.js connections
5. ✅ Verify IP address matches your current network configuration

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run server` | Start the API server |
| `npm run server:check` | Check if server is running |
| `npm run server:restart` | Restart the server (kills existing process) |
| `npm start` | Start Expo app (requires server to be running) |

---

**Last Updated:** Based on error from `AuthController.ts` lines 117-136

