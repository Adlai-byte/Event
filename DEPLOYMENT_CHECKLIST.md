# Deployment Checklist

Use this checklist to ensure everything is ready before publishing.

## Backend Server

- [ ] Backend deployed to hosting service (Railway/Render/Heroku)
- [ ] Backend URL is accessible (test with browser/curl)
- [ ] Database is accessible from hosting service
- [ ] All environment variables are set in hosting service
- [ ] CORS is configured to allow your app domain
- [ ] File uploads directory is configured
- [ ] Health check endpoint works: `/api/health`
- [ ] Test all API endpoints work with production URL

## Database

- [ ] Production database created
- [ ] Database schema migrated
- [ ] Test data seeded (if needed)
- [ ] Database backups configured
- [ ] Database credentials are secure

## Mobile App Configuration

- [ ] `eas.json` created and configured
- [ ] `app.json` updated with production settings
- [ ] App icon and splash screen are set
- [ ] App version number updated
- [ ] Android package name is correct: `com.ploxy1.Event`
- [ ] iOS bundle identifier is correct (if publishing to iOS)

## API Configuration

- [ ] `EXPO_PUBLIC_API_BASE_URL` set in `eas.json` production profile
- [ ] API base URL points to production backend
- [ ] Test app connects to production API
- [ ] All API calls work correctly

## Testing

- [ ] Build preview APK and test on physical device
- [ ] Test login/registration
- [ ] Test booking creation
- [ ] Test messaging functionality
- [ ] Test payment flow (if applicable)
- [ ] Test service browsing and details
- [ ] Test on different Android versions (if possible)
- [ ] Test on different screen sizes

## App Store Preparation

### Google Play Store
- [ ] Google Play Developer account created ($25 one-time fee)
- [ ] App listing prepared (description, screenshots, etc.)
- [ ] Privacy policy URL ready
- [ ] App content rating completed
- [ ] Production AAB built successfully
- [ ] App signing key configured

### Apple App Store (if applicable)
- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect app created
- [ ] App listing prepared
- [ ] Privacy policy URL ready
- [ ] App content rating completed
- [ ] Production IPA built successfully
- [ ] Certificates and provisioning profiles configured

## Security

- [ ] All API keys are in environment variables (not hardcoded)
- [ ] Database passwords are strong
- [ ] JWT secrets are secure
- [ ] Payment API keys are secure
- [ ] No sensitive data in code or logs

## Monitoring

- [ ] Error tracking set up (Sentry, etc.)
- [ ] Analytics configured (if needed)
- [ ] Server monitoring configured
- [ ] Database monitoring configured

## Documentation

- [ ] API documentation updated
- [ ] User guide prepared (if needed)
- [ ] Deployment guide reviewed
- [ ] Team members have access to necessary accounts

## Final Steps

- [ ] All tests pass
- [ ] Code reviewed
- [ ] Backup of current version
- [ ] Rollback plan prepared
- [ ] Team notified of deployment

---

## Quick Test Commands

```bash
# Test backend health
curl https://your-backend-url.com/api/health

# Build preview APK
npm run build:android:preview

# Build production AAB
npm run build:android:production

# Submit to Play Store
npm run submit:android
```

---

## Post-Deployment

- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Monitor server performance
- [ ] Verify all features work in production
- [ ] Update documentation if needed

