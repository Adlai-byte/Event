# How to Uninstall and Reinstall MySQL on VPS

## ⚠️ WARNING

**This will DELETE all your databases and data!** Make sure to backup first if you have important data.

## Step 1: Backup Existing Data (If Needed)

```bash
# Backup all databases
mysqldump -u root -p --all-databases > mysql_backup_$(date +%Y%m%d).sql

# Or backup specific database
mysqldump -u root -p event_db > event_db_backup_$(date +%Y%m%d).sql
```

## Step 2: Stop MySQL Service

```bash
# Stop MySQL
systemctl stop mysql

# Disable auto-start (optional)
systemctl disable mysql
```

## Step 3: Uninstall MySQL

```bash
# Remove MySQL packages
apt remove --purge mysql-server mysql-client mysql-common mysql-server-core-* mysql-client-core-*

# Remove MySQL data directory
rm -rf /var/lib/mysql

# Remove MySQL log files
rm -rf /var/log/mysql

# Remove MySQL configuration
rm -rf /etc/mysql

# Clean up any remaining packages
apt autoremove
apt autoclean
```

## Step 4: Remove MySQL User (Optional)

```bash
# Remove MySQL user and group
deluser mysql
delgroup mysql 2>/dev/null || true
```

## Step 5: Reinstall MySQL

```bash
# Update package list
apt update

# Install MySQL server
apt install -y mysql-server

# Start MySQL
systemctl start mysql
systemctl enable mysql

# Check status
systemctl status mysql
```

## Step 6: Secure MySQL Installation

```bash
# Run MySQL secure installation
mysql_secure_installation
```

**During setup, you'll be asked:**
- Set root password? **Yes** - Enter a strong password
- Remove anonymous users? **Yes**
- Disallow root login remotely? **Yes** (for security)
- Remove test database? **Yes**
- Reload privilege tables? **Yes**

## Step 7: Create Database and User

```bash
mysql -u root -p
```

Enter the root password you set, then run:

```sql
-- Create database
CREATE DATABASE event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';

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

**Important:** Replace `YourSecurePassword123!` with a strong password.

## Step 8: Import Database Schema

```bash
# If you have schema.sql file
cd /var/www/event-app
mysql -u event_user -p event_db < database/schema.sql

# Or if you have event.sql
mysql -u event_user -p event_db < database/event.sql
```

## Step 9: Update .env File

```bash
cd /var/www/event-app
nano .env
```

Make sure it has:

```env
DB_HOST=localhost
DB_USER=event_user
DB_PASSWORD=YourSecurePassword123!
DB_NAME=event_db
DB_PORT=3306
```

## Step 10: Test Database Connection

```bash
cd /var/www/event-app/server
node test-db-connection.js
```

Should show: `✅ Database connection successful!`

## Step 11: Restart Application

```bash
pm2 restart event-api
pm2 logs event-api
```

## Complete Reinstall Script

Run this to do everything at once:

```bash
# ⚠️ WARNING: This deletes all MySQL data!

# Stop MySQL
systemctl stop mysql

# Uninstall
apt remove --purge mysql-server mysql-client mysql-common mysql-server-core-* mysql-client-core-* -y
rm -rf /var/lib/mysql /var/log/mysql /etc/mysql
apt autoremove -y
apt autoclean

# Reinstall
apt update
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Secure installation (interactive)
mysql_secure_installation

# Then create database and user (see Step 7)
```

## Alternative: Reset MySQL Root Password (Easier)

If you just need to reset the root password without full reinstall:

```bash
# Stop MySQL
systemctl stop mysql

# Start MySQL in safe mode
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

## Verify Installation

```bash
# Check MySQL version
mysql --version

# Check MySQL status
systemctl status mysql

# Test connection
mysql -u root -p

# Test event_user connection
mysql -u event_user -p event_db
```

---

**Quick Reinstall:**
```bash
systemctl stop mysql && \
apt remove --purge mysql-server mysql-client mysql-common -y && \
rm -rf /var/lib/mysql /var/log/mysql /etc/mysql && \
apt update && apt install -y mysql-server && \
systemctl start mysql && \
mysql_secure_installation
```

