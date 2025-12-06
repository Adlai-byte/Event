# UPLOAD SERVER CODE SA VPS AT I-RESTART

## Problem
Ang CORS fix ay nasa code mo na, pero **HINDI PA NA-UPLOAD SA VPS**. Kailangan mo i-upload ang updated `server/index.js` file.

## Solution: 3 Ways to Upload

### Option 1: Git (Recommended - Pinakamadali)

Kung naka-Git ka:

```bash
# Sa local computer mo (Windows)
cd C:\wamp64\www\FINALLYevent\Event

# Commit ang changes
git add server/index.js
git commit -m "Fix CORS configuration"
git push

# Sa VPS terminal
cd /path/to/your/server
git pull

# Restart server
pm2 restart event-api
```

### Option 2: SCP (Direct Upload)

Kung hindi naka-Git:

**Sa Windows (PowerShell o CMD):**
```powershell
# I-upload ang file
scp C:\wamp64\www\FINALLYevent\Event\server\index.js root@your-vps-ip:/path/to/server/index.js
```

**O kung alam mo ang exact path:**
```powershell
scp C:\wamp64\www\FINALLYevent\Event\server\index.js root@your-vps-ip:/var/www/event-app/server/index.js
```

Pagkatapos, sa VPS:
```bash
pm2 restart event-api
```

### Option 3: Manual Copy-Paste

1. **I-open ang `server/index.js` sa local computer**
2. **I-copy ang LAHAT ng content** (Ctrl+A, Ctrl+C)
3. **SSH sa VPS:**
   ```bash
   ssh root@your-vps-ip
   ```
4. **Pumunta sa server directory:**
   ```bash
   cd /var/www/event-app/server
   # O kung saan man naka-locate ang server
   ```
5. **I-edit ang file:**
   ```bash
   nano index.js
   # O
   vi index.js
   ```
6. **I-paste ang updated code** (Ctrl+Shift+V sa nano, o i sa vi then paste)
7. **I-save:**
   - Nano: Ctrl+X, then Y, then Enter
   - Vi: Esc, then :wq, then Enter
8. **I-restart ang server:**
   ```bash
   pm2 restart event-api
   ```

---

## Quick Check: Ano ang Kailangan I-upload?

**File:** `server/index.js`

**Important Section (lines 114-155):**
Dapat may ganito:
```javascript
// CORS configuration - allow all origins (including all Vercel deployments)
// Explicitly handle CORS for all origins, especially Vercel domains
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Log the origin for debugging
    if (origin) {
        console.log(`🌐 CORS Request from origin: ${origin}`);
    }
    
    // Set CORS headers explicitly
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Also use cors middleware as backup
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
}));
```

---

## After Upload: I-verify

### 1. I-check ang Server Logs
```bash
# Sa VPS
pm2 logs event-api --lines 20
```

Dapat makita mo ang server na nag-start ulit.

### 2. I-test ang CORS
```bash
# Sa VPS
curl -I -X OPTIONS https://carey-intervention-pork-hayes.trycloudflare.com/api/health \
  -H "Origin: https://e-vent-jade.vercel.app"
```

Dapat makita mo ang `Access-Control-Allow-Origin` header.

### 3. I-test sa Browser
Pagkatapos ng upload at restart:
1. I-open ang Vercel app
2. I-check ang console
3. Dapat walang CORS error na

---

## Complete Checklist

- [ ] Na-upload ang updated `server/index.js` sa VPS
- [ ] Na-restart ang server (`pm2 restart event-api`)
- [ ] Na-verify sa logs na tumatakbo
- [ ] Na-test ang CORS headers
- [ ] Na-test sa Vercel app (walang CORS error)

---

## Need Help Finding Server Path?

Sa VPS, i-run:
```bash
# Find server directory
find / -name "index.js" -path "*/server/*" 2>/dev/null | head -1

# O check PM2
pm2 info event-api | grep "script path"
```

