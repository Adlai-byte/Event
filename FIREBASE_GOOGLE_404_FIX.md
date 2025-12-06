# Fix Google Login 404 Error on Mobile (Firebase Project)

## Understanding Firebase and Google Cloud Console

**Important**: Firebase and Google Cloud Console are connected! When you enable Google sign-in in Firebase, it automatically creates OAuth credentials in Google Cloud Console.

- **Firebase Console**: Where you see your Web Client ID
- **Google Cloud Console**: Where you configure redirect URIs
- **Same Project**: Both use the same project ID (`e-vent-aa93e`)

The **Web Client ID** from Firebase is the same as the **OAuth 2.0 Client ID** in Google Cloud Console.

## The Problem

Google login works on web but returns a **404 error** on mobile because:
- Web uses Firebase's built-in OAuth (automatically configured)
- Mobile uses `expo-auth-session` which requires manual redirect URI configuration

## Solution: Add Redirect URIs to Your Firebase OAuth Client

### Step 1: Find Your Redirect URIs

1. Run your app: `npx expo start`
2. Try to login with Google on mobile
3. Check the console logs - you'll see:
   ```
   🔗 Redirect URI (using): https://auth.expo.io/@your-username/Event
   🔗 Redirect URI (alternative): com.event://oauth
   ```
4. Copy BOTH redirect URIs

### Step 2: Get Your Firebase Web Client ID

1. Go to: **https://console.firebase.google.com/**
2. Select your project: **e-vent-aa93e**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Under **Web SDK configuration**, copy the **Web client ID**
   - Format: `491966036189-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com`

### Step 3: Add Redirect URIs in Google Cloud Console

1. Go to: **https://console.cloud.google.com/apis/credentials**
2. **Important**: Select the same project: **e-vent-aa93e** (your Firebase project)
3. Find your **OAuth 2.0 Client ID** that matches your Firebase Web Client ID
4. Click **Edit**
5. Scroll to **Authorized redirect URIs**
6. Click **+ ADD URI**
7. Add the first redirect URI from Step 1
8. Click **+ ADD URI** again
9. Add the second redirect URI
10. Click **Save**
11. Wait 1-2 minutes for changes to propagate

### Step 4: Test

1. Try Google login on mobile again
2. The 404 error should be resolved!

## Common Redirect URIs

You might see one of these formats:

### For Expo Go (Development)
- `https://auth.expo.io/@your-username/Event` (most common - Expo proxy)
- `exp://127.0.0.1:8081/--/oauth` (localhost)
- `exp://192.168.x.x:8081/--/oauth` (network IP - replace x.x with your IP)

### For Standalone Builds
- `com.event://oauth` (deep link based on your app scheme)

**Add all of them** to support different environments!

## Troubleshooting

### Still Getting 404?

1. **Verify the exact redirect URI** - Check console logs when you try to login
2. **Check the error message** - It will show the exact redirect URI that's missing
3. **Verify project match** - Make sure you're in the same project (`e-vent-aa93e`) in both Firebase and Google Cloud Console
4. **Wait longer** - Changes can take 1-2 minutes to propagate
5. **Clear cache**: `npx expo start --clear`

### Error: "redirect_uri_mismatch"

This means the redirect URI doesn't match. The error message will show the exact URI expected - add that exact URI to Google Cloud Console.

### Can't Find the OAuth Client ID?

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Look for **OAuth 2.0 Client IDs**
3. Find the one that matches your Firebase Web Client ID (the numbers before `.apps.googleusercontent.com` should match)
4. If you can't find it, go back to Firebase Console → Authentication → Sign-in method → Google, and copy the Web Client ID, then search for it in Google Cloud Console

## Why Web Works But Mobile Doesn't

- **Web**: Firebase SDK handles OAuth redirects automatically using browser redirects
- **Mobile**: `expo-auth-session` uses custom deep link redirects (`com.event://oauth`) that must be explicitly configured in Google Cloud Console

Both use the same OAuth Client ID, but mobile requires additional redirect URI configuration.

## Quick Reference

- **Firebase Project**: `e-vent-aa93e`
- **App Scheme**: `com.event` (from `app.json`)
- **Redirect URI Format**: `{scheme}://oauth` = `com.event://oauth`
- **Firebase Console**: https://console.firebase.google.com/
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials

