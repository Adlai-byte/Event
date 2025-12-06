# Fix Cloudflare Tunnel Error

## Problem
Ang server ay tumatakbo na (walang `allowedOrigins` error), pero ang Cloudflare tunnel ay nagre-return ng error page imbes na API response.

## Solution: I-check ang Tunnel at Server Connection

### Step 1: I-test ang Local Server

```bash
# Sa VPS
curl http://localhost:3001/api/health
```

**Expected:** `{"ok":true}`

Kung hindi gumagana, ang server ay hindi tumatakbo o may error.

### Step 2: I-check ang Cloudflare Tunnel

```bash
# Sa VPS
pm2 logs cloudflare-tunnel --lines 50 | grep -i "error\|tunnel\|connected"
```

**Expected:** Dapat makita mo ang tunnel na connected at walang errors.

### Step 3: I-restart ang Cloudflare Tunnel

```bash
# Sa VPS
pm2 restart cloudflare-tunnel

# Wait 5 seconds
sleep 5

# I-check ang new tunnel URL
pm2 logs cloudflare-tunnel --lines 100 --nostream | grep -i "trycloudflare.com" | tail -1
```

**IMPORTANT:** Ang tunnel URL ay maaaring magbago pagkatapos ng restart!

### Step 4: I-verify ang Tunnel Configuration

```bash
# Sa VPS
pm2 describe cloudflare-tunnel | grep "script path\|args"
```

Dapat makita mo na ang tunnel ay pointing sa `http://localhost:3001`.

### Step 5: I-test ulit

Pagkatapos makuha ang bagong tunnel URL:

```bash
# Test local server
curl http://localhost:3001/api/health

# Test via tunnel (replace with new URL if changed)
curl https://NEW_TUNNEL_URL.trycloudflare.com/api/health
```

## Common Issues

### Issue: Local server hindi nagre-respond
**Solution:**
```bash
# I-check kung tumatakbo
pm2 status event-api

# I-check ang logs
pm2 logs event-api --lines 20
```

### Issue: Tunnel hindi connected
**Solution:**
```bash
# I-restart ang tunnel
pm2 restart cloudflare-tunnel

# O i-start ulit
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save
```

### Issue: Tunnel URL nagbago
**Solution:**
1. Kunin ang bagong URL mula sa logs
2. I-update ang Vercel environment variable
3. Mag-redeploy sa Vercel

