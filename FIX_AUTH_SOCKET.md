# Fix: MySQL Using auth_socket (No Password)

## Problem

MySQL skipped setting root password because it's using `auth_socket` authentication. This means:
- ✅ You can connect as `mysql -u root` (no password needed)
- ❌ But Node.js apps **CANNOT** use auth_socket - they need password authentication

## Solution: Switch to Password Authentication

### Option 1: Set Password for Root User (Quick Fix)

```bash
# Connect to MySQL (no password needed with auth_socket)
mysql -u root

# Switch root to password authentication
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'MyStrongPassword123!';
FLUSH PRIVILEGES;

# Verify
SELECT user, host, plugin FROM mysql.user WHERE user='root';

EXIT;
```

Then update `.env`:
```env
DB_USER=root
DB_PASSWORD=MyStrongPassword123!
DB_NAME=event_db
```

### Option 2: Create event_user (Recommended - More Secure)

```bash
# Connect to MySQL (no password needed)
mysql -u root

# Create database
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user with password authentication
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'MyStrongPassword123!';

# Grant privileges
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;

# Verify
SELECT user, host, plugin FROM mysql.user WHERE user='event_user';
SHOW DATABASES;

EXIT;
```

Then update `.env`:
```env
DB_USER=event_user
DB_PASSWORD=MyStrongPassword123!
DB_NAME=event_db
```

## Fix Your .env File

```bash
cd /var/www/event-app
nano .env
```

**Use this (replace password with what you set):**

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=MyStrongPassword123!
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

**Important:**
- `DB_PASSWORD` must have a value (the password you set)
- `DB_NAME=event_db` (NOT event_user!)
- `DB_USER=event_user` (if using Option 2) or `root` (if using Option 1)

## Complete Fix Script

Run this to set everything up:

```bash
# Set your desired password
DB_PASSWORD='MyStrongPassword123!'

# Connect and create database/user
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Update .env
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

# Test connection
cd server
node test-db-connection.js

# Restart app
pm2 restart event-api
```

## Test Connection

```bash
# Test with password
mysql -u event_user -p event_db
# Enter password when prompted

# Test from Node.js
cd /var/www/event-app/server
node test-db-connection.js
# Should show: ✅ Database connection successful!
```

## Why This Happened

MySQL 8.0+ on Ubuntu/Debian uses `auth_socket` plugin by default for root user. This allows:
- System root user to connect without password
- But Node.js apps need password authentication

**Solution:** Create a user with password authentication (event_user) or switch root to password authentication.

---

**Action:** Connect to MySQL and create `event_user` with a password, then update your `.env` file.

