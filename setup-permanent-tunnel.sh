#!/bin/bash
# Setup Permanent Named Tunnel

echo "=== Setting up Permanent Named Tunnel ==="

# 1. I-stop ang current tunnel
echo "1. Stopping current tunnel..."
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# 2. I-verify ang config file
echo "2. Verifying config file..."
cat ~/.cloudflared/config.yml

# 3. I-check kung may domain ka (optional)
echo ""
echo "3. Do you have a domain? (y/n)"
read -r HAS_DOMAIN

if [ "$HAS_DOMAIN" = "y" ]; then
    echo "Enter your domain (e.g., yourdomain.com):"
    read -r DOMAIN
    echo "Setting up DNS route for $DOMAIN..."
    cloudflared tunnel route dns event-api-tunnel api.$DOMAIN
    echo "Permanent URL: https://api.$DOMAIN"
else
    echo "Using named tunnel without custom domain..."
    echo "Note: Named tunnels need a route. For free option, use quick tunnel."
    echo "Or get a free domain from Freenom, Cloudflare, etc."
fi

# 4. I-start ang named tunnel
echo ""
echo "4. Starting named tunnel..."
pm2 start cloudflared --name cloudflare-tunnel -- tunnel run event-api-tunnel

# 5. I-wait
sleep 10

# 6. I-check ang logs
echo ""
echo "5. Checking tunnel logs..."
pm2 logs cloudflare-tunnel --lines 30



