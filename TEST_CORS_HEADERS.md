# Test CORS Headers

## Step 1: I-test ang CORS Headers sa VPS

```bash
# Sa VPS terminal

# Test OPTIONS request (preflight)
curl -v -X OPTIONS https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control"
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin` header.

## Step 2: I-test ang GET Request

```bash
# Sa VPS
curl -v https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | head -40
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin: https://e-vent-jade.vercel.app` sa response headers.

## Step 3: I-check ang Server Logs

```bash
# Sa VPS
pm2 logs event-api --lines 30 | grep -i "cors\|origin\|listening"
```

**Expected:** Dapat makita mo ang server na listening at walang errors.

## Step 4: I-verify ang CORS Config sa Server

```bash
# Sa VPS
sed -n '114,123p' /var/www/event-app/server/index.js
```

**Expected:** Dapat makita mo ang `origin: true` sa CORS config.

## If CORS Headers are Missing

I-restart ang server para ma-apply ang CORS config:

```bash
# Sa VPS
pm2 restart event-api
sleep 5
pm2 logs event-api --lines 20
```

