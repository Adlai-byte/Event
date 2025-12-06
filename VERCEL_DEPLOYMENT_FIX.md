# Fix Vercel Deployment - Cloudflare Tunnel Setup

## Problem
Ang Vercel app ay hindi makakonekta sa API dahil ang Cloudflare tunnel ay hindi tumatakbo o expired na ang URL.

## Solution: I-restart ang Tunnel at I-update ang Vercel

### Step 1: I-restart ang Cloudflare Tunnel sa VPS

```bash
# Sa VPS terminal

# I-check kung tumatakbo ang tunnel
pm2 list | grep cloudflare-tunnel

# I-restart ang tunnel
pm2 restart cloudflare-tunnel

# O kung hindi tumatakbo, i-start:
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save

# Wait 10 seconds para mag-initialize
sleep 10
```

### Step 2: Kunin ang Bagong Tunnel URL

```bash
# Sa VPS
pm2 logs cloudflare-tunnel --lines 200 --nostream | grep -i "https://.*trycloudflare.com" | tail -1
```

**IMPORTANT:** I-copy ang bagong URL (halimbawa: `https://new-tunnel-url.trycloudflare.com`)

### Step 3: I-verify na Tumatakbo ang Server

```bash
# Sa VPS
curl http://localhost:3001/api/health
```

**Expected:** `{"ok":true}`

### Step 4: I-test ang Tunnel URL

```bash
# Sa VPS (gamitin ang bagong URL)
curl https://NEW_TUNNEL_URL.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}` (hindi HTML error page)

### Step 5: I-update ang Vercel Environment Variable

1. **Pumunta sa Vercel Dashboard:**
   - https://vercel.com → Login → Piliin ang project mo

2. **Pumunta sa Settings:**
   - Project → Settings → Environment Variables

3. **I-update ang `EXPO_PUBLIC_API_BASE_URL`:**
   - Hanapin ang `EXPO_PUBLIC_API_BASE_URL`
   - I-update ang value sa bagong tunnel URL:
     ```
     https://NEW_TUNNEL_URL.trycloudflare.com
     ```
   - I-set sa "All Environments"
   - I-click "Save"

### Step 6: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. Hintayin matapos ang deployment (1-3 minutes)

### Step 7: I-verify sa Browser

1. I-open ang Vercel app: `https://e-vent-jade.vercel.app`
2. I-open ang Developer Console (F12)
3. Dapat:
   - ✅ Walang CORS error
   - ✅ Walang `ERR_NAME_NOT_RESOLVED` error
   - ✅ May response mula sa API
   - ✅ Console log: `🌐 Using production VPS API base URL: https://NEW_TUNNEL_URL.trycloudflare.com`

## Important Notes

1. **Tunnel URL Changes:** Quick tunnel URLs ay nagbabago tuwing i-restart ang tunnel. Para sa permanent URL, consider using Cloudflare Named Tunnel.

2. **Server Must Be Running:** Parehong ang server (`event-api`) at tunnel (`cloudflare-tunnel`) ay dapat tumatakbo sa VPS.

3. **Vercel Redeploy Required:** Pagkatapos mag-update ng environment variable, kailangan mag-redeploy.

## Quick Checklist

- [ ] Server ay tumatakbo sa VPS (`pm2 status` shows `event-api` online)
- [ ] Tunnel ay tumatakbo sa VPS (`pm2 status` shows `cloudflare-tunnel` online)
- [ ] Nakuha ang bagong tunnel URL mula sa logs
- [ ] Na-test ang tunnel URL (`curl` returns `{"ok":true}`)
- [ ] Na-update ang `EXPO_PUBLIC_API_BASE_URL` sa Vercel
- [ ] Na-redeploy ang Vercel deployment
- [ ] Na-verify sa browser (walang errors)

