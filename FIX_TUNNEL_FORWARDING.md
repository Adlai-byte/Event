# Fix Cloudflare Tunnel Forwarding - 404 Error

## Problem
- ✅ Server ay running (`event-api` online)
- ✅ Server ay gumagana sa localhost (`HTTP/1.1 200 OK`)
- ✅ Tunnel ay configured correctly (`tunnel --url http://localhost:3001`)
- ❌ Pero ang tunnel URL ay nag-return ng `HTTP/2 404` - hindi nagfo-forward ang tunnel

## Step 1: I-verify na ang Server ay Running

```bash
# Sa VPS terminal
pm2 list
pm2 logs event-api --lines 5
```

**Expected:** Dapat makita mo ang `event-api` na `online` at `✓ API server listening on http://localhost:3001`

## Step 2: I-test ang Server sa Localhost

```bash
# Sa VPS terminal
curl -v http://localhost:3001/api/health 2>&1 | head -20
```

**Expected:** Dapat makita mo ang `HTTP/1.1 200 OK` at `{"ok":true}`

## Step 3: I-check ang Cloudflare Tunnel Logs

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 100 | grep -i "error\|warn\|forward\|localhost\|3001\|registered"
```

**Expected:** Dapat makita mo ang:
- `INF Registered tunnel connection` (successful registration)
- `url:http://localhost:3001` (correct forwarding)
- Walang `ERR` messages

## Step 4: I-restart ang Cloudflare Tunnel

```bash
# Sa VPS terminal
pm2 restart cloudflare-tunnel
sleep 10

# I-check ang logs
pm2 logs cloudflare-tunnel --lines 50
```

**Expected:** Dapat makita mo ang:
- `INF Registered tunnel connection`
- Walang `ERR` messages

## Step 5: I-get ang Bagong Tunnel URL

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected:** Dapat makita mo ang bagong tunnel URL (e.g., `https://operates-sectors-murphy-dolls.trycloudflare.com`)

## Step 6: I-test ang Tunnel URL (Full Response)

```bash
# Sa VPS terminal
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1 | awk '{print $NF}')

curl -v ${TUNNEL_URL}/api/health 2>&1 | head -50
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 200` (hindi 404)
- `{"ok":true}` sa body

## Step 7: Kung 404 pa rin, I-check ang Tunnel Configuration

```bash
# Sa VPS terminal
pm2 show cloudflare-tunnel | grep -i "args"
```

**Expected:** Dapat makita mo ang `tunnel --url http://localhost:3001`

## Step 8: Alternative - I-test ang Tunnel URL sa Browser

1. I-open ang browser
2. I-visit: `https://operates-sectors-murphy-dolls.trycloudflare.com/api/health`
3. Dapat makita mo ang `{"ok":true}` (hindi 404 o error page)

## If Still Not Working

I-check kung may firewall o network issue:

```bash
# Sa VPS terminal
# I-check kung ang port 3001 ay accessible
netstat -tlnp | grep 3001

# I-check kung may firewall rules
iptables -L -n | grep 3001
```

