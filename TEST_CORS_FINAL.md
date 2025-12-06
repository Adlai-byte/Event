# Final CORS Test

## Step 1: Test CORS Headers

```bash
# Sa VPS
curl -v -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control-allow"
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin` header.

## Step 2: Test API Health Endpoint

```bash
# Sa VPS
curl https://carey-intervention-pork-hayes.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}`

## Step 3: Test Services Endpoint

```bash
# Sa VPS
curl "https://carey-intervention-pork-hayes.trycloudflare.com/api/services?highRated=true&limit=10"
```

**Expected:** JSON response na may `{"ok":true,"rows":[...]}`

## Step 4: Test CORS with Full Headers

```bash
# Sa VPS
curl -v https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | head -30
```

**Expected:** Dapat makita mo ang `Access-Control-Allow-Origin: https://e-vent-jade.vercel.app` sa response headers.

## Step 5: Test sa Browser

1. I-open ang Vercel app: `https://e-vent-jade.vercel.app`
2. I-open ang Developer Console (F12)
3. Dapat:
   - ✅ Walang CORS error
   - ✅ Walang `allowedOrigins` error
   - ✅ May response mula sa API
   - ✅ Walang 404 errors

## Success Indicators

- ✅ Server ay listening (`✓ API server listening`)
- ✅ Walang `allowedOrigins` error
- ✅ May CORS headers sa response
- ✅ API endpoints ay nagre-respond
- ✅ Walang CORS error sa browser console

