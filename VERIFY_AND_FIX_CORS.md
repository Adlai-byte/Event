# Verify and Fix CORS Issue

## Problem
Server ay hindi nagse-send ng CORS response headers kahit na may CORS config na.

## Step 1: I-verify ang CORS Config sa VPS

```bash
# Sa VPS terminal
sed -n '114,123p' /var/www/event-app/server/index.js
```

**Expected Output:**
```javascript
// CORS configuration - allow all origins (including all Vercel deployments)
// Simple configuration that allows all origins
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
}));
```

## Step 2: Kung iba ang nakita, i-upload ang latest server/index.js

```bash
# Sa local machine (Windows PowerShell)
cd C:\wamp64\www\FINALLYevent\Event

# I-upload ang server/index.js sa VPS
scp server/index.js root@YOUR_VPS_IP:/var/www/event-app/server/index.js
```

**Replace `YOUR_VPS_IP` with your actual VPS IP address.**

## Step 3: I-restart ang Server

```bash
# Sa VPS terminal
pm2 restart event-api
sleep 5

# I-verify na running
pm2 list
```

## Step 4: I-test ang CORS Headers (Full Response)

```bash
# Sa VPS terminal
curl -v -X OPTIONS https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "< |Access-Control"
```

**Expected:** Dapat makita mo ang:
- `< Access-Control-Allow-Origin: https://e-vent-jade.vercel.app`
- `< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`
- `< Access-Control-Allow-Credentials: true`

## Step 5: I-test ang GET Request

```bash
# Sa VPS terminal
curl -v https://furthermore-boat-heated-elect.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | grep -E "< |HTTP/"
```

**Expected:** 
- `HTTP/2 200` (success)
- `< Access-Control-Allow-Origin: https://e-vent-jade.vercel.app`

## Alternative: I-check kung may ibang CORS middleware

```bash
# Sa VPS terminal
grep -n "cors\|CORS\|Access-Control" /var/www/event-app/server/index.js | head -20
```

Dapat makita mo lang ang isang CORS config (around line 116).

