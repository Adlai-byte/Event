#!/bin/bash

# Script to restart the server on VPS

echo "🔍 Checking PM2 processes..."
echo ""

# List all PM2 processes
pm2 list

echo ""
echo "🔄 Restarting server..."

# Try to find the server process (could be event-api or event-server)
if pm2 list | grep -q "event-api"; then
    echo "✅ Found event-api process"
    pm2 restart event-api
    echo "✅ Server restarted!"
elif pm2 list | grep -q "event-server"; then
    echo "✅ Found event-server process"
    pm2 restart event-server
    echo "✅ Server restarted!"
else
    echo "❌ No server process found!"
    echo ""
    echo "Available processes:"
    pm2 list
    echo ""
    echo "If server is not running, start it with:"
    echo "  cd /path/to/server"
    echo "  pm2 start index.js --name event-api"
    exit 1
fi

echo ""
echo "📊 Current PM2 Status:"
pm2 status

echo ""
echo "📋 Recent logs:"
pm2 logs event-api --lines 10 --nostream

