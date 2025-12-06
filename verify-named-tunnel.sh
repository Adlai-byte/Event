#!/bin/bash
# Verify Named Tunnel Setup

echo "=== Verifying Named Tunnel Setup ==="

# 1. I-check ang config file
echo "1. Checking config file..."
cat ~/.cloudflared/config.yml

# 2. I-check kung may credentials file
echo ""
echo "2. Checking credentials file..."
ls -la /root/.cloudflared/event-api-tunnel.json

# 3. I-check ang tunnel info
echo ""
echo "3. Checking tunnel info..."
cloudflared tunnel info event-api-tunnel

# 4. I-check ang PM2 process
echo ""
echo "4. Checking PM2 process..."
pm2 list | grep cloudflare

# 5. I-check ang tunnel logs
echo ""
echo "5. Checking tunnel logs..."
pm2 logs cloudflare-tunnel --lines 20 --nostream 2>/dev/null | grep -i "tunnel\|url\|quick"

