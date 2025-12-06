# Test New Tunnel URL

## Step 1: I-test ang Bagong Tunnel URL

```bash
# Sa VPS terminal
curl -v https://operates-sectors-murphy-dolls.trycloudflare.com/api/health 2>&1 | head -50
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 200` (hindi 404 o 530)
- `{"ok":true}` sa body
- CORS headers kung may `Origin` header

## Step 2: I-test ang OPTIONS Request (Preflight)

```bash
# Sa VPS terminal
curl -v -X OPTIONS https://operates-sectors-murphy-dolls.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "< |HTTP/"
```

**Expected:** Dapat makita mo ang:
- `HTTP/2 204` o `HTTP/2 200`
- `< access-control-allow-origin: https://e-vent-jade.vercel.app`
- `< access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`

## Step 3: Kung GUMAGANA, I-update ang Vercel

1. Pumunta sa Vercel Dashboard → Project → Settings → Environment Variables
2. **DELETE** ang `NEXT_PUBLIC_API_URL`
3. **ADD** ang `EXPO_PUBLIC_API_BASE_URL`
4. Value: `https://operates-sectors-murphy-dolls.trycloudflare.com`
5. I-save at mag-redeploy

