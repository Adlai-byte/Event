# Final Upload Instructions - CORS Fix

## Problem
Ang server sa VPS ay may `allowedOrigins` error pa rin, ibig sabihin hindi pa na-upload ang updated file.

## Solution: Upload ulit ang file

### Step 1: I-verify ang Local File

Sa local computer, i-check na tama ang CORS config:

```powershell
# Sa Windows PowerShell
cd C:\wamp64\www\FINALLYevent\Event\server
Select-String -Path index.js -Pattern "allowedOrigins"
```

**Expected:** Walang output (walang `allowedOrigins`)

I-check din ang CORS config:
```powershell
Select-String -Path index.js -Pattern "origin: true" -Context 2
```

**Expected:** Dapat makita mo ang `origin: true` sa CORS config.

### Step 2: I-upload ang File

```powershell
# Sa Windows PowerShell
scp C:\wamp64\www\FINALLYevent\Event\server\index.js root@72.62.64.59:/var/www/event-app/server/index.js
```

**IMPORTANT:** I-verify na tama ang path sa VPS. I-check muna:
```bash
# Sa VPS
ls -la /var/www/event-app/server/index.js
```

Kung wala sa `/var/www/event-app/server/`, hanapin:
```bash
# Sa VPS
find / -name "index.js" -path "*/server/*" 2>/dev/null | grep -v node_modules
```

### Step 3: I-verify na Na-upload

```bash
# Sa VPS
grep -A 5 "CORS configuration" /var/www/event-app/server/index.js
```

**Expected Output:**
```
// CORS configuration - allow all origins (including all Vercel deployments)
// Simple configuration that allows all origins
app.use(cors({
    origin: true, // Allow all origins
```

**CRITICAL:** Dapat makita mo ang `origin: true`, HINDI `origin: function` o `allowedOrigins`.

### Step 4: I-restart ang Server

```bash
# Sa VPS
pm2 restart event-api

# Wait 5 seconds
sleep 5

# I-check ang logs - dapat WALANG allowedOrigins error
pm2 logs event-api --lines 20 | grep -i "allowedOrigins\|error\|listening"
```

**Expected:** 
- ✅ `✓ API server listening on http://localhost:3001`
- ❌ WALANG `allowedOrigins is not defined`

### Step 5: I-test ang CORS

```bash
# Sa VPS
curl -v -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control-allow"
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin` header.

## Alternative: Manual Edit sa VPS

Kung hindi gumagana ang SCP, i-edit directly sa VPS:

```bash
# Sa VPS
cd /var/www/event-app/server
nano index.js

# Hanapin ang CORS configuration (around line 114-123)
# Dapat ganito:
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
}));

# I-save: Ctrl+X, Y, Enter
# I-restart: pm2 restart event-api
```

## Verification Checklist

- [ ] Na-upload ang updated `server/index.js` sa VPS
- [ ] Na-verify na `origin: true` ang nasa CORS config (hindi `origin: function`)
- [ ] Na-restart ang server (`pm2 restart event-api`)
- [ ] Walang `allowedOrigins` error sa logs
- [ ] May `Access-Control-Allow-Origin` header sa OPTIONS response
- [ ] Gumagana na ang API endpoints

