# Paano Kunin ang Quick Tunnel URL

## Current Status
- ✅ May **Quick Tunnel** na tumatakbo (ID 11): `tunnel --url http://localhost:3001`
- ⚠️ May **Named Tunnel** din (ID 9): `tunnel run event-api-tunnel` (kailangan i-stop para hindi mag-conflict)

## Step 1: I-stop ang Named Tunnel (Para Hindi Mag-conflict)

```bash
# Sa VPS terminal
pm2 stop 9
pm2 delete 9
```

**Reason:** Parehong tumatakbo ang dalawang tunnels, kaya baka nagco-conflict. I-keep lang natin ang quick tunnel (ID 11).

## Step 2: I-check ang Logs ng Quick Tunnel

```bash
# Sa VPS terminal
# I-check ang logs ng quick tunnel (ID 11)
pm2 logs cloudflare-tunnel --lines 100 --nostream | grep -i "https://.*trycloudflare.com" | tail -1
```

**Expected Output:**
```
0|cloudfla | 2025-XX-XX INF | https://new-tunnel-url.trycloudflare.com
```

## Step 3: Kung Wala Pa Rin ang URL, I-check ang Full Logs

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 200 --nostream | tail -50
```

**Hanapin ang line na may:**
- `https://...trycloudflare.com`
- `Your quick Tunnel has been created! Visit it at:`
- `INF` na may URL

## Step 4: Alternative - I-restart ang Quick Tunnel

Kung wala pa rin ang URL, i-restart ang quick tunnel:

```bash
# Sa VPS terminal

# I-restart ang quick tunnel (ID 11)
pm2 restart 11

# Hintayin ng 20 seconds para mag-initialize
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

### Bakit May Dalawang Tunnels?

May dalawang tunnels na tumatakbo:
- **Named Tunnel (ID 9):** Permanent pero walang URL sa logs (kailangan ng Cloudflare dashboard)
- **Quick Tunnel (ID 11):** Temporary pero may URL sa logs

**Para sa ngayon, gamitin ang Quick Tunnel** para makakuha ng URL agad.

### Para sa Long-term

Kung gusto mo ng permanent URL:
1. I-setup ng proper named tunnel sa Cloudflare dashboard
2. I-configure ng DNS o custom domain
3. O kaya, i-setup ng named tunnel na may trycloudflare.com URL

Pero para sa ngayon, i-stop ang named tunnel at gamitin ang quick tunnel para makakuha ng URL.

