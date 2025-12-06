# Fix Cloudflare Tunnel Errors

## Problem Identified
- ✅ Server CORS config ay TAMA
- ✅ Server ay gumagana sa localhost
- ❌ Cloudflare Tunnel ay may errors at hindi nagfo-forward ng requests

## Step 1: I-restart ang Cloudflare Tunnel

```bash
# Sa VPS terminal
pm2 restart cloudflare-tunnel
sleep 5

# I-check ang status
pm2 list
pm2 logs cloudflare-tunnel --lines 20
```

## Step 2: I-fix ang ping_group_range Issue (Optional pero Recommended)

```bash
# Sa VPS terminal
# I-check ang current ping_group_range
cat /proc/sys/net/ipv4/ping_group_range

# I-set ang ping_group_range para sa root user (GID 0)
echo "0 0" | sudo tee /proc/sys/net/ipv4/ping_group_range

# I-verify
cat /proc/sys/net/ipv4/ping_group_range
```

**Expected:** Dapat makita mo ang `0 0` (allows GID 0 which is root)

## Step 3: I-restart ang Cloudflare Tunnel ulit

```bash
# Sa VPS terminal
pm2 restart cloudflare-tunnel
sleep 5

# I-check ang logs - dapat walang errors
pm2 logs cloudflare-tunnel --lines 30 | grep -i "error\|warn\|inf"
```

**Expected:** Dapat makita mo ang `INF` messages na successful, walang `ERR` o `WRN` messages.

## Step 4: I-get ang Bagong Tunnel URL

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected:** Dapat makita mo ang bagong tunnel URL (e.g., `https://furthermore-boat-heated-elect.trycloudflare.com`)

## Step 5: I-test ang Tunnel URL

```bash
# Sa VPS terminal
# I-test ang OPTIONS request sa tunnel URL
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1 | awk '{print $NF}')

curl -v -X OPTIONS ${TUNNEL_URL}/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "< |HTTP/"
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 204` o `HTTP/2 200`
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `< access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`

## Step 6: Kung Gumagana na, I-update ang Vercel Environment Variable

1. Pumunta sa Vercel Dashboard → Project → Settings → Environment Variables
2. I-update ang `EXPO_PUBLIC_API_BASE_URL` sa bagong tunnel URL
3. I-save at mag-redeploy

## Alternative: I-check kung may ibang Cloudflare Tunnel Process

```bash
# Sa VPS terminal
ps aux | grep cloudflared
pm2 list | grep cloudflare
```

Kung may multiple processes, i-stop lahat at i-start ulit:

```bash
# Sa VPS terminal
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel
# Then i-start ulit based on your PM2 ecosystem config
```

