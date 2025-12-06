# Check Your Database User (event_user)

## Quick Check Commands

### Check if event_user Exists

```bash
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='event_user';"
```

If the user exists, you'll see output. If not, you'll see an empty result.

### Check User with All Details

```bash
mysql -u root -p << EOF
SELECT 
    user, 
    host, 
    account_locked,
    password_expired,
    password_last_changed
FROM mysql.user 
WHERE user='event_user';
EOF
```

### Check User Privileges

```bash
mysql -u root -p -e "SHOW GRANTS FOR 'event_user'@'localhost';"
```

This shows what permissions the user has.

### Test if User Can Connect

```bash
# Try to connect as event_user
mysql -u event_user -p event_db
```

Enter the password when prompted. If it connects, the user exists and the password is correct.

## Complete Check Script

Run this to check everything about your database user:

```bash
mysql -u root -p << 'EOF'
SELECT '=== Checking event_user ===' AS '';

-- Check if user exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ User EXISTS'
        ELSE '❌ User DOES NOT EXIST'
    END AS status,
    user,
    host
FROM mysql.user 
WHERE user='event_user';

-- Show user details
SELECT 
    user,
    host,
    account_locked,
    password_expired
FROM mysql.user 
WHERE user='event_user';

-- Show user privileges
SELECT '=== User Privileges ===' AS '';
SHOW GRANTS FOR 'event_user'@'localhost';

-- Check if user has access to event_db
SELECT '=== Database Access ===' AS '';
SELECT * FROM mysql.db WHERE user='event_user' AND db='event_db';
EOF
```

## Quick One-Liner

```bash
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='event_user';"
```

## If User Doesn't Exist - Create It

If the user doesn't exist, create it:

```bash
mysql -u root -p << EOF
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify it was created
SELECT user, host FROM mysql.user WHERE user='event_user';
EOF
```

## Check What's in Your .env File

```bash
cd /var/www/event-app/server
cat .env | grep DB_
```

This shows what database user your app is trying to use.

## Verify User Matches .env Configuration

```bash
# Check .env
DB_USER=$(grep DB_USER /var/www/event-app/server/.env | cut -d '=' -f2)
echo "App is using user: $DB_USER"

# Check if that user exists in MySQL
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='$DB_USER';"
```

---

**Simplest Check:**
```bash
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='event_user';"
```

