# Test CORS and API Endpoints

## Step 1: Test CORS Headers

```bash
# Sa VPS terminal
curl -v -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control"
```

**Expected Output:**
Dapat makita mo:
- `access-control-allow-origin: https://e-vent-jade.vercel.app`
- `access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
- `access-control-allow-credentials: true`

## Step 2: Test API Health Endpoint

```bash
# Test health endpoint
curl https://carey-intervention-pork-hayes.trycloudflare.com/api/health
```

**Expected Output:**
```json
{"ok":true}
```

## Step 3: Test Services Endpoint

```bash
# Test services endpoint
curl "https://carey-intervention-pork-hayes.trycloudflare.com/api/services?highRated=true&limit=10"
```

**Expected Output:**
Dapat makita mo ang JSON response na may `{"ok":true,"rows":[...]}`

## Step 4: Test CORS with Full Response

```bash
# Get full response with headers
curl -v https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | head -30
```

**Expected Output:**
Dapat makita mo ang `Access-Control-Allow-Origin` header sa response.

## Step 5: Check Server Logs

```bash
# I-check kung may CORS requests na pumapasok
pm2 logs event-api --lines 50 | grep -i "cors\|origin"
```

**Expected Output:**
Dapat makita mo ang `🌐 CORS Request from origin: https://e-vent-jade.vercel.app` kung may requests na pumapasok.

## Troubleshooting

### If CORS headers are missing:
1. I-verify na na-upload ang latest `server/index.js`
2. I-restart ang server: `pm2 restart event-api`
3. I-check ang CORS configuration: `grep -A 10 "CORS configuration" /var/www/event-app/server/index.js`

### If 404 errors:
1. I-check kung tumatakbo ang server: `pm2 status`
2. I-check ang server logs: `pm2 logs event-api --lines 50`
3. I-test ang local server: `curl http://localhost:3001/api/health`

### If connection fails:
1. I-check ang Cloudflare tunnel: `pm2 logs cloudflare-tunnel --lines 20`
2. I-verify ang tunnel URL: `pm2 logs cloudflare-tunnel --lines 100 --nostream | grep trycloudflare`

