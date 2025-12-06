# Fix Vercel Environment Variable - CRITICAL

## Root Cause
1. ❌ Vercel ay may `NEXT_PUBLIC_API_URL` pero ang code ay naghahanap ng `EXPO_PUBLIC_API_BASE_URL`
2. ❌ Cloudflare tunnel URLs ay TEMPORARY - nagbabago sa bawat restart

## Step 1: I-test ang Bagong Tunnel URL

```bash
# Sa VPS terminal
curl -v https://operates-sectors-murphy-dolls.trycloudflare.com/api/health 2>&1 | grep -E "HTTP/|ok"
```

**Expected:** Dapat makita mo ang `HTTP/2 200` at `{"ok":true}`

## Step 2: I-update ang Vercel Environment Variable (CRITICAL)

1. Pumunta sa Vercel Dashboard → Project → Settings → Environment Variables
2. **DELETE** ang `NEXT_PUBLIC_API_URL` (mali ang name)
3. **ADD** ang `EXPO_PUBLIC_API_BASE_URL` (tama ang name)
4. I-set ang value sa:
   ```
   https://operates-sectors-murphy-dolls.trycloudflare.com
   ```
5. I-set sa "All Environments"
6. I-click "Save"

## Step 3: Mag-redeploy sa Vercel (CRITICAL)

**MUST REDEPLOY** para ma-apply ang environment variable changes:

1. Pumunta sa Deployments tab
2. I-click "Redeploy" sa latest deployment
3. Hintayin matapos (1-3 minutes)

## Step 4: I-verify sa Browser

1. I-open ang Vercel app: `https://e-vent-jade.vercel.app`
2. I-open ang Developer Console (F12)
3. Dapat:
   - ✅ Console log: `🌐 Using API base URL from environment: https://operates-sectors-murphy-dolls.trycloudflare.com`
   - ✅ Walang CORS error
   - ✅ May response mula sa API

## LONG-TERM SOLUTION: Permanent Cloudflare Tunnel

Ang quick tunnels ay temporary. Para sa production, kailangan mo ng **named tunnel** na may permanent URL:

1. I-create ng Cloudflare account
2. I-setup ng named tunnel
3. I-configure ng custom domain o permanent tunnel URL

Pero para sa ngayon, i-update mo muna ang Vercel environment variable at mag-redeploy.
