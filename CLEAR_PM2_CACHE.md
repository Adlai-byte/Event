# Clear PM2 Cache and Force Restart

## Problem
Ang file ay tama na (may `origin: true`, walang `allowedOrigins`), pero may error pa rin. Ibig sabihin, may cached code sa PM2.

## Solution: Force Restart with Cache Clear

### Step 1: I-stop at I-delete ang Process

```bash
# Sa VPS
pm2 stop event-api
pm2 delete event-api
```

### Step 2: I-clear ang PM2 Cache

```bash
# Sa VPS
pm2 flush event-api
# O kung wala na ang process:
pm2 flush
```

### Step 3: I-verify ang File Content

```bash
# Sa VPS
head -n 130 /var/www/event-app/server/index.js | tail -n 20
```

Dapat makita mo ang `origin: true`.

### Step 4: I-start ulit ang Server

```bash
# Sa VPS
cd /var/www/event-app/server
pm2 start index.js --name event-api
pm2 save
```

### Step 5: I-check ang Logs

```bash
# Sa VPS
sleep 5
pm2 logs event-api --lines 30 | grep -i "allowedOrigins\|listening\|error"
```

**Expected:**
- ✅ `✓ API server listening on http://localhost:3001`
- ❌ WALANG `allowedOrigins is not defined`

### Step 6: I-test ang CORS

```bash
# Sa VPS
curl -v -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control-allow"
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin` header.

## Alternative: Complete PM2 Reset

Kung hindi pa rin gumagana:

```bash
# Sa VPS
# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all

# Clear all logs
pm2 flush

# Start fresh
cd /var/www/event-app/server
pm2 start index.js --name event-api
pm2 save
pm2 startup
```

## Verification

Pagkatapos ng restart:

```bash
# I-check ang status
pm2 status

# I-check ang logs
pm2 logs event-api --lines 20

# I-test ang API
curl http://localhost:3001/api/health
```

Dapat:
- ✅ Server ay online
- ✅ Walang `allowedOrigins` error
- ✅ Health endpoint ay nagre-respond

