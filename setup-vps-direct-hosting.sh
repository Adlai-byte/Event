#!/bin/bash
# Setup VPS Direct Hosting (No Tunnel Needed)

echo "=== Setting up VPS Direct Hosting ==="

# 1. I-check kung may Nginx/Apache
echo "1. Checking web server..."
which nginx || which apache2 || echo "No web server found. Installing Nginx..."

# 2. I-install Nginx (kung wala)
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# 3. I-configure Nginx reverse proxy
echo ""
echo "2. Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/api << EOF
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 4. I-enable site
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. I-install Certbot para sa SSL
echo ""
echo "3. Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

# 6. I-get SSL certificate (kung may domain)
echo ""
echo "4. Getting SSL certificate..."
echo "If you have a domain, run:"
echo "sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com"

echo ""
echo "=== Setup Complete ==="
echo "Your API will be accessible at:"
echo "- HTTP: http://YOUR_DOMAIN_OR_IP"
echo "- HTTPS: https://YOUR_DOMAIN_OR_IP (after SSL setup)"



