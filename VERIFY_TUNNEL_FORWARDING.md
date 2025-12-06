# Verify Cloudflare Tunnel Forwarding

## Step 1: I-verify na ang Server ay Running

```bash
# Sa VPS terminal
pm2 list
pm2 logs event-api --lines 10
```

**Expected:** Dapat makita mo ang `event-api` na `online` at `✓ API server listening on http://localhost:3001`

## Step 2: I-test ang Server sa Localhost

```bash
# Sa VPS terminal
curl -v http://localhost:3001/api/health 2>&1 | head -20
```

**Expected:** Dapat makita mo ang `HTTP/1.1 200 OK` at `{"ok":true}`

## Step 3: I-check ang Cloudflare Tunnel Configuration

```bash
# Sa VPS terminal
pm2 show cloudflare-tunnel | grep -i "script\|args\|exec"
```

**Expected:** Dapat makita mo ang tunnel na configured to forward to `http://localhost:3001`

## Step 4: I-check ang Cloudflare Tunnel Logs

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 50 | grep -i "forward\|localhost\|3001\|error"
```

**Expected:** Dapat makita mo ang tunnel na nagfo-forward ng requests sa `http://localhost:3001`

## Step 5: I-test ang Tunnel URL (Full Response)

```bash
# Sa VPS terminal
curl -v https://decorating-superb-substitute-care.trycloudflare.com/api/health 2>&1 | head -50
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 200` (hindi 404)
- `{"ok":true}` sa body
- CORS headers kung may `Origin` header

## Step 6: Kung 404 pa rin, I-check ang Tunnel URL sa Logs

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected:** Dapat match ang URL sa `https://decorating-superb-substitute-care.trycloudflare.com`

## Step 7: Kung iba ang URL, I-restart ang Tunnel

```bash
# Sa VPS terminal
pm2 restart cloudflare-tunnel
sleep 10

# I-get ang bagong URL
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1
```

