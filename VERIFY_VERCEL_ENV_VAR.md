# Verify Vercel Environment Variable - Important!

## Problem
Ang app ay gumagamit pa rin ng old URL: `https://rentals-impaired-graphs-misc.trycloudflare.com`

## Root Cause
May dalawang possible reasons:
1. ❌ Hindi pa na-update ang Vercel environment variable
2. ❌ Hindi pa nag-redeploy sa Vercel
3. ⚠️ May hardcoded URL sa code (na-update na natin)

## Solution: I-verify at I-update ang Vercel Environment Variable

### Step 1: I-verify ang Vercel Environment Variable

1. **Pumunta sa Vercel Dashboard:**
   - https://vercel.com → Login → Piliin ang project mo

2. **Pumunta sa Settings:**
   - Project → Settings → Environment Variables

3. **I-check kung may `EXPO_PUBLIC_API_BASE_URL`:**
   - Kung **WALA**, i-add:
     - Key: `EXPO_PUBLIC_API_BASE_URL`
     - Value: `https://tongue-owners-slightly-acm.trycloudflare.com`
     - Environment: All Environments
   - Kung **MERON**, i-verify ang value:
     - Dapat: `https://tongue-owners-slightly-acm.trycloudflare.com`
     - Hindi dapat: `https://rentals-impaired-graphs-misc.trycloudflare.com`
     - Kung mali, i-update at i-click Save

### Step 2: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. Hintayin matapos ang deployment (1-3 minutes)

### Step 3: I-verify sa Browser

1. I-open ang Vercel app
2. I-open ang Developer Console (F12)
3. **Hard refresh** ang page (Ctrl+Shift+R o Cmd+Shift+R)
4. Dapat:
   - ✅ Console log: `🌐 Using API base URL from environment: https://tongue-owners-slightly-acm.trycloudflare.com`
   - ✅ **HINDI** `🌐 Using production VPS API base URL: ...`
   - ✅ Walang mixed content error
   - ✅ Walang "Failed to fetch" error

## Important Notes

### Priority ng API URL (mula sa code):

1. **Highest Priority:** `EXPO_PUBLIC_API_BASE_URL` environment variable
   - Kung naka-set ito, ito ang gagamitin
   - Console log: `🌐 Using API base URL from environment: ...`

2. **Second Priority:** `EXPO_PUBLIC_VPS_API_URL` environment variable
   - Fallback kung walang `EXPO_PUBLIC_API_BASE_URL`

3. **Last Priority:** Hardcoded URL sa code
   - Console log: `🌐 Using production VPS API base URL: ...`
   - Na-update na natin sa `https://tongue-owners-slightly-acm.trycloudflare.com`

### Kung Hindi Pa Rin Gumagana

1. **I-check ang Vercel deployment logs:**
   - Deployments → Latest deployment → Build Logs
   - Hanapin ang `EXPO_PUBLIC_API_BASE_URL` sa logs

2. **I-clear ang browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
   - O kaya, i-open sa Incognito/Private window

3. **I-verify na naka-set sa "All Environments":**
   - Dapat naka-check ang "Production", "Preview", at "Development"

## Current Status

✅ **Code Updated:** Hardcoded URL na-update na sa `https://tongue-owners-slightly-acm.trycloudflare.com`
✅ **Next Step:** I-verify na naka-set ang `EXPO_PUBLIC_API_BASE_URL` sa Vercel at mag-redeploy

