# Paano I-check ang Tunnel Configuration at Kunin ang URL

## Problem
- ✅ Tunnel ay tumatakbo
- ❌ Walang `https://...trycloudflare.com` URL sa logs
- ❌ Hindi makita ang public URL

## Step 1: I-check kung Paano Naka-start ang Tunnel

```bash
# Sa VPS terminal
pm2 show cloudflare-tunnel
```

**I-check ang "script path" o "exec cwd"** - makikita mo kung paano naka-start ang tunnel.

**Kung nakikita mo:**
- `tunnel --url http://localhost:3001` = **Quick tunnel** (dapat may URL sa logs)
- `tunnel run TUNNEL_NAME` = **Named tunnel** (kailangan ng ibang approach)

## Step 2: I-check kung Quick Tunnel o Named Tunnel

### Option A: Quick Tunnel (Temporary)

Kung quick tunnel ito, dapat may URL sa logs. I-try ang:

```bash
# I-check ang very first logs (kapag nag-start)
pm2 logs cloudflare-tunnel --lines 1000 --nostream | grep -i "https://.*trycloudflare.com" | head -1
```

**O kaya, i-restart bilang quick tunnel:**

```bash
# I-stop ang current tunnel
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# I-start bilang quick tunnel
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001

# Hintayin ng 15 seconds
sleep 15

# I-check ang logs - dapat may URL na
pm2 logs cloudflare-tunnel --lines 50 --nostream | grep -i "https://.*trycloudflare.com"
```

**Expected Output:**
```
0|cloudfla | 2025-XX-XX INF | https://new-tunnel-url.trycloudflare.com
```

### Option B: Named Tunnel (Permanent)

Kung named tunnel ito, i-check ang configuration:

```bash
# I-check kung may config file
cat ~/.cloudflared/config.yml

# I-check kung may named tunnels
cloudflared tunnel list

# I-check ang tunnel info
cloudflared tunnel info event-api-tunnel
```

**Para sa named tunnel, kailangan mo ng:**
1. Cloudflare account
2. DNS configuration
3. O kung may trycloudflare.com URL, i-check ang Cloudflare dashboard

## Step 3: Alternative - I-test kung May Working URL

Kung hindi mo makita ang URL sa logs, pwede mong i-test kung may working URL:

```bash
# I-test ang old URL (kung may alam ka)
curl -v https://rentals-impaired-graphs-misc.trycloudflare.com/api/health 2>&1 | head -20
```

**Kung gumagana:** Gamitin mo ang URL na ito sa Vercel.

**Kung hindi gumagana:** Kailangan mong i-restart bilang quick tunnel.

## Step 4: I-restart Bilang Quick Tunnel (Recommended)

Para makakuha ng bagong quick tunnel URL:

```bash
# Sa VPS terminal

# I-stop ang current tunnel
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# I-start bilang quick tunnel (temporary pero may URL)
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
pm2 save

# Hintayin ng 15-20 seconds para mag-initialize
sleep 20

# I-check ang logs - dapat may URL na
pm2 logs cloudflare-tunnel --lines 100 --nostream | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected:** Dapat makita mo ang bagong tunnel URL.

## Step 5: I-test ang Tunnel URL

```bash
# Sa VPS terminal (palitan ang TUNNEL_URL sa actual URL)
curl https://TUNNEL_URL.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}`

## Step 6: I-update ang Vercel

1. **I-update ang Vercel Environment Variable:**
   - Key: `EXPO_PUBLIC_API_BASE_URL`
   - Value: `https://TUNNEL_URL.trycloudflare.com`
   - Environment: All Environments

2. **Mag-redeploy sa Vercel**

3. **I-verify sa browser** - dapat walang mixed content error

## Important Notes

### Quick Tunnel vs Named Tunnel

- **Quick Tunnel** (`tunnel --url http://localhost:3001`):
  - ✅ Easy setup
  - ✅ May URL sa logs
  - ❌ Temporary (nagbabago kapag nag-restart)
  - ❌ Para sa testing lang

- **Named Tunnel** (`tunnel run TUNNEL_NAME`):
  - ✅ Permanent URL
  - ✅ Stable
  - ❌ Kailangan ng Cloudflare account
  - ❌ Mas complex ang setup

**Para sa ngayon, gamitin ang Quick Tunnel** para makakuha ng URL agad.

