# Paano Kunin ang Cloudflare Tunnel URL Kapag Walang Output

## Problem
- ✅ Cloudflare tunnel ay tumatakbo (`pm2 list` shows `online`)
- ❌ Walang output kapag nag-grep ng tunnel URL sa logs
- ❌ Hindi makita ang `https://...trycloudflare.com` sa logs

## Solution: I-check ang Full Logs o I-restart ang Tunnel

### Option 1: I-check ang Full Logs (Recent)

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 50 --nostream
```

**Hanapin ang line na may:**
- `https://...trycloudflare.com`
- `INF` o `INF+` na may URL
- `Registered tunnel connection`

**I-copy ang URL** mula sa output.

### Option 2: I-restart ang Tunnel (Para Makita ang URL sa Startup)

```bash
# Sa VPS terminal

# I-restart ang tunnel
pm2 restart cloudflare-tunnel

# Hintayin ng 10 seconds para mag-initialize
sleep 10

# I-check ang logs para sa URL
pm2 logs cloudflare-tunnel --lines 50 --nostream | grep -i "https://.*trycloudflare.com"
```

**Expected Output:**
```
0|cloudfla | 2025-XX-XX INF | https://new-tunnel-url.trycloudflare.com
```

**I-copy ang URL** mula sa output.

### Option 3: I-check ang Live Logs (Real-time)

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 0
```

**Hintayin ng ilang seconds** at hanapin ang line na may `https://...trycloudflare.com`. I-press `Ctrl+C` para i-stop.

### Option 4: I-check ang All Logs (Mas Maraming Lines)

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 500 --nostream | grep -i "trycloudflare\|https://" | tail -20
```

**Hanapin ang URL** sa output.

### Option 5: I-check kung May Named Tunnel

Kung may named tunnel ka, pwede mong i-check ang tunnel info:

```bash
# Sa VPS terminal
cloudflared tunnel list
cloudflared tunnel info YOUR_TUNNEL_NAME
```

**Note:** Kung may named tunnel, baka kailangan mo ng ibang approach.

## Alternative: I-check ang PM2 Logs File Directly

```bash
# Sa VPS terminal
# I-check ang PM2 logs directory
ls -la ~/.pm2/logs/ | grep cloudflare

# I-view ang log file
tail -100 ~/.pm2/logs/cloudflare-tunnel-out.log | grep -i "https://.*trycloudflare.com"
```

## Kung Wala Pa Rin ang URL

Kung wala pa rin ang URL pagkatapos ng lahat ng steps, baka kailangan mong i-restart ang tunnel:

```bash
# Sa VPS terminal

# I-stop ang tunnel
pm2 stop cloudflare-tunnel

# I-start ulit
pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001

# Hintayin ng 15 seconds
sleep 15

# I-check ang logs
pm2 logs cloudflare-tunnel --lines 50 --nostream | grep -i "https://.*trycloudflare.com"
```

## I-test ang Tunnel URL

Kapag nakuha mo na ang URL, i-test mo:

```bash
# Sa VPS terminal (palitan ang TUNNEL_URL sa actual URL)
curl https://TUNNEL_URL.trycloudflare.com/api/health
```

**Expected:** `{"ok":true}`

## Next Steps

Kapag nakuha mo na ang tunnel URL:

1. **I-update ang Vercel Environment Variable:**
   - Key: `EXPO_PUBLIC_API_BASE_URL`
   - Value: `https://TUNNEL_URL.trycloudflare.com`
   - Environment: All Environments

2. **Mag-redeploy sa Vercel**

3. **I-verify sa browser** - dapat walang mixed content error

