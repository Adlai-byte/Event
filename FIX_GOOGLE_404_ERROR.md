# Fix Google 404 Error During OAuth

## Problem
Getting a 404 error from `accounts.google.com` when trying to authenticate with Google OAuth.

## Root Causes

The 404 error can occur due to several reasons:

1. **Invalid OAuth Client ID** - The client ID might not be properly configured
2. **Discovery Document Issues** - The OAuth discovery document might not be fetched correctly
3. **Malformed Authorization URL** - The authorization URL might be constructed incorrectly
4. **Redirect URI Mismatch** - The redirect URI might not match what's configured in Google Cloud Console

## Solution

The code has been updated with:

1. **Enhanced Discovery Document Validation** - Better error handling when fetching the discovery document
2. **Detailed Logging** - Logs the authorization URL and all parameters for debugging
3. **Client ID Validation** - Validates the OAuth client ID format
4. **Better Error Messages** - More specific error messages to identify the issue

## Debugging Steps

When you try to login, check the console logs for:

1. **Client ID**: Should show the first 20 characters of your client ID
2. **Discovery Document**: Should show "Discovery document fetched successfully"
3. **Authorization Endpoint**: Should show `https://accounts.google.com/o/oauth2/v2/auth`
4. **Authorization URL**: Should show the full OAuth URL being used

## Common Issues and Fixes

### Issue 1: Invalid Client ID
**Symptoms**: 404 error, "Invalid OAuth client ID" in logs

**Fix**:
1. Go to Firebase Console > Authentication > Sign-in method > Google
2. Copy the **Web client ID** (not Android/iOS client ID)
3. Set it in `.env` as `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-client-id`
4. Restart Expo server

### Issue 2: Discovery Document Not Loading
**Symptoms**: "Failed to fetch discovery document" error

**Fix**:
- Check network connection
- Verify you can access `https://accounts.google.com/.well-known/openid-configuration` in a browser
- Try again - sometimes it's a temporary network issue

### Issue 3: Redirect URI Not Configured
**Symptoms**: 404 or "redirect_uri_mismatch" error

**Fix**:
1. Check console logs for the redirect URI being used
2. Go to Google Cloud Console > APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add the redirect URI shown in the logs to "Authorized redirect URIs"

### Issue 4: Wrong Authorization Endpoint
**Symptoms**: 404 error with wrong URL

**Fix**:
- The discovery document should return: `https://accounts.google.com/o/oauth2/v2/auth`
- If it returns something else, there might be an issue with the discovery document
- Try clearing the app cache and restarting

## Testing

1. Clear app cache: `npx expo start --clear`
2. Try Google login
3. Check console logs for:
   - Client ID
   - Discovery document status
   - Authorization URL
   - Any error messages
4. If you see a 404, check what URL is being accessed
5. Compare the URL in the browser with what's logged in the console

## Expected Console Output

When working correctly, you should see:
```
🔑 Google OAuth Client ID configured: 491966036189-3f1e5...
Fetching Google OAuth discovery document...
✅ Discovery document fetched successfully
📍 Authorization endpoint: https://accounts.google.com/o/oauth2/v2/auth
📍 Token endpoint: https://oauth2.googleapis.com/token
🔗 Authorization URL: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

If you see errors instead, follow the fixes above based on the specific error message.



