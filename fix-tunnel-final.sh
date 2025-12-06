#!/bin/bash
# Fix Tunnel - Get Permanent URL

echo "=== Fixing Tunnel ==="

# 1. I-check kung ang tunnel ay running
echo "1. Checking if tunnel is running..."
pm2 list | grep cloudflare

# 2. I-check ang tunnel logs
echo ""
echo "2. Checking tunnel logs..."
pm2 logs cloudflare-tunnel --lines 50 --nostream 2>/dev/null | tail -20

# 3. I-check ang tunnel info para sa permanent URL
echo ""
echo "3. Checking tunnel info..."
cloudflared tunnel info event-api-tunnel

# 4. I-test kung ang server ay running
echo ""
echo "4. Testing server on localhost..."
curl -v http://localhost:3001/api/health 2>&1 | head -10

# 5. I-restart ang tunnel kung hindi running
echo ""
echo "5. Restarting tunnel..."
pm2 restart cloudflare-tunnel
sleep 10

# 6. I-check ang logs para sa URL
echo ""
echo "6. Getting tunnel URL..."
pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "https://.*trycloudflare.com" | tail -1



