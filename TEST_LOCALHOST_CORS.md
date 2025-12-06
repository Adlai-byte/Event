# Test CORS sa Localhost (Bypass Cloudflare Tunnel)

## Step 1: I-test ang OPTIONS Request sa Localhost

```bash
# Sa VPS terminal
curl -v -X OPTIONS http://localhost:3001/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" \
  -H "Access-Control-Request-Method: GET" 2>&1 | head -50
```

**Expected:** Dapat makita mo ang:
- `HTTP/1.1 204 No Content` o `HTTP/1.1 200 OK`
- `< Access-Control-Allow-Origin: https://e-vent-jade.vercel.app`
- `< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH`
- `< Access-Control-Allow-Credentials: true`

## Step 2: Kung GUMAGANA sa Localhost pero HINDI sa Cloudflare Tunnel

Ibig sabihin, ang issue ay sa Cloudflare tunnel configuration. I-check ang tunnel config:

```bash
# Sa VPS terminal
pm2 logs cloudflare-tunnel --lines 50 | grep -i "error\|warn\|config"
```

## Step 3: I-check ang Cloudflare Tunnel Config File

```bash
# Sa VPS terminal
# Hanapin ang tunnel config file
find /root -name "*cloudflare*" -type f 2>/dev/null | head -5

# O i-check ang PM2 ecosystem config
pm2 show cloudflare-tunnel | grep -i "script\|args"
```

## Step 4: Kung HINDI GUMAGANA sa Localhost

Ibig sabihin, ang issue ay sa server code mismo. I-verify na ang latest code ay na-upload:

```bash
# Sa VPS terminal
# I-check ang CORS config
sed -n '114,123p' /var/www/event-app/server/index.js

# I-check kung may ibang middleware na nagb-block ng OPTIONS
grep -n "app.use\|app.options" /var/www/event-app/server/index.js | head -20
```

## Step 5: I-test ang GET Request sa Localhost

```bash
# Sa VPS terminal
curl -v http://localhost:3001/api/health \
  -H "Origin: https://e-vent-jade.vercel.app" 2>&1 | head -50
```

**Expected:** Dapat makita mo ang:
- `HTTP/1.1 200 OK`
- `< Access-Control-Allow-Origin: https://e-vent-jade.vercel.app`
- `{"ok":true}` sa body

