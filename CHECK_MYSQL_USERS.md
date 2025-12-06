# How to Check MySQL Users on VPS

## Quick Commands

### Method 1: List All Users

```bash
mysql -u root -p -e "SELECT user, host FROM mysql.user;"
```

This will show all MySQL users and their allowed hosts.

### Method 2: Connect to MySQL and Query

```bash
mysql -u root -p
```

Then run:
```sql
SELECT user, host FROM mysql.user;
```

### Method 3: Check Specific User

```bash
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='event_user';"
```

## Detailed User Information

### Show All Users with More Details

```bash
mysql -u root -p << EOF
SELECT 
    user, 
    host, 
    account_locked,
    password_expired,
    password_last_changed
FROM mysql.user;
EOF
```

### Check User Privileges

```bash
mysql -u root -p -e "SHOW GRANTS FOR 'event_user'@'localhost';"
```

This shows what permissions the user has.

### Check if User Exists

```bash
mysql -u root -p -e "SELECT COUNT(*) as user_exists FROM mysql.user WHERE user='event_user' AND host='localhost';"
```

Returns `1` if user exists, `0` if not.

## Common Commands

### List All Databases

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

### Check Current User

```bash
mysql -u root -p -e "SELECT USER(), CURRENT_USER();"
```

### Show All Users and Their Databases

```bash
mysql -u root -p << EOF
SELECT 
    u.user, 
    u.host, 
    db.db
FROM mysql.user u
LEFT JOIN mysql.db db ON u.user = db.user
ORDER BY u.user, u.host;
EOF
```

## Quick Check Script

Run this to check everything:

```bash
echo "=== MySQL Users ==="
mysql -u root -p -e "SELECT user, host FROM mysql.user;" 2>/dev/null

echo ""
echo "=== Checking event_user ==="
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='event_user';" 2>/dev/null

echo ""
echo "=== Databases ==="
mysql -u root -p -e "SHOW DATABASES;" 2>/dev/null

echo ""
echo "=== event_db exists? ==="
mysql -u root -p -e "SHOW DATABASES LIKE 'event_db';" 2>/dev/null
```

## If You Don't Know Root Password

### Try Without Password (if sudo works)

```bash
sudo mysql -e "SELECT user, host FROM mysql.user;"
```

### Or Reset Root Password

```bash
# Stop MySQL
sudo systemctl stop mysql

# Start in safe mode
sudo mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# Reset password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# Restart MySQL
sudo systemctl restart mysql
```

## Check User Can Connect

### Test User Connection

```bash
# Test if event_user can connect
mysql -u event_user -p event_db

# If it works, you'll see MySQL prompt
# Type: EXIT; to leave
```

### Check User Privileges on Specific Database

```bash
mysql -u root -p << EOF
SHOW GRANTS FOR 'event_user'@'localhost';
SELECT * FROM mysql.db WHERE user='event_user' AND db='event_db';
EOF
```

## Useful MySQL User Management Commands

### Create User (if doesn't exist)

```sql
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'password';
```

### Change User Password

```sql
ALTER USER 'event_user'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### Grant Privileges

```sql
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
```

### Remove User

```sql
DROP USER 'event_user'@'localhost';
FLUSH PRIVILEGES;
```

### Show All User Privileges

```sql
SELECT * FROM information_schema.user_privileges WHERE grantee LIKE '%event_user%';
```

## One-Liner to Check Everything

```bash
mysql -u root -p << 'EOF'
SELECT '=== All Users ===' AS '';
SELECT user, host FROM mysql.user;

SELECT '=== event_user Details ===' AS '';
SELECT user, host, account_locked, password_expired FROM mysql.user WHERE user='event_user';

SELECT '=== event_user Privileges ===' AS '';
SHOW GRANTS FOR 'event_user'@'localhost';

SELECT '=== Databases ===' AS '';
SHOW DATABASES;
EOF
```

---

**Quickest Check:**
```bash
mysql -u root -p -e "SELECT user, host FROM mysql.user;"
```

