# Final Fix: Clear PM2 Cache Completely

## Problem
Ang file ay tama na (may `origin: true`), pero may `allowedOrigins` error pa rin. Ibig sabihin, may cached code pa rin sa PM2.

## Solution: Complete PM2 Reset

### Step 1: I-stop at I-delete Lahat

```bash
# Sa VPS
pm2 stop all
pm2 delete all
```

### Step 2: I-clear ang PM2 Cache at Logs

```bash
# Sa VPS
pm2 kill
pm2 flush
rm -rf /root/.pm2/logs/*
rm -rf /root/.pm2/dump.pm2
```

### Step 3: I-verify ang File Content

```bash
# Sa VPS
sed -n '114,123p' /var/www/event-app/server/index.js
```

Dapat makita mo ang `origin: true`.

### Step 4: I-start Fresh

```bash
# Sa VPS
cd /var/www/event-app/server
pm2 start index.js --name event-api
pm2 save
```

### Step 5: I-check ang Logs

```bash
# Sa VPS
sleep 10
pm2 logs event-api --lines 50
```

**Expected:**
- ✅ `✓ API server listening on http://localhost:3001`
- ✅ `✓ successfully connected to database`
- ❌ WALANG `allowedOrigins is not defined`

### Step 6: I-test ang CORS

```bash
# Sa VPS
curl -v -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control-allow"
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin` header.

## Alternative: Check if PM2 is Loading Wrong File

```bash
# Sa VPS
pm2 info event-api | grep "script path"
pm2 describe event-api | grep "script path"
```

I-verify na tama ang path: `/var/www/event-app/server/index.js`

## If Still Not Working

I-check kung may ibang file na nagre-require:

```bash
# Sa VPS
grep -r "allowedOrigins" /var/www/event-app/server/ --exclude-dir=node_modules
```

Kung may output, i-check ang file na yun.

