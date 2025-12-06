# Hostinger VPS Deployment Checklist

Use this checklist to ensure you don't miss any steps during deployment.

## Pre-Deployment

- [ ] VPS access credentials (IP, username, password/SSH key)
- [ ] Domain name configured (if using)
- [ ] MySQL database created
- [ ] Database user created with proper permissions
- [ ] PayMongo API keys (live keys for production)
- [ ] Firebase credentials (if using Firebase)
- [ ] All environment variables documented

## Server Setup

- [ ] Connected to VPS via SSH
- [ ] System packages updated (`apt update && apt upgrade`)
- [ ] Node.js 20.x installed and verified
- [ ] PM2 installed globally
- [ ] MySQL installed and secured
- [ ] Nginx installed and running
- [ ] Firewall configured (UFW)

## Database Setup

- [ ] MySQL database created (`event_db`)
- [ ] Database user created (`event_user`)
- [ ] User permissions granted
- [ ] Database schema imported
- [ ] Test connection successful

## Application Deployment

- [ ] Files transferred to `/var/www/event-app/`
- [ ] Server directory structure verified
- [ ] `.env` file created in `server/` directory
- [ ] All environment variables configured correctly
- [ ] Dependencies installed (`npm install --production`)
- [ ] Upload directories created (`uploads/images`, `uploads/documents`)
- [ ] File permissions set correctly
- [ ] Application started with PM2
- [ ] PM2 startup script configured

## Nginx Configuration

- [ ] Nginx configuration file created
- [ ] Reverse proxy configured (port 3001)
- [ ] Static files (uploads) configured
- [ ] Site enabled (`ln -s`)
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Nginx reloaded successfully

## SSL Certificate

- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS redirect configured
- [ ] Auto-renewal verified

## Testing

- [ ] PM2 status shows app running
- [ ] Application logs checked (no errors)
- [ ] API health endpoint tested (`/api/health`)
- [ ] Database connection tested
- [ ] File upload functionality tested
- [ ] Payment integration tested (if applicable)
- [ ] External access verified (from browser/Postman)

## Security

- [ ] Firewall rules configured
- [ ] Strong passwords set for database
- [ ] SSH key authentication enabled (recommended)
- [ ] `.env` file permissions secured (600)
- [ ] Regular backup strategy planned

## Post-Deployment

- [ ] React Native app updated with production API URL
- [ ] API endpoints tested from mobile app
- [ ] Monitoring setup (PM2 monit or external service)
- [ ] Backup scripts created
- [ ] Documentation updated with production URLs

## Maintenance

- [ ] Log rotation configured
- [ ] Backup automation setup
- [ ] Update procedure documented
- [ ] Monitoring alerts configured

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| App not starting | Check `pm2 logs event-api` |
| 502 Bad Gateway | Verify app is running, check Nginx config |
| Database errors | Verify credentials in `.env`, test MySQL connection |
| File upload fails | Check uploads directory permissions |
| SSL errors | Verify certificate with `certbot certificates` |

## Quick Commands Reference

```bash
# Application
pm2 status
pm2 logs event-api
pm2 restart event-api
pm2 monit

# Nginx
systemctl status nginx
nginx -t
systemctl reload nginx

# Database
mysql -u event_user -p event_db
systemctl status mysql

# Logs
tail -f /var/log/nginx/error.log
pm2 logs event-api --lines 100
```

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Production URL:** _______________
**Notes:** _______________

