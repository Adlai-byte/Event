# Verify Tunnel Forwarding - Final Check

## Current Status
- ✅ Server ay gumagana sa localhost (`HTTP/1.1 200 OK`)
- ✅ Tunnel ay nagre-register ng connections
- ❌ Pero may ERRORS: `ERR failed to serve tunnel connection`
- ❌ Tunnel URL ay nag-return ng 404

## Step 1: I-verify ang ping_group_range

```bash
# Sa VPS terminal
cat /proc/sys/net/ipv4/ping_group_range
cat /etc/sysctl.conf | grep ping_group_range
```

**Expected:** Dapat makita mo ang `0 0` sa pareho

## Step 2: I-check ang Current Tunnel URL

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected:** Dapat makita mo ang current tunnel URL

## Step 3: I-test ang Tunnel URL (Full Response)

```bash
# Sa VPS terminal
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1 | awk '{print $NF}')

echo "Testing tunnel URL: ${TUNNEL_URL}"

curl -v ${TUNNEL_URL}/api/health 2>&1 | head -50
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 200` (hindi 404 o 530)
- `{"ok":true}` sa body

## Step 4: Kung 404 pa rin, I-check ang Tunnel Configuration

```bash
# Sa VPS terminal
pm2 show cloudflare-tunnel | grep -i "args\|script"
```

**Expected:** Dapat makita mo ang `tunnel --url http://localhost:3001`

## Step 5: I-check kung ang Server ay Accessible from Tunnel

```bash
# Sa VPS terminal
# I-test kung ang server ay nagre-respond sa requests na may Origin header
curl -v http://localhost:3001/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | head -30
```

**Expected:** Dapat makita mo ang `HTTP/1.1 200 OK` at CORS headers

## Step 6: I-restart ang Tunnel (Complete Restart)

```bash
# Sa VPS terminal
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# I-start ulit (adjust based on your PM2 config)
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001

# O kung may ecosystem file:
# pm2 start ecosystem.config.js --only cloudflare-tunnel

sleep 10

# I-check ang logs
pm2 logs cloudflare-tunnel --lines 50
```

## Step 7: I-get ang Bagong Tunnel URL

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

## Step 8: I-test ang Bagong Tunnel URL

```bash
# Sa VPS terminal
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1 | awk '{print $NF}')

curl -v ${TUNNEL_URL}/api/health 2>&1 | grep -E "HTTP/|ok"
```

**Expected:** Dapat makita mo ang `HTTP/2 200` at `{"ok":true}`

