# Fix 404 Error sa Cloudflare Tunnel

## Problem
Ang tunnel URL ay umaabot sa Cloudflare pero nagre-return ng 404. Ibig sabihin, ang tunnel ay hindi properly forwarding ang requests sa server.

## Solution: I-verify ang Tunnel Configuration

### Step 1: I-verify na Tumatakbo ang Server Locally

```bash
# Sa VPS
curl http://localhost:3001/api/health
```

**Expected:** `{"ok":true}`

Kung hindi gumagana, may issue sa server.

### Step 2: I-check ang Tunnel Configuration

```bash
# Sa VPS
pm2 describe cloudflare-tunnel | grep -i "script\|args"
```

Dapat makita mo na ang tunnel ay pointing sa `http://localhost:3001`.

### Step 3: I-check ang Tunnel Logs

```bash
# Sa VPS
pm2 logs cloudflare-tunnel --lines 50 | grep -i "error\|tunnel\|connected\|localhost"
```

**Hanapin:**
- `url: http://localhost:3001` - Dapat makita mo ito
- Walang connection errors
- Tunnel ay connected

### Step 4: I-restart ang Tunnel Properly

```bash
# Sa VPS

# I-stop ang lahat ng tunnel instances
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# I-start ulit (isa lang)
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save

# Wait 10 seconds
sleep 10

# I-check ang new URL
pm2 logs cloudflare-tunnel --lines 100 --nostream | grep -i "trycloudflare.com" | tail -1
```

### Step 5: I-test ulit

```bash
# Sa VPS

# Test local
curl http://localhost:3001/api/health

# Test via tunnel (gamitin ang bagong URL)
curl https://NEW_TUNNEL_URL.trycloudflare.com/api/health
```

**Expected:** Parehong dapat `{"ok":true}`

## Common Issues

### Issue: Multiple Tunnel Instances
**Solution:** I-delete ang lahat at i-start ulit ng isa lang:
```bash
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save
```

### Issue: Tunnel pointing to wrong port
**Solution:** I-verify na ang tunnel ay pointing sa port 3001:
```bash
pm2 describe cloudflare-tunnel
```

### Issue: Server hindi tumatakbo
**Solution:**
```bash
pm2 status event-api
pm2 logs event-api --lines 20
```

