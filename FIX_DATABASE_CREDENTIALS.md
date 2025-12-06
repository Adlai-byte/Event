# Fix: Database Access Denied for 'root'@'localhost'

## Problem

The `.env` file is using `root` as the database user, but root access is denied.

## Solution: Update .env File to Use event_user

### Step 1: Check Current .env File

```bash
cd /var/www/event-app/server
cat .env | grep DB_
```

You'll probably see:
```
DB_USER=root
```

### Step 2: Create/Update Database User

If `event_user` doesn't exist, create it:

```bash
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

**Important:** Replace `YourSecurePassword123!` with a strong password.

### Step 3: Update .env File

```bash
cd /var/www/event-app/server
nano .env
```

Update the database section:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=YourSecurePassword123!
DB_NAME=event_db
DB_PORT=3306
```

**Important:** 
- Replace `YourSecurePassword123!` with the password you set in Step 2
- Make sure `DB_USER=event_user` (not `root`)

### Step 4: Test Database Connection

```bash
cd /var/www/event-app/server
node test-db-connection.js
```

Should now show: `✅ Database connection successful!`

### Step 5: Restart Application

```bash
pm2 restart event-api

# Check logs
pm2 logs event-api --lines 20
```

## Alternative: Use Root User (If You Know Password)

If you want to use root user instead:

```bash
# Test root connection
mysql -u root -p
# Enter your MySQL root password

# If it works, update .env:
cd /var/www/event-app/server
nano .env
```

Update:
```env
DB_USER=root
DB_PASSWORD=your_mysql_root_password
```

## Quick Fix Script

Run this to set up everything:

```bash
# Set your desired password
DB_PASSWORD='MySecurePassword123!'

# Create database and user
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Update .env file
cd /var/www/event-app/server
cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=event_db
DB_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production
API_BASE_URL=http://72.62.64.59:3001

# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_live_your_key_here
PAYMONGO_PUBLIC_KEY=pk_live_your_key_here
PAYMONGO_MODE=live
EOF

# Test connection
node test-db-connection.js

# Restart app
pm2 restart event-api
```

## Verify It Works

```bash
# Test database
node test-db-connection.js
# Should show: ✅ Database connection successful!

# Check PM2 status
pm2 status
# Should show: status: online

# Test API
curl http://localhost:3001/api/health
# Should return: {"ok":true}
```

---

**Action:** Update your `.env` file to use `event_user` instead of `root`, or create the `event_user` if it doesn't exist.

