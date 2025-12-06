# Fix Google Login 404 Error on Mobile

## Problem
Google login works on web but returns a 404 error on mobile devices.

## Root Cause
The 404 error occurs because the redirect URI used for mobile OAuth is not configured in Google Cloud Console. When Google tries to redirect back to your app after authentication, it can't find the redirect URI, resulting in a 404 error.

## Solution

### Step 1: Check Console Logs for Redirect URI

When you try to login with Google on mobile, check the console logs. You'll see output like:

```
🔗 Redirect URI (using): https://auth.expo.io/@your-username/Event
🔗 Redirect URI (alternative): com.event://oauth
```

**Copy both of these URIs** - you'll need to add them to Google Cloud Console.

### Step 2: Add Redirect URIs to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (e.g., `e-vent-aa93e` or `authflow-1gvkb`)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (this is your Web Client ID from Firebase)
5. Click **Edit**
6. Under **Authorized redirect URIs**, click **+ ADD URI**
7. Add **BOTH** redirect URIs shown in your console logs:
   - The one marked as "using" (usually the Expo proxy URI in development)
   - The one marked as "alternative" (usually the deep link URI)

**Example URIs to add:**
```
https://auth.expo.io/@your-username/Event
com.event://oauth
```

**For Expo Go development, you may also need:**
```
exp://127.0.0.1:8081/--/oauth
exp://192.168.x.x:8081/--/oauth  (replace x.x with your local IP)
```

### Step 3: Save and Test

1. Click **Save** in Google Cloud Console
2. Wait a few seconds for changes to propagate
3. Try Google login on mobile again
4. The 404 error should be resolved

## Common Redirect URIs

Depending on your setup, you may need to add one or more of these:

### For Expo Go (Development)
- `https://auth.expo.io/@your-username/Event` (Expo proxy - most common)
- `exp://127.0.0.1:8081/--/oauth` (Localhost)
- `exp://192.168.x.x:8081/--/oauth` (Network IP - replace with your IP)

### For Standalone Builds
- `com.event://oauth` (Deep link scheme)

### How to Find Your Exact Redirect URI

1. Run your app: `npx expo start`
2. Try to login with Google
3. Check the console output - it will show the exact redirect URI being used
4. Copy that exact URI and add it to Google Cloud Console

## Troubleshooting

### Still Getting 404 Error?

1. **Verify the redirect URI matches exactly** - Copy the exact URI from console logs, including:
   - Protocol (`https://` or `com.event://`)
   - Domain/path
   - No trailing slashes (unless present in the log)

2. **Wait for propagation** - Google Cloud Console changes can take a few minutes to propagate

3. **Check multiple environments** - If testing on different devices/networks, you may need different URIs:
   - Localhost: `exp://127.0.0.1:8081/--/oauth`
   - Network: `exp://192.168.x.x:8081/--/oauth`
   - Proxy: `https://auth.expo.io/@your-username/Event`

4. **Clear app cache** - Sometimes cached OAuth state can cause issues:
   ```bash
   # Clear Expo cache
   npx expo start -c
   ```

### Error: "redirect_uri_mismatch"

This means the redirect URI in your OAuth request doesn't match what's configured. The error message will tell you which URI is expected - add that exact URI to Google Cloud Console.

### Error: "invalid_client"

This means your OAuth Client ID is incorrect. Make sure you're using the **Web Client ID** from Firebase Console, not the Android/iOS client ID.

## Why This Happens

- **Web**: Uses Firebase's built-in OAuth flow with redirects handled by the browser
- **Mobile**: Uses `expo-auth-session` which generates custom redirect URIs that must be explicitly configured in Google Cloud Console

The redirect URI format differs between:
- Development (Expo Go): Uses Expo's proxy service or local network addresses
- Production (Standalone): Uses your app's deep link scheme (`com.event://oauth`)

## Prevention

To avoid this issue in the future:
1. Always check console logs for the redirect URI when setting up OAuth
2. Add all possible redirect URIs (development and production) to Google Cloud Console
3. Document which redirect URIs are configured for your project

## Additional Resources

- [Expo AuthSession Documentation](https://docs.expo.dev/guides/authentication/#google)
- [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
- [Fix OAuth Chrome Browser](./FIX_OAUTH_CHROME_BROWSER.md)



