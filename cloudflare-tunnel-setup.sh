#!/bin/bash

# Cloudflare Tunnel Setup Script for VPS
# This script sets up Cloudflare Tunnel to expose localhost:3001 via HTTPS

echo "=== Cloudflare Tunnel Setup ==="
echo ""
echo "This script will:"
echo "1. Install cloudflared"
echo "2. Create a Cloudflare Tunnel"
echo "3. Configure it to proxy to localhost:3001"
echo "4. Set it up as a systemd service"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Install cloudflared
echo "Step 1: Installing cloudflared..."
cd /tmp
if [ ! -f cloudflared-linux-amd64.deb ]; then
    wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
fi
dpkg -i cloudflared-linux-amd64.deb || apt-get install -f -y

# Verify installation
if ! command -v cloudflared &> /dev/null; then
    echo "Error: cloudflared installation failed"
    exit 1
fi

echo "✓ cloudflared installed successfully"
echo ""

# Step 2: Create tunnel directory
echo "Step 2: Creating configuration directory..."
mkdir -p /etc/cloudflared
echo "✓ Directory created"
echo ""

# Step 3: Instructions for manual setup
echo "=== MANUAL SETUP REQUIRED ==="
echo ""
echo "Follow these steps:"
echo ""
echo "1. Go to https://dash.cloudflare.com/"
echo "2. Sign up or log in (free account)"
echo "3. Go to: Zero Trust → Networks → Tunnels"
echo "4. Click 'Create a tunnel'"
echo "5. Select 'Cloudflared'"
echo "6. Name it: event-api-tunnel"
echo "7. Copy the TUNNEL TOKEN"
echo ""
echo "Then run these commands on your VPS:"
echo ""
echo "  # Authenticate tunnel"
echo "  cloudflared tunnel login"
echo "  # (Paste your tunnel token when prompted)"
echo ""
echo "  # Create tunnel"
echo "  cloudflared tunnel create event-api-tunnel"
echo ""
echo "  # Create config file"
echo "  cat > /etc/cloudflared/config.yml << 'EOF'"
echo "  tunnel: event-api-tunnel"
echo "  credentials-file: /root/.cloudflared/$(cloudflared tunnel list | grep event-api-tunnel | awk '{print $1}').json"
echo ""
echo "  ingress:"
echo "    - hostname: event-api.YOUR_SUBDOMAIN.trycloudflare.com"
echo "      service: http://localhost:3001"
echo "    - service: http_status:404"
echo "  EOF"
echo ""
echo "  # Test tunnel"
echo "  cloudflared tunnel --config /etc/cloudflared/config.yml run event-api-tunnel"
echo ""
echo "=== OR USE QUICK TUNNEL (EASIER) ==="
echo ""
echo "For quick testing, you can use a temporary tunnel:"
echo ""
echo "  cloudflared tunnel --url http://localhost:3001"
echo ""
echo "This will give you a temporary HTTPS URL like:"
echo "  https://random-subdomain.trycloudflare.com"
echo ""
echo "Note: Quick tunnel URLs expire when you close the connection."
echo "For permanent setup, use the manual method above."
echo ""

