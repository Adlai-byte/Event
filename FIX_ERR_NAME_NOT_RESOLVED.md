# Fix: ERR_NAME_NOT_RESOLVED Error

## Problem
Ang error na `net::ERR_NAME_NOT_RESOLVED` ay nangangahulugan na hindi ma-resolve ng browser ang Cloudflare tunnel domain. Ito ay nangyayari kapag:
- Ang Cloudflare tunnel ay hindi tumatakbo
- Ang tunnel URL ay expired na (quick tunnels expire kapag na-stop)
- Ang tunnel ay hindi properly configured

## Solution: Step-by-Step Fix

### Step 1: SSH sa VPS at i-check ang status

```bash
# SSH sa VPS
ssh root@your-vps-ip

# Check kung tumatakbo ang tunnel
pm2 list

# Check kung tumatakbo ang Node.js server
pm2 list | grep event-server
```

### Step 2: I-restart ang Cloudflare Tunnel

```bash
# Stop ang old tunnel (kung meron)
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# Start ng bagong tunnel
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001

# Save para auto-start on reboot
pm2 save

# Check ang logs para makita ang bagong URL
pm2 logs cloudflare-tunnel --lines 100 --nostream | grep -i "trycloudflare.com" | tail -1
```

### Step 3: I-verify na tumatakbo ang Node.js Server

```bash
# Check kung tumatakbo
pm2 list | grep event-server

# Kung hindi tumatakbo, i-start:
cd /path/to/your/server
pm2 start index.js --name event-server
pm2 save
```

### Step 4: Kunin ang BAGONG Tunnel URL

```bash
# Get the current tunnel URL
pm2 logs cloudflare-tunnel --lines 200 --nostream | grep -i "https://.*trycloudflare.com" | tail -1
```

**IMPORTANT:** Ang quick tunnel URLs ay nagbabago tuwing i-restart mo ang tunnel. Kailangan mong i-update ito sa Vercel environment variables.

### Step 5: I-update ang Vercel Environment Variables

1. Pumunta sa Vercel Dashboard → Your Project → Settings → Environment Variables
2. I-update ang `EXPO_PUBLIC_API_BASE_URL` sa bagong tunnel URL
   - Halimbawa: `https://new-tunnel-url.trycloudflare.com`
3. I-click ang "Save"
4. **CRITICAL:** Mag-deploy ulit ng bagong deployment para ma-apply ang changes
   - Pumunta sa Deployments tab
   - I-click ang "Redeploy" sa latest deployment
   - O mag-push ng bagong commit sa Git

### Step 6: I-verify na gumagana

Pagkatapos ng redeploy, i-check ang browser console. Dapat ay:
- ✅ Walang `ERR_NAME_NOT_RESOLVED` error
- ✅ May response mula sa API (kahit 404 o 500, basta may response)

## Quick Fix Script

Gamitin ang `fix-tunnel.sh` script:

```bash
# Make it executable
chmod +x fix-tunnel.sh

# Run it
./fix-tunnel.sh
```

## Alternative: Gumamit ng Named Tunnel (Permanent URL)

Para sa permanent URL na hindi nagbabago, gumamit ng Cloudflare Named Tunnel:

```bash
# 1. Login sa Cloudflare
cloudflared tunnel login

# 2. Create named tunnel
cloudflared tunnel create event-api

# 3. Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
EOF

# 4. Run tunnel
cloudflared tunnel run event-api

# 5. Setup DNS (sa Cloudflare dashboard)
# Add CNAME: api.yourdomain.com -> <tunnel-id>.cfargotunnel.com
```

## Common Issues

### Issue: Tunnel URL keeps changing
**Solution:** Gumamit ng Named Tunnel para sa permanent URL

### Issue: Tunnel running pero server hindi
**Solution:** 
```bash
cd /path/to/server
pm2 start index.js --name event-server
pm2 save
```

### Issue: Updated Vercel env pero hindi pa rin gumagana
**Solution:** 
- **MUST REDEPLOY** - Environment variables ay na-apply lang sa bagong deployments
- Pumunta sa Deployments → Redeploy latest deployment

### Issue: PM2 not found
**Solution:**
```bash
npm install -g pm2
pm2 startup
```

## Verification Checklist

- [ ] Cloudflare tunnel ay tumatakbo (`pm2 list` shows `cloudflare-tunnel`)
- [ ] Node.js server ay tumatakbo (`pm2 list` shows `event-server`)
- [ ] Nakuha mo ang bagong tunnel URL mula sa logs
- [ ] Na-update ang `EXPO_PUBLIC_API_BASE_URL` sa Vercel
- [ ] Na-redeploy ang Vercel deployment
- [ ] Na-test sa browser at walang `ERR_NAME_NOT_RESOLVED`

