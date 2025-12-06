# Fix: Metro Bundler MIME Type Error

## Problem
- ❌ **500 Internal Server Error** sa `index.bundle`
- ❌ **MIME Type Error:** `application/json` instead of `application/javascript`
- ❌ **Refused to execute script** dahil sa wrong MIME type

## Root Cause
Ang Metro bundler (Expo dev server) ay nag-return ng error response (JSON) instead ng JavaScript bundle, kaya ang browser ay nag-detect ng wrong MIME type.

## Solution: I-restart ang Metro Bundler

### Step 1: I-stop ang Current Dev Server

1. I-press `Ctrl+C` sa terminal kung saan nagra-run ang `npm start`
2. O kaya, i-close ang terminal window

### Step 2: I-clear ang Metro Cache

```bash
# Sa project directory
npx expo start --clear
```

**O kaya:**
```bash
# I-delete ang cache manually
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

### Step 3: I-verify na Walang Syntax Errors

I-check kung may syntax errors sa code:

```bash
# I-check ang TypeScript errors
npm run type-check
```

**O kaya, i-check manually:**
- I-open ang `mvc/views/LandingPage.tsx`
- I-verify na walang missing braces o syntax errors

### Step 4: I-restart ang Dev Server

```bash
# I-restart with clear cache
npm start
```

**O kaya:**
```bash
# Gamitin ang web-specific start
npm run web
```

## Alternative: I-check ang Port Conflict

Kung may port conflict:

```bash
# I-check kung may process na gumagamit ng port 8081
# Windows PowerShell:
netstat -ano | findstr :8081

# I-kill ang process kung kailangan
# (I-replace ang PID sa actual process ID)
taskkill /PID <PID> /F
```

## If Still Not Working

1. **I-close ang lahat ng terminal windows**
2. **I-restart ang computer** (kung kailangan)
3. **I-delete ang node_modules at i-reinstall:**
   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

## Check for Code Errors

I-verify na walang syntax errors sa recent changes:

1. **LandingPage.tsx** - I-check kung may missing braces
2. **App.tsx** - I-verify na tama ang imports
3. **Any new files** - I-check kung may syntax errors

## Expected Result

Pagkatapos ng restart, dapat:
- ✅ Walang 500 error
- ✅ `index.bundle` ay na-serve bilang `application/javascript`
- ✅ App ay naglo-load successfully



