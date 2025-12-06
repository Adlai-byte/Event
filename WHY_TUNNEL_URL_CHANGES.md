# Bakit Nagbabago ang Cloudflare Tunnel URL?

## Root Cause

**Ang ginagamit mo ay Cloudflare QUICK TUNNELS** (`trycloudflare.com`), na:
- ❌ **TEMPORARY** - nagbabago sa bawat restart
- ❌ **FREE pero UNSTABLE** - para lang sa testing
- ❌ **Walang permanent URL** - bago ang URL pagkatapos ng restart

## Kailan Nagbabago ang URL?

1. **Kapag nag-restart ang tunnel** (`pm2 restart cloudflare-tunnel`)
2. **Kapag nag-crash ang tunnel** (automatic restart)
3. **Kapag nag-reconnect ang tunnel** (network issues)
4. **Kapag nag-timeout ang tunnel** (inactivity)

## Solution: Permanent Cloudflare Tunnel

Para sa **PRODUCTION**, kailangan mo ng **NAMED TUNNEL** na may permanent URL:

### Option 1: Named Tunnel with Custom Domain (BEST)

1. **I-create ng Cloudflare account** (free)
2. **I-setup ng named tunnel**:
   ```bash
   # Sa VPS terminal
   cloudflared tunnel create event-api-tunnel
   cloudflared tunnel route dns event-api-tunnel api.yourdomain.com
   ```
3. **I-configure ang tunnel**:
   ```bash
   # I-create ng config file
   cat > ~/.cloudflared/config.yml << EOF
   tunnel: event-api-tunnel
   credentials-file: /root/.cloudflared/event-api-tunnel.json
   
   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:3001
     - service: http_status:404
   EOF
   ```
4. **I-start ang tunnel**:
   ```bash
   pm2 start cloudflared --name cloudflare-tunnel -- tunnel run event-api-tunnel
   ```

**Result:** Permanent URL: `https://api.yourdomain.com` (hindi na magbabago)

### Option 2: Named Tunnel with TryCloudflare (EASIER)

1. **I-create ng Cloudflare account** (free)
2. **I-setup ng named tunnel**:
   ```bash
   # Sa VPS terminal
   cloudflared tunnel create event-api-tunnel
   ```
3. **I-configure ang tunnel**:
   ```bash
   # I-create ng config file
   cat > ~/.cloudflared/config.yml << EOF
   tunnel: event-api-tunnel
   credentials-file: /root/.cloudflared/event-api-tunnel.json
   
   ingress:
     - service: http://localhost:3001
   EOF
   ```
4. **I-start ang tunnel**:
   ```bash
   pm2 start cloudflared --name cloudflare-tunnel -- tunnel run event-api-tunnel
   ```

**Result:** Permanent URL na hindi nagbabago (pero trycloudflare.com pa rin)

### Option 3: Auto-Update Script (TEMPORARY FIX)

Kung hindi mo pa ma-setup ang named tunnel, pwede mo gawin ang auto-update script:

```bash
# Sa VPS terminal
# I-create ng script na auto-update ang tunnel URL
cat > /root/update-tunnel-url.sh << 'EOF'
#!/bin/bash
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1 | awk '{print $NF}')
echo "Current tunnel URL: ${TUNNEL_URL}"
# I-update ang Vercel environment variable via API
# (kailangan mo ng Vercel API token)
EOF

chmod +x /root/update-tunnel-url.sh
```

## Recommendation

**Para sa PRODUCTION**, gamitin ang **Option 1** (Named Tunnel with Custom Domain):
- ✅ Permanent URL
- ✅ Stable
- ✅ Professional
- ✅ Free (Cloudflare free tier)

**Para sa DEVELOPMENT**, pwede ang **Option 2** (Named Tunnel with TryCloudflare):
- ✅ Permanent URL (hindi nagbabago)
- ✅ Easy setup
- ✅ Free

## Current Fix (Temporary)

Para sa ngayon, i-update mo muna ang:
1. `mvc/services/api.ts` - bagong tunnel URL
2. Vercel environment variable `EXPO_PUBLIC_API_BASE_URL`
3. Mag-redeploy sa Vercel

Pero **hindi ito permanent solution** - magbabago pa rin ang URL kapag nag-restart ang tunnel.

