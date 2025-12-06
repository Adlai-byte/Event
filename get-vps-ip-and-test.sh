#!/bin/bash
# Get VPS IP and Test

echo "=== Getting VPS IP ==="

# 1. I-get ang IPv4 IP
echo "1. Getting IPv4 IP..."
IPV4=$(curl -s -4 ifconfig.me || curl -s -4 ipinfo.io/ip)
echo "   IPv4: $IPV4"

# 2. I-get ang IPv6 IP
echo ""
echo "2. Getting IPv6 IP..."
IPV6=$(curl -s -6 ifconfig.me || curl -s -6 ipinfo.io/ip)
echo "   IPv6: $IPV6"

# 3. I-test ang server sa localhost
echo ""
echo "3. Testing server on localhost..."
curl -v http://localhost:3001/api/health 2>&1 | head -10

# 4. I-test sa IPv4 (kung meron)
if [ ! -z "$IPV4" ]; then
    echo ""
    echo "4. Testing server on IPv4..."
    curl -v http://$IPV4:3001/api/health 2>&1 | head -10
fi

# 5. I-test sa IPv6 (kung meron)
if [ ! -z "$IPV6" ]; then
    echo ""
    echo "5. Testing server on IPv6..."
    curl -v http://[$IPV6]:3001/api/health 2>&1 | head -10
fi

echo ""
echo "=== Next Steps ==="
echo "If IPv4 works, use: http://$IPV4:3001"
echo "If IPv6 works, use: http://[$IPV6]:3001"
echo ""
echo "BUT: Vercel needs HTTPS, so you still need:"
echo "1. Domain + SSL certificate, OR"
echo "2. Cloudflare Tunnel with domain route"



