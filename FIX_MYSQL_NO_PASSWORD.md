# Fix: MySQL Root Has No Password / Access Denied

## Problems Found

1. ❌ `DB_PASSWORD=` is **EMPTY**
2. ❌ `DB_NAME=event_user` is **WRONG** - should be `event_db`
3. ❌ Using `root` user - should use `event_user`

## Solution: Set MySQL Root Password OR Create event_user

### Option 1: Set Root Password (Quick Fix)

```bash
# Connect to MySQL (if no password, just press Enter)
mysql -u root

# Set password for root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'MyRootPassword123!';
FLUSH PRIVILEGES;
EXIT;
```

Then update `.env`:
```env
DB_USER=root
DB_PASSWORD=MyRootPassword123!
DB_NAME=event_db
```

### Option 2: Create event_user (Recommended - More Secure)

```bash
# Connect to MySQL (if no password, just press Enter)
mysql -u root
```

Then run:

```sql
-- Create database (note: event_db, NOT event_user!)
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with password
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'MySecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user='event_user';

EXIT;
```

Then update `.env`:
```env
DB_USER=event_user
DB_PASSWORD=MySecurePassword123!
DB_NAME=event_db
```

## Fix Your .env File

Your current `.env` has:
- ❌ `DB_NAME=event_user` → Should be `event_db`
- ❌ `DB_PASSWORD=` → Needs a password
- ❌ `DB_USER=root` → Should be `event_user` (if using Option 2)

### Correct .env File

```bash
cd /var/www/event-app
nano .env
```

**Replace with this:**

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

**Important:**
- Replace `MySecurePassword123!` with the password you set
- `DB_NAME=event_db` (NOT event_user!)
- `DB_USER=event_user` (if using Option 2) or `root` (if using Option 1)
- `DB_PASSWORD` must have a value!

## Complete Fix Script

Run this to set everything up:

```bash
# Set your desired password
DB_PASSWORD='MySecurePassword123!'

# Connect to MySQL and create database/user
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Update .env file
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

## If MySQL Root Requires Password

If you get "Access denied" when trying `mysql -u root`:

```bash
# Stop MySQL
systemctl stop mysql

# Start in safe mode (no password required)
mysqld_safe --skip-grant-tables &

# Connect
mysql -u root

# Set password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewRootPassword123!';
FLUSH PRIVILEGES;
EXIT;

# Restart MySQL normally
pkill mysqld
systemctl start mysql

# Now connect with password
mysql -u root -p
# Enter: NewRootPassword123!
```

## Verify Fix

```bash
# Check .env
cat /var/www/event-app/.env | grep DB_

# Should show:
# DB_HOST=localhost
# DB_USER=event_user
# DB_PASSWORD=MySecurePassword123!  (NOT empty!)
# DB_NAME=event_db  (NOT event_user!)
# DB_PORT=3306

# Test connection
cd /var/www/event-app/server
node test-db-connection.js
# Should show: ✅ Database connection successful!
```

---

**Your Issues:**
1. ❌ `DB_PASSWORD=` empty → Set a password
2. ❌ `DB_NAME=event_user` → Change to `event_db`
3. ❌ Using `root` → Create `event_user` instead

