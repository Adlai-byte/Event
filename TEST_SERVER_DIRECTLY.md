# Test Server Directly (Bypass Tunnel)

## Step 1: I-test ang Server sa Localhost

```bash
# Sa VPS terminal
curl -v http://localhost:3001/api/health 2>&1 | head -30
```

**Expected:** Dapat makita mo ang:
- `HTTP/1.1 200 OK`
- `{"ok":true}` sa body

## Step 2: Kung GUMAGANA sa Localhost pero HINDI sa Tunnel

Ibig sabihin, ang issue ay sa Cloudflare tunnel forwarding. I-check ang tunnel logs:

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 100 | grep -i "error\|warn\|forward\|localhost\|3001"
```

## Step 3: I-restart ang Cloudflare Tunnel

```bash
# Sa VPS terminal
pm2 restart cloudflare-tunnel
sleep 10

# I-check ang logs
pm2 logs cloudflare-tunnel --lines 50
```

## Step 4: I-test ulit ang Tunnel URL

```bash
# Sa VPS terminal
curl -v https://decorating-superb-substitute-care.trycloudflare.com/api/health 2>&1 | grep -E "HTTP/|ok|error"
```

**Expected:** Dapat makita mo ang `HTTP/2 200` at `{"ok":true}`

## Step 5: Kung HINDI pa rin Gumagana

I-check kung may firewall o network issue:

```bash
# Sa VPS terminal
# I-check kung ang port 3001 ay accessible
netstat -tlnp | grep 3001

# I-check kung may firewall rules
iptables -L -n | grep 3001
```

## Alternative: I-test ang Tunnel URL sa Browser

1. I-open ang browser
2. I-visit: `https://decorating-superb-substitute-care.trycloudflare.com/api/health`
3. Dapat makita mo ang `{"ok":true}`

