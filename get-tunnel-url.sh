#!/bin/bash

# Quick script to get the current Cloudflare tunnel URL

echo "🔍 Getting Cloudflare tunnel URL..."
echo ""

# Check if tunnel is running
if ! pm2 list | grep -q "cloudflare-tunnel"; then
    echo "❌ Cloudflare tunnel is NOT running!"
    echo "📝 Start it with: pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001"
    exit 1
fi

# Get the URL from logs
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -oP 'https://[^\s]+trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Could not find tunnel URL. Showing recent logs:"
    pm2 logs cloudflare-tunnel --lines 50 --nostream | grep -i "tunnel\|url\|trycloudflare" | tail -10
    exit 1
fi

echo "✅ Current Cloudflare Tunnel URL:"
echo ""
echo "   $TUNNEL_URL"
echo ""
echo "📋 Copy this URL and:"
echo "   1. Update EXPO_PUBLIC_API_BASE_URL in Vercel Environment Variables"
echo "   2. Redeploy your Vercel deployment"
echo ""

