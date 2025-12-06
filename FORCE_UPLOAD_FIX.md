# Force Upload - Fix allowedOrigins Error

## Problem
Kahit na-verify na may `origin: true` sa file, may `allowedOrigins` error pa rin. Ibig sabihin, may old code pa rin na nagru-run.

## Solution: Force Upload at Verify

### Step 1: I-check ang Actual Content sa VPS

```bash
# Sa VPS
head -n 130 /var/www/event-app/server/index.js | tail -n 20
```

Dapat makita mo:
```javascript
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    ...
}));
```

**CRITICAL:** I-check kung may `origin: function` o `allowedOrigins` pa rin.

### Step 2: I-check kung May Multiple CORS Config

```bash
# Sa VPS
grep -n "app.use(cors" /var/www/event-app/server/index.js
```

Dapat isa lang ang CORS config. Kung may dalawa, may duplicate.

### Step 3: I-check kung May allowedOrigins Reference

```bash
# Sa VPS
grep -n "allowedOrigins" /var/www/event-app/server/index.js
```

**Expected:** Walang output (walang `allowedOrigins`)

Kung may output, i-edit directly:

```bash
# Sa VPS
nano /var/www/event-app/server/index.js

# Hanapin ang line na may allowedOrigins (Ctrl+W para search)
# I-delete o i-replace
```

### Step 4: Force Upload (Alternative Method)

Kung hindi gumagana ang SCP, i-copy ang content manually:

**Sa Local Computer:**
```powershell
# I-read ang CORS section
Get-Content C:\wamp64\www\FINALLYevent\Event\server\index.js | Select-Object -First 130 | Select-Object -Last 20
```

**Sa VPS:**
```bash
# I-edit ang file
nano /var/www/event-app/server/index.js

# Pumunta sa line 114-123 (Ctrl+_ then type 114)
# I-replace ang CORS config sa:
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
}));

# I-save: Ctrl+X, Y, Enter
```

### Step 5: I-restart at I-verify

```bash
# Sa VPS
pm2 restart event-api

# Wait 5 seconds
sleep 5

# I-check ang logs - dapat WALANG allowedOrigins
pm2 logs event-api --err --lines 50 | grep -i "allowedOrigins"
```

**Expected:** Walang output (walang `allowedOrigins` error)

### Step 6: I-check ang Full CORS Section

```bash
# Sa VPS
sed -n '114,123p' /var/www/event-app/server/index.js
```

Dapat makita mo:
```
// CORS configuration - allow all origins (including all Vercel deployments)
// Simple configuration that allows all origins
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
}));
```

## Alternative: Complete File Replacement

Kung hindi pa rin gumagana, i-backup at i-replace ang buong file:

```bash
# Sa VPS
cd /var/www/event-app/server
cp index.js index.js.backup
# Then upload the new file via SCP
```

O i-download ang file mula sa local at i-upload ulit.

