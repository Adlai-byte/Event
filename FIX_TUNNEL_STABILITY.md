# Fix Cloudflare Tunnel Stability - Critical Errors

## Problem Identified
- ✅ Server ay gumagana sa localhost
- ✅ Tunnel ay configured correctly
- ✅ Tunnel ay nagre-register ng connections
- ❌ Pero may ERRORS: `ERR failed to serve tunnel connection` - kaya hindi nagfo-forward

## Root Cause
Ang tunnel ay unstable dahil sa:
1. `ping_group_range` ay nagre-reset (baka hindi permanent)
2. Tunnel ay may connection errors

## Step 1: I-fix ang ping_group_range Permanently

```bash
# Sa VPS terminal
# I-check ang current value
cat /proc/sys/net/ipv4/ping_group_range

# I-set ulit
echo "0 0" | sudo tee /proc/sys/net/ipv4/ping_group_range

# I-verify
cat /proc/sys/net/ipv4/ping_group_range
```

**Expected:** Dapat makita mo ang `0 0`

## Step 2: I-make Permanent ang ping_group_range

```bash
# Sa VPS terminal
# I-add sa sysctl.conf para permanent
echo "net.ipv4.ping_group_range = 0 0" | sudo tee -a /etc/sysctl.conf

# I-apply
sudo sysctl -p
```

**Expected:** Dapat makita mo ang `net.ipv4.ping_group_range = 0 0`

## Step 3: I-restart ang Cloudflare Tunnel

```bash
# Sa VPS terminal
pm2 restart cloudflare-tunnel
sleep 10

# I-check ang logs - dapat walang ERR messages
pm2 logs cloudflare-tunnel --lines 50 | grep -i "error\|warn\|registered"
```

**Expected:** Dapat makita mo ang:
- `INF Registered tunnel connection` (successful)
- Walang `ERR` messages
- Walang `WRN` messages about ping_group_range

## Step 4: I-get ang Bagong Tunnel URL

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected:** Dapat makita mo ang bagong tunnel URL

## Step 5: I-test ang Tunnel URL

```bash
# Sa VPS terminal
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1 | awk '{print $NF}')

curl -v ${TUNNEL_URL}/api/health 2>&1 | grep -E "HTTP/|ok"
```

**Expected:** Dapat makita mo ang `HTTP/2 200` at `{"ok":true}` (hindi 404)

## Step 6: I-test ang OPTIONS Request (Preflight)

```bash
# Sa VPS terminal
curl -v -X OPTIONS ${TUNNEL_URL}/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "< |HTTP/"
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 204` o `HTTP/2 200`
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `< access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`

## Step 7: Kung GUMAGANA, I-update ang Code at Vercel

1. I-update ang `mvc/services/api.ts` sa bagong tunnel URL
2. I-update ang Vercel environment variable `EXPO_PUBLIC_API_BASE_URL`
3. Mag-redeploy sa Vercel

