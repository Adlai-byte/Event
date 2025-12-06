# Update Vercel Environment Variable - Tunnel URL Found!

## ✅ Tunnel URL Found
**Working Tunnel URL:** `https://tongue-owners-slightly-acm.trycloudflare.com`

**Verified:** ✅ API is running (confirmed via web search)

## Step 1: I-update ang Vercel Environment Variable

1. **Pumunta sa Vercel Dashboard:**
   - https://vercel.com → Login → Piliin ang project mo

2. **Pumunta sa Settings:**
   - Project → Settings → Environment Variables

3. **I-add o I-update ang Environment Variable:**
   - **Key:** `EXPO_PUBLIC_API_BASE_URL`
   - **Value:** `https://tongue-owners-slightly-acm.trycloudflare.com`
   - **Environment:** All Environments
   - I-click **Save**

**IMPORTANT:** 
- ✅ Dapat nagsisimula sa `https://` (hindi `http://`)
- ✅ Walang trailing slash sa dulo
- ✅ Dapat naka-set sa "All Environments"

## Step 2: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. Hintayin matapos ang deployment (1-3 minutes)

## Step 3: I-verify sa Browser

1. I-open ang Vercel app (halimbawa: `https://your-app.vercel.app`)
2. I-open ang Developer Console (F12)
3. Dapat:
   - ✅ Console log: `🌐 Using API base URL from environment: https://tongue-owners-slightly-acm.trycloudflare.com`
   - ✅ **WALANG** mixed content error
   - ✅ **WALANG** "Failed to fetch" error
   - ✅ May response mula sa API

## Step 4: I-test ang API Directly

Pwede mo ring i-test ang API directly sa browser:

```
https://tongue-owners-slightly-acm.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}` o similar response

## Important Notes

### About the Tunnel URL

- ✅ **HTTPS:** Walang mixed content error
- ⚠️ **Temporary:** Quick tunnel URLs ay nagbabago kapag nag-restart ang tunnel
- 💡 **Long-term:** Para sa production, mas maganda kung mag-setup ka ng named tunnel na may permanent URL

### If the URL Changes

Kung nag-restart ang tunnel at nagbago ang URL:

1. I-check ang logs: `pm2 logs cloudflare-tunnel --lines 100 --nostream | grep -i "https://.*trycloudflare.com" | tail -1`
2. I-update ang Vercel environment variable sa bagong URL
3. Mag-redeploy sa Vercel

## Current Status

✅ **Tunnel URL Found:** `https://tongue-owners-slightly-acm.trycloudflare.com`
✅ **API Verified:** Working (confirmed)
✅ **Next Step:** I-update ang Vercel environment variable at mag-redeploy

