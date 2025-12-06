# Test Full CORS Response Headers

## Step 1: I-test ang Full OPTIONS Response (Preflight)

```bash
# Sa VPS terminal
curl -v -X OPTIONS https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | head -50
```

**Dapat makita mo ang:**
- `HTTP/2 204` o `HTTP/2 200` (success)
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `< access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`
- `< access-control-allow-credentials: true`

## Step 2: I-test ang GET Request Response

```bash
# Sa VPS terminal
curl -v https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | head -50
```

**Dapat makita mo ang:**
- `HTTP/2 200` (success)
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `{"ok":true}` sa body

## Step 3: Kung WALANG CORS Headers sa Response

I-verify na ang latest code ay na-upload na sa VPS:

```bash
# Sa VPS terminal
# I-check ang CORS config
sed -n '114,123p' /var/www/event-app/server/index.js
```

Kung iba ang nakita, i-upload ang latest code:

```bash
# Sa local machine (Windows PowerShell)
cd C:\wamp64\www\FINALLYevent\Event
scp server/index.js root@YOUR_VPS_IP:/var/www/event-app/server/index.js
```

Pagkatapos, i-restart:
```bash
# Sa VPS terminal
pm2 restart event-api
sleep 5
pm2 logs event-api --lines 10
```

## Step 4: I-test ulit pagkatapos ng restart

```bash
# Sa VPS terminal
curl -v -X OPTIONS https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "< |HTTP/"
```

