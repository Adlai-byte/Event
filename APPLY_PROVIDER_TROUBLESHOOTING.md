# Apply as Provider - Troubleshooting Guide

## Problem: 404 Error when submitting provider application

### Root Cause Analysis

The error `POST http://192.168.254.116:3001/api/users/apply-provider 404 (Not Found)` indicates that:

1. ✅ **Route is correctly defined** in `server/index.js` at line 266
2. ✅ **Frontend code is correct** in `mvc/views/user/ProfileView.tsx` at line 179
3. ❌ **Server is not running OR needs restart** - This is the most likely issue

### Solutions (Try in order)

#### Solution 1: Restart the Server (MOST COMMON FIX)

The server needs to be restarted to register the route properly.

**Option A: Using PowerShell script**
```powershell
cd C:\wamp64\www\Event
npm run server:restart
```

**Option B: Manual restart**
1. Stop the current server (Ctrl+C in the terminal running the server)
2. Start the server again:
```powershell
cd C:\wamp64\www\Event
npm run server
```

**Option C: Using the restart script**
```powershell
cd C:\wamp64\www\Event
.\restart-server.ps1
```

#### Solution 2: Verify Server is Running

Check if the server is actually running on port 3001:

1. Open browser and go to: `http://192.168.254.116:3001/api/health`
2. You should see: `{"ok":true}`
3. If you get a connection error, the server is not running

#### Solution 3: Check Server Logs

When you start the server, you should see:
```
✅ API server listening on http://localhost:3001
✅ Server accessible from network on port 3001
✅ Registered route: POST /api/users/apply-provider
```

If you don't see the last line, the route wasn't registered.

#### Solution 4: Verify IP Address

Make sure the IP address in your frontend matches the server:
- Server IP: Check what IP the server is listening on
- Frontend IP: Check `getApiBaseUrl()` returns the correct IP

#### Solution 5: Check Database Connection

The route requires database access. Verify:
1. MySQL is running in WAMP
2. Database connection is configured in `server/db.js`
3. Check server logs for database connection errors

### Testing the Route

After restarting the server, test the route directly:

```bash
curl -X POST http://192.168.254.116:3001/api/users/apply-provider \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","businessDocument":"data:image/jpeg;base64,...","validIdDocument":"data:image/jpeg;base64,..."}'
```

Or use Postman/Thunder Client to test the endpoint.

### Common Issues

1. **Server not running**: Start it with `npm run server`
2. **Port conflict**: Another service might be using port 3001
3. **Firewall blocking**: Windows Firewall might be blocking port 3001
4. **Database not connected**: Check MySQL is running in WAMP
5. **Route not registered**: Server needs restart after code changes

### Next Steps

1. **Restart the server** (Solution 1)
2. **Check server logs** for any errors
3. **Test the health endpoint** to verify server is running
4. **Try submitting again** from the app

If the problem persists after restarting, check the server console logs for specific error messages.

