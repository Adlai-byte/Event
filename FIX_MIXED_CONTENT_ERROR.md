# Fix: Mixed Content Error sa Vercel

## Problem
- ❌ **Mixed Content Error:** Ang Vercel app ay HTTPS, pero ang API ay HTTP
- ❌ **Browser Block:** Browsers block HTTP requests from HTTPS pages
- ❌ **Failed to fetch:** Hindi makakonekta ang app sa API

## Root Cause
Ang code ay gumagamit ng `http://72.62.64.59:3001` (HTTP) sa production, pero ang Vercel app ay `https://` (HTTPS). Browsers automatically block HTTP requests from HTTPS pages para sa security.

## Solution: Gamitin ang Cloudflare Tunnel HTTPS URL

### Step 1: I-verify na Tumatakbo ang Cloudflare Tunnel sa VPS

```bash
# SSH sa VPS
ssh root@72.62.64.59

# I-check kung tumatakbo ang tunnel
pm2 list | grep cloudflare-tunnel
```

**Expected:** Dapat makita mo ang `cloudflare-tunnel` na **online**

**Kung hindi tumatakbo:**
```bash
# I-start ang tunnel
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save

# Hintayin ng 10 seconds para mag-initialize
sleep 10
```

### Step 2: Kunin ang Current Cloudflare Tunnel URL

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected Output:**
```
0|cloudfla | 2025-XX-XX INF | https://new-tunnel-url.trycloudflare.com
```

**I-copy ang URL** (halimbawa: `https://new-tunnel-url.trycloudflare.com`)

### Step 3: I-test ang Tunnel URL

```bash
# Sa VPS (palitan ang NEW_TUNNEL_URL sa actual URL)
curl https://NEW_TUNNEL_URL.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}`

**Kung hindi gumagana:**
- I-check kung tumatakbo ang server: `curl http://localhost:3001/api/health`
- I-restart ang tunnel: `pm2 restart cloudflare-tunnel`
- Hintayin ng 10 seconds at i-try ulit

### Step 4: I-update ang Vercel Environment Variable

1. **Pumunta sa Vercel Dashboard:**
   - https://vercel.com → Login → Piliin ang project mo

2. **Pumunta sa Settings:**
   - Project → Settings → Environment Variables

3. **I-add o I-update ang Environment Variable:**
   - **Key:** `EXPO_PUBLIC_API_BASE_URL`
   - **Value:** `https://NEW_TUNNEL_URL.trycloudflare.com` (yung URL mula sa Step 2)
   - **Environment:** All Environments
   - I-click **Save**

**IMPORTANT:** Dapat nagsisimula sa `https://` (hindi `http://`)!

### Step 5: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. Hintayin matapos ang deployment (1-3 minutes)

### Step 6: I-verify sa Browser

1. I-open ang Vercel app (halimbawa: `https://your-app.vercel.app`)
2. I-open ang Developer Console (F12)
3. Dapat:
   - ✅ Console log: `🌐 Using API base URL from environment: https://NEW_TUNNEL_URL.trycloudflare.com`
   - ✅ **WALANG** mixed content error
   - ✅ **WALANG** "Failed to fetch" error
   - ✅ May response mula sa API

## Alternative: Gamitin ang Direct IP (May Mixed Content Warning)

Kung hindi mo ma-setup ang Cloudflare tunnel, pwede mong gamitin ang direct IP, pero may mixed content warning:

1. **I-update ang Vercel Environment Variable:**
   - **Key:** `EXPO_PUBLIC_API_BASE_URL`
   - **Value:** `http://72.62.64.59:3001`
   - **Environment:** All Environments

2. **Mag-redeploy sa Vercel**

**Note:** May mixed content warning pa rin, pero pwede mong i-allow sa browser (hindi recommended para sa production).

## Long-term Solution: Permanent Cloudflare Tunnel

Ang quick tunnels (`trycloudflare.com`) ay temporary at nagbabago. Para sa production, mas maganda kung mag-setup ka ng **named tunnel** na may permanent URL:

1. I-create ng Cloudflare account (free)
2. I-setup ng named tunnel
3. I-configure ng custom domain o permanent tunnel URL

Tingnan ang `WHY_TUNNEL_URL_CHANGES.md` para sa detailed instructions.

## Current Status

✅ **Code Updated:** Ang code ay na-update na para gamitin ang HTTPS tunnel URL sa production (kung available)
✅ **Next Step:** I-verify na tumatakbo ang Cloudflare tunnel, kunin ang URL, at i-set sa Vercel environment variable

