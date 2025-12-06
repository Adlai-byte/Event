# Fix Database Credentials - Step by Step

## Problems Found

1. ❌ `DB_PASSWORD=` is **EMPTY** - MySQL root needs a password
2. ❌ `DB_USER=root` - Should use `event_user` instead
3. ❌ `.env` file might be in wrong location

## Quick Fix

### Step 1: Check MySQL Root Password

First, test if you can access MySQL as root:

```bash
# Try to connect as root
mysql -u root -p
```

**If it asks for password:**
- Enter the MySQL root password
- If you don't know it, you need to reset it (see below)

**If it connects without password:**
- Root has no password, which is insecure
- Set a password (see below)

### Step 2: Create event_user (Recommended)

```bash
mysql -u root -p
```

Enter root password, then:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with password
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY 'MySecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SELECT user, host FROM mysql.user WHERE user='event_user';

EXIT;
```

**Remember the password you set!** (e.g., `MySecurePassword123!`)

### Step 3: Fix .env File Location and Content

The `.env` file needs to be in `/var/www/event-app/.env` (parent directory, NOT in server/):

```bash
# Check current location
ls -la /var/www/event-app/.env
ls -la /var/www/event-app/server/.env

# Create/update .env in correct location
cd /var/www/event-app
nano .env
```

**Paste this (replace password with the one you set):**

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=MySecurePassword123!
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
```

**CRITICAL:**
- Replace `MySecurePassword123!` with the password you set in Step 2
- Make sure `DB_USER=event_user` (NOT root)
- Make sure `DB_PASSWORD` has a value (NOT empty)
- File must be at `/var/www/event-app/.env` (parent directory)

### Step 4: Test Database Connection

```bash
cd /var/www/event-app/server
node test-db-connection.js
```

**Should show:** `✅ Database connection successful!`

### Step 5: Restart Application

```bash
pm2 restart event-api
pm2 logs event-api --lines 20
```

## If You Don't Know MySQL Root Password

### Reset Root Password

```bash
# Stop MySQL
systemctl stop mysql

# Start MySQL in safe mode
mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# Reset password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewRootPassword123!';
FLUSH PRIVILEGES;
EXIT;

# Kill safe mode MySQL
pkill mysqld

# Start MySQL normally
systemctl start mysql

# Test
mysql -u root -p
# Enter: NewRootPassword123!
```

## Complete Fix Script

Run this (replace `YourPassword123!` with your desired password):

```bash
# Set password
DB_PASSWORD='YourPassword123!'

# Create database and user
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Create .env in correct location
cd /var/www/event-app
cat > .env << EOF
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=event_db
DB_PORT=3306

PORT=3001
NODE_ENV=production
API_BASE_URL=http://72.62.64.59:3001

PAYMONGO_SECRET_KEY=sk_live_your_key
PAYMONGO_PUBLIC_KEY=pk_live_your_key
PAYMONGO_MODE=live
EOF

# Test
cd server
node test-db-connection.js

# Restart
pm2 restart event-api
```

## Verify Everything

```bash
# Check .env file
cat /var/www/event-app/.env | grep DB_

# Should show:
# DB_HOST=localhost
# DB_USER=event_user
# DB_PASSWORD=YourPassword123!  (NOT empty!)
# DB_NAME=event_db

# Test connection
cd /var/www/event-app/server
node test-db-connection.js
```

---

**Your Issues:**
1. ❌ `DB_PASSWORD=` is empty → Set a password
2. ❌ `DB_USER=root` → Change to `event_user`
3. ❌ File location → Must be `/var/www/event-app/.env` (not in server/)

