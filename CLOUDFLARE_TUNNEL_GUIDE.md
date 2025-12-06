# Cloudflare Tunnel Setup Guide para sa VPS

## Quick Start (Temporary Tunnel - Para sa Testing)

**Sa VPS, i-run lang:**

```bash
# Install cloudflared
cd /tmp
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y

# Run quick tunnel (temporary)
cloudflared tunnel --url http://localhost:3001
```

**Output example:**
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://random-subdomain-1234.trycloudflare.com                                           |
+--------------------------------------------------------------------------------------------+
```

**Copy ang HTTPS URL** at i-update sa `api.ts`:
```typescript
const VPS_API_URL = 'https://random-subdomain-1234.trycloudflare.com';
```

**Note:** Ang quick tunnel ay temporary - mag-e-expire kapag na-close ang connection. Para sa permanent setup, gamitin ang Option B.

---

## Option B: Permanent Tunnel (Para sa Production)

### Step 1: Create Cloudflare Account

1. Pumunta sa https://dash.cloudflare.com/sign-up
2. Sign up (FREE)
3. After sign up, pumunta sa **Zero Trust** → **Networks** → **Tunnels**

### Step 2: Create Tunnel sa Cloudflare Dashboard

1. Click **"Create a tunnel"**
2. Piliin **"Cloudflared"**
3. I-name: `event-api-tunnel`
4. Click **"Save tunnel"**
5. **I-COPY ANG TUNNEL TOKEN** (kailangan mo ito)

### Step 3: Setup sa VPS

**SSH sa VPS:**
```bash
ssh root@72.62.64.59
```

**Install cloudflared:**
```bash
cd /tmp
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y
```

**Authenticate tunnel:**
```bash
cloudflared tunnel login
```
- I-paste ang tunnel token na nakuha mo sa Step 2
- Press Enter

**Create tunnel:**
```bash
cloudflared tunnel create event-api-tunnel
```

**Get tunnel ID:**
```bash
cloudflared tunnel list
```
- I-copy ang tunnel ID (hal. `abc123def-4567-8901-2345-6789abcdef01`)

**Create config file:**
```bash
nano /etc/cloudflared/config.yml
```

**I-paste ang config (palitan ang `YOUR_TUNNEL_ID`):**
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: event-api.YOUR_SUBDOMAIN.trycloudflare.com
    service: http://localhost:3001
  - service: http_status:404
```

**I-save:** Ctrl+X, Y, Enter

### Step 4: Configure Public Hostname sa Cloudflare Dashboard

1. Pumunta sa Cloudflare Dashboard → Zero Trust → Tunnels
2. Click sa `event-api-tunnel`
3. Click **"Configure"** tab
4. Click **"Add a public hostname"**
5. **Subdomain:** `event-api`
6. **Domain:** Piliin ang `trycloudflare.com` (o kung may domain ka na, i-use mo yun)
7. **Service:** `http://localhost:3001`
8. Click **"Save hostname"**

### Step 5: Run Tunnel as Service

**Create systemd service:**
```bash
nano /etc/systemd/system/cloudflared.service
```

**I-paste:**
```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run event-api-tunnel
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

**I-save:** Ctrl+X, Y, Enter

**Enable at start service:**
```bash
systemctl daemon-reload
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared
```

### Step 6: Get Your HTTPS URL

**Check tunnel status:**
```bash
cloudflared tunnel info event-api-tunnel
```

**O i-check sa Cloudflare Dashboard:**
- Zero Trust → Tunnels → event-api-tunnel
- Makikita mo ang public hostname (hal. `https://event-api.abc123.trycloudflare.com`)

### Step 7: Update Frontend API URL

**I-update ang `mvc/services/api.ts`:**
```typescript
const VPS_API_URL = 'https://event-api.abc123.trycloudflare.com';
```

**O i-set via environment variable:**
```bash
# Sa Vercel Dashboard → Environment Variables
EXPO_PUBLIC_API_BASE_URL=https://event-api.abc123.trycloudflare.com
```

---

## Troubleshooting

### Check if tunnel is running:
```bash
systemctl status cloudflared
```

### Check tunnel logs:
```bash
journalctl -u cloudflared -f
```

### Test tunnel manually:
```bash
cloudflared tunnel --config /etc/cloudflared/config.yml run event-api-tunnel
```

### Restart tunnel:
```bash
systemctl restart cloudflared
```

---

## Quick Reference Commands

```bash
# Install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Quick tunnel (temporary)
cloudflared tunnel --url http://localhost:3001

# Permanent tunnel setup
cloudflared tunnel login
cloudflared tunnel create event-api-tunnel
cloudflared tunnel list  # Get tunnel ID

# Service management
systemctl start cloudflared
systemctl stop cloudflared
systemctl restart cloudflared
systemctl status cloudflared
```

