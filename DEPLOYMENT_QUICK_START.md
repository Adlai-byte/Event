# Quick Start: Deploy to Hostinger VPS

## Prerequisites Checklist

- [ ] Hostinger VPS with SSH access
- [ ] Domain name (optional but recommended)
- [ ] MySQL database created
- [ ] PayMongo API keys ready
- [ ] Files transferred to VPS

## 5-Minute Deployment

### 1. Connect to VPS

```bash
ssh root@your-vps-ip
```

**⚠️ SSH Connection Issues?**
If you get "Connection timed out":
1. Check VPS is **Running** in Hostinger control panel
2. Verify SSH is **enabled** in VPS settings
3. Use Hostinger **Web Console** to access server first
4. See **SSH_CONNECTION_TROUBLESHOOTING.md** for detailed help

### 2. Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx
```

### 3. Transfer Your Files

**Option A: Using SCP (from your local Windows machine)**

⚠️ **Run this from your local machine, NOT from the VPS!**

```powershell
# In Windows PowerShell, navigate to your project
cd C:\wamp64\www\FINALLYevent\Event

# Transfer the server folder
scp -r server root@72.62.64.59:/var/www/event-app/
```

You'll be prompted for the root password.

**Option B: Using Git**
```bash
cd /var/www
git clone your-repo-url event-app
```

### 4. Run Deployment Script

```bash
cd /var/www/event-app
chmod +x deploy-to-hostinger.sh
sudo ./deploy-to-hostinger.sh
```

**Important:** Edit `.env` file when prompted!

### 5. Configure Nginx

```bash
nano /etc/nginx/sites-available/event-app
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads {
        alias /var/www/event-app/server/uploads;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/event-app /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 6. Setup SSL (Optional but Recommended)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

## Verify Deployment

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs event-api

# Test API
curl http://localhost:3001/api/health
```

## Common Issues

### ❌ "Node.js not found"
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### ❌ "PM2 not found"
```bash
npm install -g pm2
```

### ❌ "502 Bad Gateway"
- Check if app is running: `pm2 status`
- Check logs: `pm2 logs event-api`
- Verify port in `.env` file is 3001

### ❌ "Database connection failed"
- Verify MySQL is running: `systemctl status mysql`
- Check `.env` file credentials
- Test connection: `mysql -u event_user -p event_db`

## Environment Variables (.env)

Create `/var/www/event-app/server/.env`:

```env
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=your_password
DB_NAME=event_db
DB_PORT=3306

PORT=3001
NODE_ENV=production
API_BASE_URL=https://yourdomain.com

PAYMONGO_SECRET_KEY=sk_live_your_key
PAYMONGO_PUBLIC_KEY=pk_live_your_key
PAYMONGO_MODE=live
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check app status |
| `pm2 logs event-api` | View logs |
| `pm2 restart event-api` | Restart app |
| `pm2 monit` | Monitor resources |
| `systemctl status nginx` | Check Nginx |
| `nginx -t` | Test Nginx config |

## Full Documentation

For detailed instructions, see: **HOSTINGER_VPS_DEPLOYMENT.md**

---

**Need Help?** Check the troubleshooting section in the full deployment guide.

