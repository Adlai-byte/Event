# How to Enable HTTPS Redirect (301 Redirect)

## What is the 301 Redirect?

The 301 redirect automatically redirects all HTTP traffic to HTTPS, ensuring all visitors use the secure connection.

**Example:**
- User visits: `http://yourdomain.com`
- Automatically redirected to: `https://yourdomain.com`

## When to Uncomment the 301 Redirect

### ✅ DO Uncomment When:
- SSL certificate is **successfully installed** via Certbot
- You can access your site via HTTPS: `https://yourdomain.com`
- SSL certificate test passes: `certbot certificates`

### ❌ DON'T Uncomment When:
- SSL certificate is **not installed yet**
- You're still using HTTP only
- Certbot failed or hasn't been run
- You don't have a domain name yet

**Why?** If you uncomment before SSL is ready, visitors will be redirected to HTTPS but won't have a valid certificate, causing security errors.

## Step-by-Step: How to Uncomment

### Step 1: Verify SSL is Installed

```bash
# Check if SSL certificate exists
certbot certificates

# Test HTTPS access
curl -I https://yourdomain.com
```

If both work, proceed to Step 2.

### Step 2: Edit Nginx Configuration

```bash
nano /etc/nginx/sites-available/event-app
```

### Step 3: Find the Commented Line

Look for this line (it has a `#` at the beginning):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;  ← This line is commented

    location / {
        proxy_pass http://localhost:3001;
        # ... rest of config
    }
}
```

### Step 4: Uncomment the Line

Remove the `#` from the beginning:

**Before (commented):**
```nginx
    # return 301 https://$server_name$request_uri;
```

**After (uncommented):**
```nginx
    return 301 https://$server_name$request_uri;
```

### Step 5: Complete Configuration

Your final config should look like this:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;

    # Note: The location blocks below won't be reached for HTTP
    # because of the redirect above
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

    location /uploads {
        alias /var/www/event-app/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Important:** The `return 301` line should be **before** the `location /` block.

### Step 6: Save and Test

1. **Save the file:**
   - Press `Ctrl+X`
   - Press `Y` to confirm
   - Press `Enter` to save

2. **Test Nginx configuration:**
   ```bash
   nginx -t
   ```
   
   Should show: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

3. **Reload Nginx:**
   ```bash
   systemctl reload nginx
   ```

### Step 7: Verify It Works

Test the redirect:

```bash
# Test HTTP redirect (should redirect to HTTPS)
curl -I http://yourdomain.com

# Should show:
# HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/...
```

Or test in browser:
- Visit: `http://yourdomain.com`
- Should automatically redirect to: `https://yourdomain.com`

## Troubleshooting

### Problem: Redirect Loop

**Symptom:** Site keeps redirecting in a loop

**Cause:** You might have the redirect in both HTTP and HTTPS server blocks

**Fix:**
```bash
# Check if you have duplicate redirects
grep -r "return 301" /etc/nginx/sites-available/

# The redirect should ONLY be in the HTTP (port 80) server block
# NOT in the HTTPS (port 443) server block
```

### Problem: "Too Many Redirects" Error

**Cause:** Redirect is in the wrong place or HTTPS config is missing

**Fix:**
1. Make sure Certbot created the HTTPS server block
2. Check `/etc/nginx/sites-available/event-app` - Certbot should have added a `server { listen 443; }` block
3. The redirect should only be in the `listen 80;` block

### Problem: Site Not Accessible After Uncommenting

**Cause:** SSL certificate might not be properly installed

**Fix:**
```bash
# Check SSL certificate
certbot certificates

# If certificate is missing, reinstall:
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Then uncomment the redirect again
```

### Problem: Nginx Test Fails

**Symptom:** `nginx -t` shows errors

**Fix:**
```bash
# Check for syntax errors
nginx -t

# Common issues:
# - Missing semicolon
# - Wrong placement of redirect line
# - Duplicate server blocks
```

## Quick Reference

### Current Status: HTTP Only (Redirect Commented)
```nginx
# return 301 https://$server_name$request_uri;  ← Commented
location / {
    proxy_pass http://localhost:3001;
}
```
- HTTP works: ✅ `http://yourdomain.com`
- HTTPS works: ✅ `https://yourdomain.com` (if SSL installed)
- Auto-redirect: ❌ No

### After Uncommenting: HTTPS Redirect Enabled
```nginx
return 301 https://$server_name$request_uri;  ← Uncommented
location / {
    proxy_pass http://localhost:3001;
}
```
- HTTP works: ✅ But redirects to HTTPS
- HTTPS works: ✅ `https://yourdomain.com`
- Auto-redirect: ✅ Yes

## Summary

1. ✅ Install SSL certificate first: `certbot --nginx -d yourdomain.com`
2. ✅ Verify HTTPS works: `curl https://yourdomain.com`
3. ✅ Then uncomment: `return 301 https://$server_name$request_uri;`
4. ✅ Test: `nginx -t`
5. ✅ Reload: `systemctl reload nginx`
6. ✅ Verify redirect: Visit `http://yourdomain.com` → should redirect to HTTPS

---

**Remember:** Only uncomment the 301 redirect **AFTER** SSL is successfully installed!

