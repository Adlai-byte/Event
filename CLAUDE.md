# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-Vent is a cross-platform event service booking marketplace built with React Native/Expo (frontend) and Express.js/MySQL (backend). Users browse and book event services (photographers, DJs, venues, etc.), providers manage their offerings and bookings, and admins moderate the platform. Three user roles: **user**, **provider**, **admin**.

## Common Commands

### Frontend (root directory)
```bash
npm start                    # Start Expo dev server (auto-detects IP)
npm run web                  # Run web version
npm run android              # Run on Android emulator
npm run ios                  # Run on iOS simulator
npm run type-check           # TypeScript type checking
npm run clean                # Clear cache and .expo directory
npm run build:android        # Build Android APK via PowerShell script
```

### Backend (server/ directory)
```bash
npm start                    # Start Express server (node index.js)
npm run dev                  # Development mode
npm run test:db              # Test database connection
```

No test framework is configured. No linter is configured.

## Architecture

### MVC Frontend Pattern (`mvc/`)
- **models/**: Data structures and state classes (User, AuthState, FormData, Service, Message, Hiring)
- **views/**: Screen components organized by role (`user/`, `provider/`, `admin/`), plus shared `LandingPage.tsx` and `LoginView.tsx`
- **controllers/**: Business logic (AuthController, HiringController, MessagingController)
- **services/**: API calls and external integrations (AuthService, firebase, GoogleWebAuth, api.ts, PushNotificationService)
- **components/**: Shared UI components (modals, calendars, notifications)

### Navigation
Navigation is **manual state-based** in `App.tsx` (no React Navigation library). Two levels:
1. `viewMode`: controls unauthenticated flow ('landing' | 'login' | 'register')
2. `mainView`: controls authenticated view switching ('dashboard' | 'bookings' | 'profile' | etc.)

All navigation happens through `setState` calls, not a router.

### Dual Database Strategy
- **Firebase**: Authentication (email/password + Google OAuth) and real-time messaging/notifications
- **MySQL**: All business data (users, services, bookings, payments, provider applications)

After Firebase auth, the app fetches the user's role and profile from MySQL.

### Backend (`server/`)
- **`index.js`**: Single large file containing all Express API routes (100+ endpoints)
- **`db.js`**: MySQL connection pool
- **`services/`**: PayMongo payment integration, PDF invoice generation
- **`database/`**: SQL schema files and migration scripts
- File uploads stored in `server/uploads/images/`

### API Base URL Resolution (`mvc/services/api.ts`)
Priority order: env var `EXPO_PUBLIC_API_BASE_URL` > auto-detection from dev server > platform-specific defaults (Android emulator uses `10.0.2.2:3001`) > VPS direct IP > Cloudflare tunnel URL.

### Platform-Responsive Design
The app detects screen width and platform to render differently:
- Mobile (< 768px): bottom tab navigation, mobile-optimized layouts
- Tablet (>= 768px): adjusted layouts
- Desktop web (>= 1024px): full desktop layout with landing page

## Key Technical Details

- React 19 + React Native 0.81 + Expo SDK 54
- TypeScript throughout frontend; backend is plain JavaScript
- Firebase config lives in `mvc/services/firebase.ts` and `google-services.json`
- EAS Build configured in `eas.json` with `EXPO_PUBLIC_API_BASE_URL` env var
- Auth state managed via `AuthState` class with immutable-style setter methods
- Role-based view access enforced in `App.tsx` render logic
- Push notifications registered post-login via `PushNotificationService.ts`
- Payment processing via PayMongo (GCash, InstaPay, cards)
