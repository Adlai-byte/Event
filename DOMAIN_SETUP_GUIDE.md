# How to Configure and Access Your Domain on VPS

Complete guide to point your domain to your VPS and access your application.

## Step 1: Point Your Domain to VPS IP

### Option A: If Domain is with Hostinger

1. **Log in to Hostinger Control Panel**
   - Go to https://hpanel.hostinger.com
   - Navigate to **Domains** → Select your domain

2. **Configure DNS Records**
   - Go to **DNS / Name Servers** section
   - Add/Edit **A Record**:
     - **Type:** A
     - **Name:** @ (or leave blank for root domain)
     - **Points to:** `72.62.64.59` (your VPS IP)
     - **TTL:** 3600 (or default)
   - Add **A Record for www**:
     - **Type:** A
     - **Name:** www
     - **Points to:** `72.62.64.59`
     - **TTL:** 3600

3. **Save Changes**
   - DNS changes can take 5 minutes to 48 hours to propagate
   - Usually takes 15-30 minutes

### Option B: If Domain is with Another Provider

1. **Log in to Your Domain Registrar** (GoDaddy, Namecheap, etc.)

2. **Find DNS Management**
   - Look for **DNS Settings**, **DNS Management**, or **Advanced DNS**

3. **Add A Records**
   - Add A record for root domain:
     - **Host/Name:** @ (or blank)
     - **Type:** A
     - **Value/Points to:** `72.62.64.59`
     - **TTL:** 3600
   - Add A record for www:
     - **Host/Name:** www
     - **Type:** A
     - **Value/Points to:** `72.62.64.59`
     - **TTL:** 3600

4. **Save and Wait**
   - DNS propagation: 15 minutes to 48 hours

## Step 2: Verify DNS is Working

### Check DNS Propagation

From your local machine (PowerShell):

```powershell
# Check if domain points to your VPS IP
nslookup yourdomain.com
# Should show: 72.62.64.59

# Or use
Resolve-DnsName yourdomain.com
```

From VPS:

```bash
# Check DNS resolution
nslookup yourdomain.com
dig yourdomain.com
host yourdomain.com
```

### Test Domain Access

```bash
# From VPS, test if domain resolves
curl -I http://yourdomain.com

# Or test locally
curl -I http://yourdomain.com
```

## Step 3: Update Nginx Configuration

### Edit Nginx Config

```bash
nano /etc/nginx/sites-available/event-app
```

### Update server_name

Replace `yourdomain.com` with your actual domain:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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

**Important:** Replace `yourdomain.com` with your actual domain name!

### Test and Reload

```bash
# Test configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx
```

## Step 4: Update Environment Variables

Update your `.env` file with the domain:

```bash
nano /var/www/event-app/server/.env
```

Update `API_BASE_URL`:

```env
API_BASE_URL=https://yourdomain.com
```

**Note:** Use `https://` if you'll set up SSL, or `http://` for now.

Restart your application:

```bash
pm2 restart event-api
```

## Step 5: Setup SSL Certificate (HTTPS)

### Install Certbot

```bash
apt update
apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**During setup:**
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### Verify SSL is Working

```bash
# Check certificate
certbot certificates

# Test HTTPS
curl -I https://yourdomain.com
```

## Step 6: Access Your Domain

### From Browser

1. **HTTP (if SSL not set up yet):**
   ```
   http://yourdomain.com
   http://yourdomain.com/api/health
   ```

2. **HTTPS (after SSL setup):**
   ```
   https://yourdomain.com
   https://yourdomain.com/api/health
   ```

### From Command Line

```bash
# Test API endpoint
curl http://yourdomain.com/api/health
# or
curl https://yourdomain.com/api/health
```

## Step 7: Verify Everything Works

### Checklist

- [ ] DNS A record points to `72.62.64.59`
- [ ] `nslookup yourdomain.com` shows correct IP
- [ ] Nginx `server_name` matches your domain
- [ ] Nginx config test passes (`nginx -t`)
- [ ] Application is running (`pm2 status`)
- [ ] Can access via IP: `curl http://72.62.64.59`
- [ ] Can access via domain: `curl http://yourdomain.com`
- [ ] SSL certificate installed (if using HTTPS)
- [ ] `.env` file has correct `API_BASE_URL`

## Troubleshooting

### Domain Not Resolving

**Problem:** Domain doesn't point to VPS IP

**Solution:**
1. Check DNS records in domain registrar
2. Wait for DNS propagation (can take up to 48 hours)
3. Use `nslookup` to verify DNS is correct
4. Clear DNS cache: `ipconfig /flushdns` (Windows)

### 502 Bad Gateway

**Problem:** Domain resolves but shows 502 error

**Solution:**
```bash
# Check if app is running
pm2 status

# Check app logs
pm2 logs event-api

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Verify port 3001 is correct in .env
cat /var/www/event-app/server/.env | grep PORT
```

### Domain Works but API Doesn't

**Problem:** Domain loads but API endpoints fail

**Solution:**
1. Check CORS settings in your app
2. Verify `API_BASE_URL` in `.env` matches domain
3. Check application logs: `pm2 logs event-api`
4. Test directly: `curl http://localhost:3001/api/health`

### SSL Certificate Issues

**Problem:** Certbot fails or certificate not working

**Solution:**
```bash
# Check if port 80 and 443 are open
ufw status
ufw allow 80/tcp
ufw allow 443/tcp

# Verify domain resolves correctly
nslookup yourdomain.com

# Try certbot again with verbose output
certbot --nginx -d yourdomain.com -d www.yourdomain.com --verbose
```

## Quick Commands Reference

```bash
# Check DNS
nslookup yourdomain.com
dig yourdomain.com

# Test domain access
curl -I http://yourdomain.com
curl http://yourdomain.com/api/health

# Check Nginx config
nginx -t
cat /etc/nginx/sites-available/event-app

# Check application
pm2 status
pm2 logs event-api

# Check SSL
certbot certificates
curl -I https://yourdomain.com
```

## Testing Your Domain

### Test 1: DNS Resolution

```bash
nslookup yourdomain.com
# Should return: 72.62.64.59
```

### Test 2: HTTP Access

```bash
curl http://yourdomain.com
# Should return your API response
```

### Test 3: API Endpoint

```bash
curl http://yourdomain.com/api/health
# Should return health check response
```

### Test 4: HTTPS (if SSL configured)

```bash
curl https://yourdomain.com
# Should return your API response with SSL
```

## Common Domain Providers

### Hostinger
- DNS Management: hpanel.hostinger.com → Domains → DNS
- Add A record: Type A, Name @, Points to VPS IP

### GoDaddy
- DNS Management: GoDaddy → My Products → DNS
- Add A record: Type A, Name @, Value VPS IP

### Namecheap
- DNS Management: Domain List → Manage → Advanced DNS
- Add A record: Type A Record, Host @, Value VPS IP

### Cloudflare
- DNS Management: Cloudflare Dashboard → DNS
- Add A record: Type A, Name @, IPv4 address VPS IP
- **Important:** Set proxy status to "DNS only" (gray cloud) initially

---

**Your domain should now be accessible at:** `http://yourdomain.com` or `https://yourdomain.com`

