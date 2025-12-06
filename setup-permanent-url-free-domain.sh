#!/bin/bash
# Setup Permanent URL with Free Domain

echo "=== Setting up Permanent URL ==="

# Option 1: Gamitin ang Freenom (Free Domain)
echo "1. Getting free domain from Freenom..."
echo "   - Go to: https://www.freenom.com"
echo "   - Register account"
echo "   - Get free domain (.tk, .ml, .ga, .cf, .gq)"
echo "   - Example: event-api.tk"

# Option 2: Gamitin ang Cloudflare (Free Domain)
echo ""
echo "2. OR use Cloudflare (Free Domain):"
echo "   - Go to: https://www.cloudflare.com"
echo "   - Sign up for free account"
echo "   - Add your domain (or get one from Cloudflare)"

# Option 3: Gamitin ang VPS IP Directly (Kung May Static IP)
echo ""
echo "3. OR use VPS IP directly (if you have static IP):"
echo "   - Get your VPS IP"
echo "   - Configure firewall to allow port 3001"
echo "   - Use: http://YOUR_VPS_IP:3001"

# After getting domain, configure route
echo ""
echo "4. After getting domain, run:"
echo "   cloudflared tunnel route dns event-api-tunnel api.yourdomain.com"
echo ""
echo "   Then your permanent URL will be: https://api.yourdomain.com"



