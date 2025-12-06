# Step-by-Step: Paano I-fix ang Vercel Environment Variable

## Step 1: I-update ang Environment Variable sa Vercel

### 1.1 Pumunta sa Vercel Dashboard
1. I-open ang browser
2. Pumunta sa: https://vercel.com
3. I-login sa account mo
4. I-click ang project mo (halimbawa: "e-vent" o "FINALLYevent")

### 1.2 Pumunta sa Settings
1. Sa project page, i-click ang **"Settings"** tab (sa top navigation)
2. Sa left sidebar, i-click ang **"Environment Variables"**

### 1.3 I-update o I-add ang Environment Variable

**Option A: Kung may existing na `EXPO_PUBLIC_API_BASE_URL`:**
1. Hanapin ang `EXPO_PUBLIC_API_BASE_URL` sa list
2. I-click ang **eye icon** para makita ang current value
3. I-click ang **edit icon** (pencil) o i-click mismo ang variable name
4. I-update ang **Value** field sa:
   ```
   https://carey-intervention-pork-hayes.trycloudflare.com
   ```
5. I-verify na **"All Environments"** ang naka-select
6. I-click **"Save"**

**Option B: Kung WALANG existing na `EXPO_PUBLIC_API_BASE_URL`:**
1. I-click ang **"Add New"** button o **"Create new"** tab
2. Sa **"Key"** field, i-type:
   ```
   EXPO_PUBLIC_API_BASE_URL
   ```
3. Sa **"Value"** field, i-type:
   ```
   https://carey-intervention-pork-hayes.trycloudflare.com
   ```
4. Sa **"Environments"** dropdown, piliin **"All Environments"**
5. I-click **"Save"**

### 1.4 I-verify
- Dapat makita mo sa list: `EXPO_PUBLIC_API_BASE_URL` = `https://carey-intervention-pork-hayes.trycloudflare.com`
- Dapat may checkmark sa "All Environments"

---

## Step 2: I-restart ang Server sa VPS

### 2.1 I-connect sa VPS
1. I-open ang terminal (o SSH client)
2. I-connect sa VPS:
   ```bash
   ssh root@your-vps-ip
   ```
   (Palitan ang `your-vps-ip` sa actual IP ng VPS mo)

### 2.2 I-restart ang Server
1. Sa VPS terminal, i-run:
   ```bash
   pm2 restart event-api
   ```

2. Dapat makita mo:
   ```
   [PM2] Applying action restartProcessId on app [event-api] (ids: [0])
   [PM2] [event-api] (0) ✓
   ```

3. I-verify na tumatakbo:
   ```bash
   pm2 status
   ```
   Dapat makita mo: `event-api` na **online**

---

## Step 3: Mag-redeploy sa Vercel

### 3.1 Pumunta sa Deployments
1. Sa Vercel Dashboard, i-click ang **"Deployments"** tab (sa top navigation)
2. Makikita mo ang list ng deployments

### 3.2 Mag-redeploy
1. Hanapin ang **latest deployment** (yung nasa top)
2. I-click ang **"..."** (three dots) menu sa right side
3. Piliin **"Redeploy"**
4. Sa popup, i-click ulit ang **"Redeploy"** button

### 3.3 Hintayin ang Deployment
1. Makikita mo ang deployment status (Building → Deploying → Ready)
2. Hintayin hanggang maging **"Ready"** (usually 1-3 minutes)

---

## Step 4: I-verify na Gumagana

### 4.1 I-open ang Vercel App
1. I-click ang deployment na "Ready"
2. O i-open ang URL: `https://e-vent-jade.vercel.app` (o yung Vercel URL mo)

### 4.2 I-open ang Developer Console
1. I-press **F12** (o right-click → Inspect)
2. I-click ang **"Console"** tab

### 4.3 I-check ang Logs
1. Hanapin ang line na may:
   ```
   🌐 Using API base URL from environment: https://carey-intervention-pork-hayes.trycloudflare.com
   ```

2. **DAPAT:**
   - ✅ Makita mo ang `https://carey-intervention-pork-hayes.trycloudflare.com`
   - ❌ HINDI na `http://72.62.64.59:3001`

3. **DAPAT:**
   - ✅ Walang CORS error
   - ✅ Walang `ERR_FAILED` error
   - ✅ May response mula sa API (kahit 404 o 500, basta may response)

---

## Troubleshooting

### Problem: Hindi pa rin gumagana after redeploy
**Solution:**
1. I-clear ang browser cache (Ctrl+Shift+Delete)
2. O i-open ang Incognito/Private window
3. I-try ulit

### Problem: Hindi makita ang `EXPO_PUBLIC_API_BASE_URL` sa Vercel
**Solution:**
1. I-check kung may typo: dapat `EXPO_PUBLIC_API_BASE_URL` (exact spelling)
2. I-check kung naka-set sa "All Environments"
3. I-try mag-add ulit

### Problem: Still showing old URL sa console
**Solution:**
1. I-verify na na-redeploy na (check deployment timestamp)
2. I-clear browser cache
3. I-hard refresh (Ctrl+Shift+R)

---

## Quick Checklist

- [ ] Na-update ang `EXPO_PUBLIC_API_BASE_URL` sa Vercel
- [ ] Value ay `https://carey-intervention-pork-hayes.trycloudflare.com` (HTTPS!)
- [ ] Naka-set sa "All Environments"
- [ ] Na-click ang "Save"
- [ ] Na-restart ang server sa VPS (`pm2 restart event-api`)
- [ ] Na-redeploy ang Vercel deployment
- [ ] Na-verify sa console na gumagamit ng tamang URL
- [ ] Walang CORS error

---

## Summary ng Values

**❌ WRONG:**
```
EXPO_PUBLIC_API_BASE_URL = http://72.62.64.59:3001
```

**✅ CORRECT:**
```
EXPO_PUBLIC_API_BASE_URL = https://carey-intervention-pork-hayes.trycloudflare.com
```

---

## Need Help?

Kung may problema pa rin:
1. I-check ang Vercel deployment logs
2. I-check ang server logs sa VPS: `pm2 logs event-api --lines 50`
3. I-verify ang tunnel URL: `pm2 logs cloudflare-tunnel --lines 50 | grep trycloudflare`

