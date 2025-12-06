#!/bin/bash
# Use Existing Named Tunnel

echo "=== Using Existing Named Tunnel ==="

# 1. I-list ang existing tunnels
echo "1. Listing existing tunnels..."
cloudflared tunnel list

# 2. I-stop ang old tunnel
echo "2. Stopping old tunnel..."
pm2 stop cloudflare-tunnel
pm2 delete cloudflare-tunnel

# 3. I-create ng config file para sa existing tunnel
echo "3. Creating config file for existing tunnel..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: event-api-tunnel
credentials-file: /root/.cloudflared/event-api-tunnel.json

ingress:
  - service: http://localhost:3001
EOF

# 4. I-start ang named tunnel
echo "4. Starting named tunnel..."
pm2 start cloudflared --name cloudflare-tunnel -- tunnel run event-api-tunnel

# 5. I-wait para sa tunnel to start
echo "5. Waiting for tunnel to start..."
sleep 10

# 6. I-check ang logs para sa URL
echo "6. Checking tunnel logs for URL..."
pm2 logs cloudflare-tunnel --lines 50 | grep -i "trycloudflare.com\|https://"

echo ""
echo "=== Setup Complete ==="
echo "I-get ang URL: pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i 'https://.*trycloudflare.com' | tail -1"

