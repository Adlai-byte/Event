# Fix: Use Chrome Browser for OAuth on Android

## Problem
OAuth flow is being dismissed or not working properly because it's opening in the default browser instead of Chrome.

## Solution
The code has been updated to explicitly use Chrome browser on Android devices for the OAuth flow.

## Changes Made

1. **Added Chrome Browser Package** - The OAuth flow now explicitly specifies `com.android.chrome` as the browser package on Android
2. **Better Browser Options** - Configured browser options to ensure Chrome is used

## How It Works

When the OAuth flow starts on Android:
- The app explicitly requests Chrome browser (`com.android.chrome`)
- This ensures consistent behavior and better redirect handling
- Chrome has better support for OAuth redirects and deep links

## Testing

1. Make sure Chrome is installed on your Android device
2. Try Google login again
3. The OAuth flow should now open in Chrome instead of the default browser
4. Check console logs - you should see: `🔵 Using Chrome browser (com.android.chrome) for OAuth on Android`

## Troubleshooting

### Chrome Not Opening
- Make sure Chrome is installed on the device
- If Chrome is not installed, the system will fall back to the default browser
- Check device logs for any browser-related errors

### Still Getting Dismissed
- Verify the redirect URI is correctly configured in Google Cloud Console
- Check that Chrome can handle the deep link redirect (`com.event://oauth`)
- Make sure the app scheme is properly configured in `app.json`

## Notes

- This only affects Android devices
- iOS uses Safari by default (which works well for OAuth)
- Web platform uses the browser's built-in OAuth flow



