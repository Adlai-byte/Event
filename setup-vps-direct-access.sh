#!/bin/bash
# Setup VPS Direct Access (No Tunnel Needed)

echo "=== Setting up VPS Direct Access ==="

# 1. I-get ang VPS IP
echo "1. Getting VPS IP..."
VPS_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
echo "   Your VPS IP: $VPS_IP"

# 2. I-check kung ang server ay accessible
echo ""
echo "2. Testing server accessibility..."
curl -v http://localhost:3001/api/health 2>&1 | head -10

# 3. I-configure firewall (kung kailangan)
echo ""
echo "3. Configure firewall (if needed):"
echo "   sudo ufw allow 3001/tcp"
echo "   sudo ufw reload"

# 4. I-test from external
echo ""
echo "4. Test from external:"
echo "   curl http://$VPS_IP:3001/api/health"

# 5. I-update ang code
echo ""
echo "5. Update your code to use:"
echo "   http://$VPS_IP:3001"
echo ""
echo "   Or if you have domain:"
echo "   https://api.yourdomain.com"



