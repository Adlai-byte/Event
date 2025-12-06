#!/bin/bash

# Script to verify server and tunnel are working correctly

echo "🔍 Verifying Server and Tunnel Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js server is running
echo "1️⃣ Checking Node.js server..."
if pm2 list | grep -q "event-server\|event-api"; then
    SERVER_NAME=$(pm2 list | grep -E "event-server|event-api" | awk '{print $2}')
    SERVER_STATUS=$(pm2 list | grep -E "event-server|event-api" | awk '{print $10}')
    if [ "$SERVER_STATUS" = "online" ]; then
        echo -e "${GREEN}✅ Server is running: $SERVER_NAME${NC}"
    else
        echo -e "${RED}❌ Server is not online: $SERVER_NAME (Status: $SERVER_STATUS)${NC}"
        echo "   Try: pm2 restart $SERVER_NAME"
    fi
else
    echo -e "${RED}❌ Server is NOT running in PM2${NC}"
    echo "   Start it with: pm2 start server/index.js --name event-server"
    exit 1
fi

# Check if Cloudflare tunnel is running
echo ""
echo "2️⃣ Checking Cloudflare tunnel..."
if pm2 list | grep -q "cloudflare-tunnel"; then
    TUNNEL_STATUS=$(pm2 list | grep cloudflare-tunnel | awk '{print $10}')
    if [ "$TUNNEL_STATUS" = "online" ]; then
        echo -e "${GREEN}✅ Tunnel is running${NC}"
    else
        echo -e "${RED}❌ Tunnel is not online (Status: $TUNNEL_STATUS)${NC}"
        echo "   Try: pm2 restart cloudflare-tunnel"
    fi
else
    echo -e "${RED}❌ Tunnel is NOT running${NC}"
    echo "   Start it with: pm2 start cloudflared --name cloudflare-tunnel -- tunnel --url http://localhost:3001"
    exit 1
fi

# Get tunnel URL
echo ""
echo "3️⃣ Getting Cloudflare tunnel URL..."
TUNNEL_URL=$(pm2 logs cloudflare-tunnel --lines 200 --nostream 2>/dev/null | grep -oP 'https://[^\s]+trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}❌ Could not find tunnel URL${NC}"
    echo "   Check logs: pm2 logs cloudflare-tunnel --lines 50"
else
    echo -e "${GREEN}✅ Tunnel URL: $TUNNEL_URL${NC}"
fi

# Test local server
echo ""
echo "4️⃣ Testing local server (localhost:3001)..."
LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3001/api/health 2>/dev/null)

if [ "$LOCAL_TEST" = "200" ]; then
    echo -e "${GREEN}✅ Local server is responding (HTTP $LOCAL_TEST)${NC}"
else
    echo -e "${RED}❌ Local server is NOT responding (HTTP $LOCAL_TEST)${NC}"
    echo "   Server might not be running or has an error"
    echo "   Check logs: pm2 logs $SERVER_NAME --lines 50"
fi

# Test tunnel URL (if available)
if [ ! -z "$TUNNEL_URL" ]; then
    echo ""
    echo "5️⃣ Testing tunnel URL..."
    TUNNEL_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$TUNNEL_URL/api/health" 2>/dev/null)
    
    if [ "$TUNNEL_TEST" = "200" ]; then
        echo -e "${GREEN}✅ Tunnel is working (HTTP $TUNNEL_TEST)${NC}"
    elif [ "$TUNNEL_TEST" = "000" ]; then
        echo -e "${RED}❌ Tunnel URL is not reachable (Connection failed)${NC}"
        echo "   The tunnel might not be properly forwarding requests"
    else
        echo -e "${YELLOW}⚠️  Tunnel responded with HTTP $TUNNEL_TEST${NC}"
        echo "   This might indicate a server error, but tunnel is working"
    fi
fi

# Check CORS headers
if [ ! -z "$TUNNEL_URL" ]; then
    echo ""
    echo "6️⃣ Checking CORS headers..."
    CORS_HEADER=$(curl -s -I -X OPTIONS "$TUNNEL_URL/api/health" -H "Origin: https://e-vent-jade.vercel.app" 2>/dev/null | grep -i "access-control-allow-origin")
    
    if [ ! -z "$CORS_HEADER" ]; then
        echo -e "${GREEN}✅ CORS headers are present${NC}"
        echo "   $CORS_HEADER"
    else
        echo -e "${YELLOW}⚠️  CORS headers not found in OPTIONS response${NC}"
        echo "   This might be normal if server doesn't handle OPTIONS explicitly"
    fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -z "$TUNNEL_URL" ]; then
    echo ""
    echo "Current Tunnel URL:"
    echo -e "${GREEN}$TUNNEL_URL${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update EXPO_PUBLIC_API_BASE_URL in Vercel to: $TUNNEL_URL"
    echo "   2. Redeploy your Vercel application"
    echo "   3. Test the application again"
fi

echo ""
echo "📊 PM2 Status:"
pm2 list | grep -E "event-server|event-api|cloudflare-tunnel"

