# Test New Cloudflare Tunnel URL

## Step 1: I-test ang OPTIONS Request sa Bagong Tunnel URL

```bash
# Sa VPS terminal
curl -v -X OPTIONS https://decorating-superb-substitute-care.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "< |HTTP/"
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 204` o `HTTP/2 200`
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `< access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`

## Step 2: I-test ang GET Request

```bash
# Sa VPS terminal
curl -v https://decorating-superb-substitute-care.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | grep -E "< |HTTP/|ok"
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 200`
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `{"ok":true}`

## Step 3: I-update ang Vercel Environment Variable

1. Pumunta sa Vercel Dashboard → Project → Settings → Environment Variables
2. Hanapin o i-add ang `EXPO_PUBLIC_API_BASE_URL`
3. I-set ang value sa:
   ```
   https://decorating-superb-substitute-care.trycloudflare.com
   ```
4. I-set sa "All Environments"
5. I-click "Save"

## Step 4: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variable changes.

1. Pumunta sa Deployments tab
2. I-click "Redeploy" sa latest deployment
3. Hintayin matapos (1-3 minutes)

## Step 5: I-verify sa Browser

1. I-open ang Vercel app: `https://e-vent-jade.vercel.app`
2. I-open ang Developer Console (F12)
3. Dapat:
   - ✅ Walang CORS error
   - ✅ Walang `ERR_NAME_NOT_RESOLVED` error
   - ✅ May response mula sa API
   - ✅ Console log: `🌐 Using production VPS API base URL: https://decorating-superb-substitute-care.trycloudflare.com`

