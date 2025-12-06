# Fix: CORS Error sa Vercel Deployment

## Problem
- ✅ Gumagana sa localhost
- ❌ Hindi gumagana sa Vercel deployment
- ❌ CORS error: "No 'Access-Control-Allow-Origin' header is present"
- ❌ `ERR_FAILED` error

## Root Cause
Ang server sa VPS ay kailangan i-restart para ma-apply ang bagong CORS configuration. Parehong ang server at tunnel ay dapat tumatakbo at properly configured.

## Solution: Step-by-Step

### Step 1: I-restart ang Server sa VPS

**IMPORTANT:** Kailangan i-restart ang server para ma-apply ang bagong CORS configuration.

```bash
# SSH sa VPS
ssh root@your-vps-ip

# Restart ang server
pm2 restart event-server
# O kung event-api ang name:
pm2 restart event-api

# Check ang status
pm2 status
```

### Step 2: I-verify na Tumatakbo ang Server at Tunnel

```bash
# Check kung tumatakbo
pm2 list

# Dapat makita mo:
# - event-server o event-api (online)
# - cloudflare-tunnel (online)
```

### Step 3: I-test ang Local Server

```bash
# Test kung tumatakbo ang server locally
curl http://localhost:3001/api/health

# Dapat makita mo: {"ok":true}
```

### Step 4: Kunin ang Current Tunnel URL

```bash
# Get the current tunnel URL
pm2 logs cloudflare-tunnel --lines 200 --nostream | grep -i "https://.*trycloudflare.com" | tail -1
```

**IMPORTANT:** I-copy ang URL na makikita mo (halimbawa: `https://carey-intervention-pork-hayes.trycloudflare.com`)

### Step 5: I-update ang Vercel Environment Variables

1. Pumunta sa **Vercel Dashboard**
2. Piliin ang **Project** → **Settings** → **Environment Variables**
3. I-update o i-add ang:
   - **Key:** `EXPO_PUBLIC_API_BASE_URL`
   - **Value:** `https://carey-intervention-pork-hayes.trycloudflare.com` (yung URL mula sa Step 4)
   - **Environment:** All Environments
4. I-click **Save**

### Step 6: Mag-redeploy sa Vercel

**CRITICAL:** Kailangan mag-redeploy para ma-apply ang environment variables!

1. Pumunta sa **Deployments** tab
2. I-click ang **"..."** menu sa latest deployment
3. Piliin **"Redeploy"**
4. O mag-push ng bagong commit sa Git

### Step 7: I-verify

Pagkatapos ng redeploy:
1. I-open ang Vercel app sa browser
2. I-open ang **Developer Console** (F12)
3. Dapat ay:
   - ✅ Walang CORS error
   - ✅ May response mula sa API (kahit 404 o 500, basta may response)

## Quick Fix Script

Gamitin ang `verify-server.sh` para i-check ang lahat:

```bash
# Make executable
chmod +x verify-server.sh

# Run
./verify-server.sh
```

## Common Issues

### Issue: Server hindi tumatakbo
```bash
# Check
pm2 list

# Start
cd /path/to/server
pm2 start index.js --name event-server
pm2 save
```

### Issue: Tunnel hindi tumatakbo
```bash
# Check
pm2 list | grep cloudflare-tunnel

# Start
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save
```

### Issue: Updated Vercel env pero hindi pa rin gumagana
**Solution:** 
- **MUST REDEPLOY** - Environment variables ay na-apply lang sa bagong deployments
- Hindi sapat na i-save lang, kailangan mag-redeploy

### Issue: CORS error pa rin after redeploy
**Solution:**
1. I-verify na na-restart ang server sa VPS (Step 1)
2. I-check ang server logs: `pm2 logs event-server --lines 50`
3. I-test ang tunnel URL directly: `curl https://your-tunnel-url.trycloudflare.com/api/health`

## Verification Checklist

- [ ] Server ay na-restart sa VPS (`pm2 restart event-server`)
- [ ] Server ay tumatakbo (`pm2 list` shows online)
- [ ] Tunnel ay tumatakbo (`pm2 list` shows online)
- [ ] Local server ay nagre-respond (`curl http://localhost:3001/api/health`)
- [ ] Nakuha ang current tunnel URL
- [ ] Na-update ang `EXPO_PUBLIC_API_BASE_URL` sa Vercel
- [ ] Na-redeploy ang Vercel deployment
- [ ] Na-test sa browser at walang CORS error

## Testing Commands

```bash
# Test local server
curl http://localhost:3001/api/health

# Test tunnel (replace with your URL)
curl https://carey-intervention-pork-hayes.trycloudflare.com/api/health

# Test CORS headers
curl -I -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app"
```

## Important Notes

1. **Server Restart Required:** Pagkatapos mag-update ng CORS configuration, kailangan i-restart ang server
2. **Vercel Redeploy Required:** Pagkatapos mag-update ng environment variables, kailangan mag-redeploy
3. **Tunnel URL Changes:** Quick tunnel URLs ay nagbabago tuwing i-restart ang tunnel
4. **For Permanent URL:** Consider using Cloudflare Named Tunnel para sa permanent URL

