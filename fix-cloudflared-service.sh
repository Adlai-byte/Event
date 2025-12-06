#!/bin/bash

# Fix Cloudflare Tunnel Service
# This script fixes the systemd service to use quick tunnel (--url) instead of config file

echo "=== Fixing Cloudflare Tunnel Service ==="

# Stop the service first
systemctl stop cloudflared

# Create correct service file
cat > /etc/systemd/system/cloudflared.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:3001
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable and start
systemctl enable cloudflared
systemctl start cloudflared

# Check status
echo ""
echo "=== Service Status ==="
systemctl status cloudflared --no-pager

echo ""
echo "=== To view logs, run: ==="
echo "journalctl -u cloudflared -f"

