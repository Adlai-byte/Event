#!/bin/bash

# Script to check and restart Cloudflare tunnel and get the current URL

echo "🔍 Checking Cloudflare tunnel status..."

# Check if tunnel is running
if pm2 list | grep -q "cloudflare-tunnel"; then
    echo "✅ Cloudflare tunnel is running in PM2"
    pm2 list | grep cloudflare-tunnel
else
    echo "❌ Cloudflare tunnel is NOT running"
    echo "📝 Starting Cloudflare tunnel..."
    pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001
    pm2 save
    echo "⏳ Waiting 5 seconds for tunnel to initialize..."
    sleep 5
fi

# Check if Node.js server is running
if pm2 list | grep -q "event-server"; then
    echo "✅ Node.js server is running"
    pm2 list | grep event-server
else
    echo "❌ Node.js server is NOT running"
    echo "📝 Please start the server first:"
    echo "   cd /path/to/server && pm2 start index.js --name event-server"
fi

# Get the current tunnel URL
echo ""
echo "🔗 Getting current Cloudflare tunnel URL..."
echo "⏳ Checking logs (this may take a moment)..."
sleep 2

TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -i "trycloudflare.com" | tail -1 | grep -oP 'https://[^\s]+trycloudflare\.com' | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Could not find tunnel URL in logs. Checking recent logs..."
    pm2 logs cloudflare-tunnel --lines 50 --nostream | grep -i "trycloudflare\|tunnel\|url" | tail -10
    echo ""
    echo "💡 Try running: pm2 logs cloudflare-tunnel --lines 100"
else
    echo ""
    echo "✅ Current Cloudflare Tunnel URL:"
    echo "   $TUNNEL_URL"
    echo ""
    echo "📋 Copy this URL and update it in:"
    echo "   1. Vercel Environment Variables (EXPO_PUBLIC_API_BASE_URL)"
    echo "   2. Your local .env file (if using)"
    echo ""
fi

# Test the tunnel
if [ ! -z "$TUNNEL_URL" ]; then
    echo "🧪 Testing tunnel connection..."
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$TUNNEL_URL/api/health" | grep -q "200\|404\|500"; then
        echo "✅ Tunnel is responding (server may need to be running)"
    else
        echo "⚠️  Tunnel URL exists but server may not be responding"
        echo "   Make sure your Node.js server is running on port 3001"
    fi
fi

echo ""
echo "📊 PM2 Status:"
pm2 status

