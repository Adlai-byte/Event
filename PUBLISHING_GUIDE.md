# Publishing Guide for Event App

This guide covers how to publish both your React Native Expo app and your backend server.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Server Deployment](#backend-server-deployment)
3. [Mobile App Publishing](#mobile-app-publishing)
4. [Production Configuration](#production-configuration)
5. [Testing Before Publishing](#testing-before-publishing)

---

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Backend Hosting**: Choose a hosting service (see options below)

---

## Backend Server Deployment

Your backend needs to be accessible from the internet. Here are recommended options:

### Option 1: Railway (Recommended - Easy Setup)
1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project
3. Connect your GitHub repository or deploy directly
4. Add environment variables:
   - `PORT=3001`
   - `DB_HOST=your_mysql_host`
   - `DB_USER=your_db_user`
   - `DB_PASSWORD=your_db_password`
   - `DB_NAME=your_db_name`
   - Add other required env vars from your `.env` file
5. Railway will provide a URL like: `https://your-app.railway.app`
6. Update your API base URL in the app to use this URL

### Option 2: Render
1. Go to [render.com](https://render.com) and sign up
2. Create a new Web Service
3. Connect your repository
4. Set build command: `npm install`
5. Set start command: `node server/index.js`
6. Add environment variables
7. Render provides a URL like: `https://your-app.onrender.com`

### Option 3: Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Add MySQL addon: `heroku addons:create cleardb:ignite`
5. Set environment variables: `heroku config:set KEY=value`
6. Deploy: `git push heroku main`

### Option 4: Using ngrok (For Testing Only)
⚠️ **Note**: ngrok is for development/testing, not production!

1. Extract `ngrok.exe` from `ngrok.zip`
2. Start your server: `npm run server`
3. In another terminal, run:
   ```bash
   ngrok http 3001
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Use this URL temporarily for testing

---

## Mobile App Publishing

### Step 1: Install EAS CLI and Login

```bash
npm install -g eas-cli
eas login
```

### Step 2: Configure EAS Build

Initialize EAS in your project:

```bash
eas build:configure
```

This creates an `eas.json` file. Update it with production settings:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-backend-url.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 3: Update app.json for Production

Add production configuration to `app.json`:

```json
{
  "expo": {
    "name": "Event",
    "slug": "Event",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.ploxy1.Event"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "package": "com.ploxy1.Event",
      "versionCode": 1
    },
    "scheme": "com.event",
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

### Step 4: Build for Android (APK - Testing)

Build an APK for testing:

```bash
eas build --platform android --profile preview
```

This creates an APK you can install directly on Android devices.

### Step 5: Build for Production

#### Android (AAB for Google Play Store)

```bash
eas build --platform android --profile production
```

#### iOS (for App Store)

```bash
eas build --platform ios --profile production
```

**Note**: iOS builds require:
- Apple Developer account ($99/year)
- Proper certificates and provisioning profiles (EAS handles this)

### Step 6: Submit to App Stores

#### Google Play Store

1. Build production AAB: `eas build --platform android --profile production`
2. Submit: `eas submit --platform android`
3. Or manually upload the AAB from [expo.dev](https://expo.dev)

#### Apple App Store

1. Build production iOS: `eas build --platform ios --profile production`
2. Submit: `eas submit --platform ios`
3. Or manually upload via Xcode/App Store Connect

---

## Production Configuration

### 1. Update API Base URL

Create a `.env.production` file or update `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-production-backend.com"
      }
    }
  }
}
```

### 2. Update Backend CORS Settings

In `server/index.js`, update CORS to allow your production domain:

```javascript
const corsOptions = {
  origin: [
    'https://your-app-domain.com',
    'exp://your-expo-url',
    // Add other allowed origins
  ],
  credentials: true
};
app.use(cors(corsOptions));
```

### 3. Database Configuration

Ensure your production database:
- Is accessible from your hosting service
- Has proper security settings
- Has backups enabled
- Uses strong passwords

### 4. Environment Variables Checklist

Make sure these are set in your hosting service:

**Backend (.env):**
- `PORT=3001`
- `DB_HOST=`
- `DB_USER=`
- `DB_PASSWORD=`
- `DB_NAME=`
- `JWT_SECRET=` (if using JWT)
- `PAYMONGO_SECRET_KEY=` (if using PayMongo)
- `DRAGONPAY_MERCHANT_ID=` (if using Dragonpay)
- Any other API keys

**Frontend (EAS Build):**
- `EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.com`

---

## Testing Before Publishing

### 1. Test Backend Deployment

```bash
# Test health endpoint
curl https://your-backend-url.com/api/health

# Test API endpoints
curl https://your-backend-url.com/api/user/bookings?email=test@example.com
```

### 2. Test Mobile App with Production API

1. Update `EXPO_PUBLIC_API_BASE_URL` in your local `.env` or `package.json` scripts
2. Run: `npm start`
3. Test all features:
   - Login/Registration
   - Booking creation
   - Messaging
   - Payments
   - Service browsing

### 3. Build Preview APK

```bash
eas build --platform android --profile preview
```

Install the APK on a physical device and test thoroughly.

---

## Quick Start Commands

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure EAS
eas build:configure

# 4. Build preview APK (for testing)
eas build --platform android --profile preview

# 5. Build production AAB (for Play Store)
eas build --platform android --profile production

# 6. Submit to Play Store
eas submit --platform android
```

---

## Troubleshooting

### Build Fails
- Check `eas.json` configuration
- Ensure all assets (icon, splash) exist
- Check Expo SDK version compatibility

### API Connection Issues
- Verify backend URL is correct
- Check CORS settings
- Ensure backend is running and accessible
- Test with `curl` or Postman

### Database Connection Issues
- Verify database credentials
- Check if database allows connections from hosting IP
- Ensure database is running

---

## Next Steps

1. ✅ Deploy backend to Railway/Render/Heroku
2. ✅ Update `EXPO_PUBLIC_API_BASE_URL` in production build
3. ✅ Build preview APK and test
4. ✅ Build production AAB/IPA
5. ✅ Submit to app stores
6. ✅ Monitor for errors and user feedback

---

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Deployment Guide](https://docs.expo.dev/distribution/introduction/)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)

