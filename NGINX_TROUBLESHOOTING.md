# Nginx Configuration Troubleshooting

## Error: "unknown directive 'nginx'"

This error means there's a syntax error in your Nginx configuration file.

## Quick Fix

### Step 1: Identify the Problem File

```bash
nginx -t
```

This will show you exactly which file and line has the error.

### Step 2: Check Main Configuration

The error might be in `/etc/nginx/nginx.conf`:

```bash
# View the main config
cat /etc/nginx/nginx.conf

# Check for syntax errors
nginx -T  # Shows full config with line numbers
```

### Step 3: Fix Common Issues

#### Issue: Corrupted Main Config

If `/etc/nginx/nginx.conf` is corrupted:

```bash
# Backup current config
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Restore default configuration
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    gzip on;
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
```

#### Issue: Problem in Site Config

If the error is in `/etc/nginx/sites-available/event-app`:

```bash
# Remove broken symlink
rm -f /etc/nginx/sites-enabled/event-app

# Check the config file
cat /etc/nginx/sites-available/event-app

# Recreate with correct config
nano /etc/nginx/sites-available/event-app
```

Paste this correct configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files directly
    location /uploads {
        alias /var/www/event-app/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Important:** Replace `yourdomain.com` with your actual domain or use `_` for any domain.

### Step 4: Test and Enable

```bash
# Test configuration
nginx -t

# If test passes, enable the site
ln -s /etc/nginx/sites-available/event-app /etc/nginx/sites-enabled/

# Test again
nginx -t

# Reload Nginx
systemctl reload nginx
```

## Common Nginx Errors

### Error: "semicolon expected"

**Cause:** Missing semicolon at end of directive

**Fix:** Add semicolon:
```nginx
# Wrong:
proxy_pass http://localhost:3001

# Correct:
proxy_pass http://localhost:3001;
```

### Error: "unexpected end of file"

**Cause:** Missing closing brace `}`

**Fix:** Check all blocks are properly closed:
```nginx
server {
    # ... config ...
}  # <- This closing brace must exist
```

### Error: "duplicate listen options"

**Cause:** Multiple `listen` directives for same port

**Fix:** Remove duplicate `listen` lines

### Error: "unknown log format"

**Cause:** Invalid log format definition

**Fix:** Check log format syntax or remove custom log formats

## Verify Nginx is Working

```bash
# Check Nginx status
systemctl status nginx

# Check if it's listening on port 80
netstat -tlnp | grep :80
# or
ss -tlnp | grep :80

# Test from localhost
curl http://localhost

# Check error logs
tail -f /var/log/nginx/error.log
```

## Reset Nginx to Default

If everything is broken, reset to defaults:

```bash
# Stop Nginx
systemctl stop nginx

# Remove all custom configs
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/event-app

# Restore default main config (see Step 3 above)

# Start Nginx
systemctl start nginx

# Recreate your site config
nano /etc/nginx/sites-available/event-app
# (paste correct config from Step 3)

# Enable and test
ln -s /etc/nginx/sites-available/event-app /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Quick Reference: Correct Nginx Config Structure

```nginx
# Main config: /etc/nginx/nginx.conf
user www-data;
worker_processes auto;
# ... other settings ...
http {
    # ... http settings ...
    include /etc/nginx/sites-enabled/*;  # Include site configs
}

# Site config: /etc/nginx/sites-available/event-app
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        # ... proxy settings ...
    }
}
```

## Still Having Issues?

1. Check Nginx error log: `tail -50 /var/log/nginx/error.log`
2. Check Nginx access log: `tail -50 /var/log/nginx/access.log`
3. Verify Node.js app is running: `pm2 status`
4. Test Node.js directly: `curl http://localhost:3001/api/health`

---

**Remember:** Always run `nginx -t` before reloading Nginx!

