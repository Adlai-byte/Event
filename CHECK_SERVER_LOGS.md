# Check Server Logs para sa CORS Issue

## Step 1: I-check ang Server Logs

Sa VPS terminal, i-run:

```bash
# I-check ang recent logs
pm2 logs event-api --lines 50

# O i-check lang ang error logs
pm2 logs event-api --err --lines 50
```

**Hanapin:**
- `🌐 CORS Request from origin: https://e-vent-jade.vercel.app` - Dapat makita mo ito kung umaabot ang requests
- Any errors related to CORS
- Any 404 errors

## Step 2: I-test ang Server Directly

```bash
# Test local server
curl http://localhost:3001/api/health

# Test via tunnel
curl https://carey-intervention-pork-hayes.trycloudflare.com/api/health

# Test CORS headers
curl -I -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app"
```

## Step 3: I-verify ang CORS Configuration

I-check kung tama ang CORS config sa server:

```bash
# Sa VPS
cd /var/www/event-app/server
grep -A 20 "CORS configuration" index.js
```

Dapat makita mo:
```javascript
app.use(cors({
    origin: function (origin, callback) {
        if (origin) {
            console.log(`🌐 CORS Request from origin: ${origin}`);
        }
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    ...
}));
```

## Step 4: I-check kung May Error sa Server

```bash
# I-check ang error logs
pm2 logs event-api --err --lines 100

# O i-check ang full logs
pm2 logs event-api --lines 100 | grep -i "error\|cors\|404"
```

## Common Issues

### Issue: Walang CORS logs
**Meaning:** Hindi umaabot ang requests sa server
**Solution:** I-check ang Cloudflare tunnel

### Issue: May CORS logs pero walang headers
**Meaning:** CORS middleware ay hindi nagwo-work
**Solution:** I-verify ang CORS configuration

### Issue: 404 errors
**Meaning:** Endpoint ay hindi nahanap
**Solution:** I-check ang route definitions

