#!/bin/bash
# Setup API Domain with Cloudflare Tunnel

echo "=== Setting up API Domain ==="

# 1. Get free domain from Freenom
echo "1. Get free domain:"
echo "   - Go to: https://www.freenom.com"
echo "   - Register account"
echo "   - Get free domain (.tk, .ml, .ga, .cf, .gq)"
echo "   - Example: event-api.tk"
echo ""
read -p "Enter your domain (e.g., event-api.tk): " DOMAIN

# 2. Configure Cloudflare Tunnel route
echo ""
echo "2. Configuring Cloudflare Tunnel route..."
cloudflared tunnel route dns event-api-tunnel api.$DOMAIN

# 3. Start tunnel
echo ""
echo "3. Starting tunnel..."
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel
pm2 start cloudflared --name cloudflare-tunnel -- tunnel run event-api-tunnel

# 4. Wait
sleep 10

# 5. Test
echo ""
echo "4. Testing API..."
curl -v https://api.$DOMAIN/api/health 2>&1 | head -20

echo ""
echo "=== Setup Complete ==="
echo "Permanent API URL: https://api.$DOMAIN"
echo "Update your code: const VPS_API_URL = 'https://api.$DOMAIN';"



