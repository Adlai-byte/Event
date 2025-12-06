# Get New Cloudflare Tunnel URL

## Step 1: Kunin ang Bagong Tunnel URL

```bash
# Sa VPS terminal

# I-check ang tunnel logs para sa URL
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected Output:** 
```
0|cloudfla | 2025-12-01T18:XX:XXZ INF | https://new-tunnel-url.trycloudflare.com
```

I-copy ang URL mula sa output.

## Step 2: I-test ang Bagong Tunnel URL

```bash
# Sa VPS (palitan ang NEW_TUNNEL_URL sa actual URL)
curl https://NEW_TUNNEL_URL.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}`

## Step 3: I-update ang Vercel

1. Vercel Dashboard → Project → Settings → Environment Variables
2. I-update ang `EXPO_PUBLIC_API_BASE_URL` sa bagong tunnel URL
3. I-click "Save"
4. Mag-redeploy sa Deployments tab

## Alternative: I-check ang Tunnel Status

```bash
# Sa VPS
pm2 logs cloudflare-tunnel --lines 50
```

Hanapin ang line na may `https://...trycloudflare.com`

