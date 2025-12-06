# Fix: Vercel API URL - Mixed Content Error

## Problem
- ✅ Sa local, gumagana ang `http://72.62.64.59:3001`
- ❌ Sa Vercel, may **Mixed Content Error** - HTTP requests blocked from HTTPS page
- ❌ Cloudflare tunnel URL ay temporary at nagbabago

## Solution: Gamitin ang Cloudflare Tunnel HTTPS URL

**IMPORTANT:** Kailangan ng HTTPS URL para walang mixed content error sa Vercel (HTTPS site).

### Step 1: I-verify na Tumatakbo ang Cloudflare Tunnel sa VPS

```bash
# SSH sa VPS
ssh root@72.62.64.59

# I-check kung tumatakbo ang tunnel
pm2 list | grep cloudflare-tunnel

# Kunin ang current tunnel URL
pm2 logs cloudflare-tunnel --lines 200 --nostream | grep -i "https://.*trycloudflare.com" | tail -1
```

**Kung hindi tumatakbo:**
```bash
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save
sleep 10
```

### Step 2: I-update ang Vercel Environment Variable

1. **Pumunta sa Vercel Dashboard:**
   - https://vercel.com → Login → Piliin ang project mo

2. **Pumunta sa Settings:**
   - Project → Settings → Environment Variables

3. **I-add o I-update ang Environment Variable:**
   - **Key:** `EXPO_PUBLIC_API_BASE_URL`
   - **Value:** `https://NEW_TUNNEL_URL.trycloudflare.com` (yung URL mula sa Step 1)
   - **Environment:** All Environments
   - I-click **Save**

**IMPORTANT:** Dapat nagsisimula sa `https://` (hindi `http://`)!

### Step 2: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. Hintayin matapos ang deployment (1-3 minutes)

### Step 3: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. Hintayin matapos ang deployment (1-3 minutes)

### Step 4: I-verify sa Browser

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

## Current Status

✅ **Code Updated:** Ang code ay na-update na para gamitin ang HTTPS tunnel URL sa production (kung available)
✅ **Next Step:** I-verify na tumatakbo ang Cloudflare tunnel, kunin ang URL, at i-set sa Vercel environment variable

**Tingnan ang `FIX_MIXED_CONTENT_ERROR.md` para sa detailed step-by-step instructions.**

