# Quick Fix: Google Login 404 Error on Mobile (Firebase)

## The Problem
Google login works on web but returns a **404 error** on mobile. This happens because the redirect URI used by the mobile app is not configured in your Firebase/Google Cloud project.

**Important**: Firebase uses Google Cloud Console for OAuth. When you enable Google sign-in in Firebase, it creates an OAuth Client ID in Google Cloud Console. The **Web Client ID** from Firebase is the same as the **OAuth 2.0 Client ID** in Google Cloud Console.

## Quick Solution (5 minutes)

### Step 1: Get Your Redirect URI
1. Run your app: `npx expo start`
2. Try to login with Google on mobile
3. **Check the console logs** - you'll see output like:
   ```
   🔗 Redirect URI (using): https://auth.expo.io/@your-username/Event
   🔗 Redirect URI (alternative): com.event://oauth
   ```
4. **Copy BOTH redirect URIs** from the console

### Step 2: Get Your Firebase Web Client ID
1. Go to: **https://console.firebase.google.com/**
2. Select your project (`e-vent-aa93e`)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Under **Web SDK configuration**, copy the **Web client ID**
   - Format: `XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com`
   - This is the same as your OAuth Client ID in Google Cloud Console

### Step 3: Add Redirect URIs to Google Cloud Console
1. Go to: **https://console.cloud.google.com/apis/credentials**
2. **Select the same project** (`e-vent-aa93e`) - this is your Firebase project
3. Find your **OAuth 2.0 Client ID** (this is the **Web Client ID** you copied from Firebase)
4. Click **Edit**
5. Scroll to **Authorized redirect URIs**
6. Click **+ ADD URI**
7. Add the **first redirect URI** from Step 1 (the one marked "using")
8. Click **+ ADD URI** again
9. Add the **second redirect URI** (the alternative one)
10. Click **Save**

### Step 3: Wait and Test
1. Wait **1-2 minutes** for changes to propagate
2. Try Google login on mobile again
3. The 404 error should be resolved!

## Common Redirect URIs

Depending on your setup, you may see one of these formats:

### For Expo Go (Development)
- `https://auth.expo.io/@your-username/Event` (most common)
- `exp://127.0.0.1:8081/--/oauth` (localhost)
- `exp://192.168.x.x:8081/--/oauth` (network IP)

### For Standalone Builds
- `com.event://oauth` (deep link)

## Still Getting 404?

1. **Check the exact error message** - it will show the redirect URI that's missing
2. **Verify the URI matches exactly** - copy it character by character
3. **Check console logs** - the exact redirect URI is logged when you try to login
4. **Wait longer** - Google Cloud changes can take a few minutes to propagate
5. **Clear cache**: `npx expo start --clear`

## Why This Happens

- **Web**: Uses Firebase's built-in OAuth with browser redirects (automatically configured by Firebase)
- **Mobile**: Uses `expo-auth-session` which generates custom redirect URIs that must be manually added to the OAuth Client ID in Google Cloud Console

The redirect URI format differs between development (Expo Go) and production (standalone builds), so you may need to add multiple URIs.

## Firebase vs Google Cloud Console

**They're the same project!** When you use Firebase:
- Firebase Console: Where you manage your app and see the Web Client ID
- Google Cloud Console: Where you configure OAuth settings (redirect URIs)
- Both use the same project ID (`e-vent-aa93e` in your case)
- The Web Client ID from Firebase = OAuth Client ID in Google Cloud Console

## Need Help?

If you're still stuck:
1. Check the console logs for the exact redirect URI
2. The error message in the app will also show the redirect URIs
3. Make sure you're adding them to the **Web Client ID** (not Android/iOS client ID)
4. Verify you're in the same project in both Firebase and Google Cloud Console

