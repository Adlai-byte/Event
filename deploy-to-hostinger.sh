#!/bin/bash

# Hostinger VPS Deployment Script
# Run this script on your VPS after transferring files
# Usage: sudo ./deploy-to-hostinger.sh

set -e  # Exit on error

echo "🚀 Starting Hostinger VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/event-app"
SERVER_DIR="$APP_DIR/server"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Install Node.js first:${NC}"
    echo "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "apt install -y nodejs"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 is not installed. Installing...${NC}"
    npm install -g pm2
fi

# Check if server directory exists
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}❌ Server directory not found: $SERVER_DIR${NC}"
    echo -e "${YELLOW}Please make sure you've transferred your files to $APP_DIR${NC}"
    exit 1
fi

# Step 1: Create directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p $SERVER_DIR/uploads/images
mkdir -p $SERVER_DIR/uploads/documents

# Step 2: Set permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 775 $SERVER_DIR/uploads

# Step 3: Check if .env exists
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > $SERVER_DIR/.env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=event_db
DB_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production
API_BASE_URL=https://yourdomain.com

# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_live_your_key_here
PAYMONGO_PUBLIC_KEY=pk_live_your_key_here
PAYMONGO_MODE=live
EOF
    echo -e "${RED}⚠️  IMPORTANT: Edit $SERVER_DIR/.env with your actual credentials!${NC}"
    echo "Press Enter to continue after editing .env file..."
    read
fi

# Step 4: Install dependencies
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
cd $SERVER_DIR

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in $SERVER_DIR${NC}"
    echo -e "${YELLOW}Creating package.json...${NC}"
    cat > package.json << 'EOF'
{
  "name": "event-server",
  "version": "1.0.0",
  "description": "Event App Backend Server",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js",
    "test:db": "node test-db-connection.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "mysql2": "^3.11.0",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "pdfkit": "^0.17.2"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "private": true
}
EOF
    echo -e "${GREEN}✅ Created package.json${NC}"
else
    echo -e "${GREEN}✅ Found package.json${NC}"
fi

echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --production

# Step 5: Start with PM2
echo -e "${YELLOW}🔄 Starting application with PM2...${NC}"
pm2 delete event-api 2>/dev/null || true
pm2 start index.js --name event-api
pm2 save

# Step 6: Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if [ -f "$SERVER_DIR/test-db-connection.js" ]; then
    cd $SERVER_DIR
    node test-db-connection.js || echo -e "${YELLOW}⚠️  Database test failed. Check your .env file.${NC}"
fi

# Step 7: Show status
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}Application Status:${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
pm2 status
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo "  View logs:        pm2 logs event-api"
echo "  Monitor:          pm2 monit"
echo "  Restart:          pm2 restart event-api"
echo "  Stop:             pm2 stop event-api"
echo "  Check status:     pm2 status"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "  1. Configure Nginx reverse proxy (see HOSTINGER_VPS_DEPLOYMENT.md)"
echo "  2. Setup SSL certificate with Let's Encrypt"
echo "  3. Update your React Native app with production API URL"
echo ""

