# Fix: Database Access Denied Error

## Error Found

```
database connection failed: Access denied for user 'root'@'localhost'
```

This means the database credentials in your `.env` file don't match your MySQL setup.

## Solution: Fix Database Credentials

### Step 1: Check Current .env File

```bash
cd /var/www/event-app/server

# View current .env file
cat .env | grep DB_
```

### Step 2: Check MySQL Root Access

First, test if you can access MySQL as root:

```bash
# Try to connect as root
mysql -u root -p
```

If this works, you can create the database user. If it doesn't, you may need to reset MySQL root password.

### Step 3: Create Database and User

If you can access MySQL as root:

```bash
mysql -u root -p
```

Then run these SQL commands (replace `your_secure_password` with a strong password):

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS 'event_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user='event_user';

-- Exit
EXIT;
```

### Step 4: Update .env File

```bash
cd /var/www/event-app/server
nano .env
```

Update the database section with the correct credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=your_secure_password
DB_NAME=event_db
DB_PORT=3306
```

**Important:** Replace `your_secure_password` with the actual password you set in Step 3.

### Step 5: Test Database Connection

```bash
cd /var/www/event-app/server

# Test connection
node test-db-connection.js
```

Should now show: `✅ Database connection successful!`

## Alternative: Use Root User (Not Recommended for Production)

If you want to use root user temporarily:

```bash
# Find root password or reset it
mysql -u root -p
# Enter your MySQL root password

# If you don't know root password, reset it:
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

Then update `.env`:
```env
DB_USER=root
DB_PASSWORD=new_password
```

## Quick Fix Script

Run this to set up database properly:

```bash
# Set a password (change 'MySecurePassword123!' to your desired password)
DB_PASSWORD='MySecurePassword123!'

# Connect to MySQL and create database/user
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
```

## Verify MySQL is Running

```bash
# Check MySQL status
systemctl status mysql

# If not running, start it
systemctl start mysql
systemctl enable mysql
```

## Common Issues

### Issue 1: MySQL Root Password Unknown

If you don't know the MySQL root password:

```bash
# Stop MySQL
systemctl stop mysql

# Start MySQL in safe mode (skip password)
mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# Reset password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# Restart MySQL normally
systemctl restart mysql
```

### Issue 2: User Already Exists with Different Password

```sql
-- Drop existing user
DROP USER IF EXISTS 'event_user'@'localhost';

-- Create new user
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'new_password';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
```

### Issue 3: Database Doesn't Exist

```sql
CREATE DATABASE event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## After Fixing: Test and Start

```bash
cd /var/www/event-app/server

# Test database connection
node test-db-connection.js

# If successful, start application
pm2 delete event-api
pm2 start index.js --name event-api
pm2 save
pm2 status
```

## Security Note

**For production:** Always use a dedicated database user (like `event_user`) instead of `root`. The root user should only be used for administration.

---

**Quick Check:**
1. Can you access MySQL as root? `mysql -u root -p`
2. Does the database exist? `SHOW DATABASES;`
3. Does the user exist? `SELECT user FROM mysql.user WHERE user='event_user';`
4. Are credentials correct in `.env`? `cat .env | grep DB_`

