# How to Access MySQL in Dokploy

Quick guide to fix "command not found" and access your MySQL database.

---

## ❌ The Problem

You tried: `sudo MySQL -u root -p`
Error: `sudo: MySQL: command not found`

**Issues:**
1. MySQL command is **case-sensitive** - use `mysql` (lowercase)
2. MySQL client might not be installed on the host
3. In Dokploy, MySQL runs in a **Docker container**, not directly on the host

---

## ✅ Solution 1: Access MySQL via Dokploy Terminal (Easiest)

### Step 1: Open Terminal in Dokploy Panel

1. **Go to Dokploy panel:** `http://your-vps-ip:3000`
2. **Click "Databases"** in left sidebar
3. **Click on your database** (`event_db`)
4. **Click "Open Terminal"** button (in Deploy Settings section)

This opens a terminal **inside the MySQL container** where MySQL is already installed!

### Step 2: Access MySQL

In the terminal, run:

```bash
mysql -u event_user -p event_db
```

Enter your password when prompted (use the password from "Internal Credentials" section).

### Step 3: Import SQL File

**Option A: If SQL file is already in container**
```bash
mysql -u event_user -p event_db < /path/to/schema.sql
```

**Option B: Copy SQL into container first**
```bash
# In Dokploy terminal, create file
cat > /tmp/schema.sql << 'EOF'
# Paste your SQL content here
EOF

# Then import
mysql -u event_user -p event_db < /tmp/schema.sql
```

---

## ✅ Solution 2: Install MySQL Client on Host

If you want to access MySQL from the host (not recommended for Dokploy):

### Step 1: Install MySQL Client

```bash
# Update package list
apt update

# Install MySQL client
apt install -y mysql-client

# OR install full MySQL (includes client)
apt install -y mysql-server
```

### Step 2: Access MySQL (Correct Command)

```bash
# Use lowercase 'mysql'
mysql -u root -p

# OR connect to Dokploy database
mysql -h localhost -P 3306 -u event_user -p event_db
```

**Note:** In Dokploy, you should use the container's internal host, not `localhost`.

---

## ✅ Solution 3: Access via Docker Exec (Recommended)

Since MySQL runs in a Docker container in Dokploy:

### Step 1: Find Container Name

```bash
# List running containers
docker ps

# Look for MySQL container (usually named like: eventapi-eventdb-xxxxx)
```

### Step 2: Access MySQL via Docker

```bash
# Replace 'eventapi-eventdb-xxxxx' with your actual container name
docker exec -it eventapi-eventdb-xxxxx mysql -u event_user -p event_db
```

### Step 3: Import SQL File

**Option A: Copy file to container first**
```bash
# Copy SQL file to container
docker cp /path/to/schema.sql eventapi-eventdb-xxxxx:/tmp/schema.sql

# Import
docker exec -i eventapi-eventdb-xxxxx mysql -u event_user -p event_db < /path/to/schema.sql
```

**Option B: Import directly**
```bash
# Import from host file
docker exec -i eventapi-eventdb-xxxxx mysql -u event_user -p event_db < /path/to/schema.sql
```

---

## ✅ Solution 4: Use Dokploy Web Interface

The easiest method - no terminal needed!

### Step 1: Upload SQL via Backups Tab

1. **In Dokploy panel**, go to your database
2. **Click "Backups"** tab
3. **Look for "Import" or "Restore"** option
4. **Upload** your `schema.sql` file
5. **Click "Import"**

### Step 2: Or Use Advanced Tab

1. **Click "Advanced"** tab
2. **Look for "Execute SQL"** or "Import SQL"
3. **Upload or paste** your SQL content
4. **Click "Execute"**

---

## 🔧 Quick Fix Commands

### Check if MySQL is installed on host:
```bash
which mysql
mysql --version
```

### Find Docker container:
```bash
docker ps | grep mysql
docker ps | grep eventdb
```

### Access MySQL container:
```bash
# Get container name first
CONTAINER=$(docker ps | grep mysql | awk '{print $1}')

# Access MySQL
docker exec -it $CONTAINER mysql -u event_user -p event_db
```

---

## 📋 Step-by-Step: Import SQL File

### Method 1: Via Dokploy Terminal (Recommended)

1. **Open Dokploy panel**
2. **Databases** → Click `event_db`
3. **Click "Open Terminal"** button
4. **Upload SQL file to Dokploy** (via file manager or SCP)
5. **In terminal, run:**
   ```bash
   mysql -u event_user -p event_db < /path/to/schema.sql
   ```

### Method 2: Via Docker Exec

1. **SSH into your VPS:**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Find MySQL container:**
   ```bash
   docker ps | grep mysql
   ```

3. **Copy SQL file to VPS:**
   ```bash
   # From your local machine
   scp server/database/schema.sql root@your-vps-ip:/tmp/schema.sql
   ```

4. **Import SQL:**
   ```bash
   # On VPS, get container name
   CONTAINER_NAME=$(docker ps | grep mysql | awk '{print $NF}')
   
   # Copy file to container
   docker cp /tmp/schema.sql $CONTAINER_NAME:/tmp/schema.sql
   
   # Import
   docker exec -i $CONTAINER_NAME mysql -u event_user -p event_db < /tmp/schema.sql
   ```

---

## 🐛 Troubleshooting

### "mysql: command not found"

**Solution:** Use Dokploy terminal (it has MySQL pre-installed) or install MySQL client:
```bash
apt install -y mysql-client
```

### "Access denied for user"

**Solution:** 
- Use credentials from Dokploy "Internal Credentials" section
- User: `event_user`
- Password: (click eye icon to reveal)
- Database: `event_db`

### "Can't connect to MySQL server"

**Solution:**
- Make sure database is running (click "Deploy" in Dokploy)
- Use container name as host, not `localhost`
- Check "Logs" tab for errors

### "No such file or directory" (SQL file)

**Solution:**
- Upload SQL file to VPS first via SCP
- Or use Dokploy file manager
- Or paste SQL content directly in terminal

---

## 💡 Recommended Approach

**For Dokploy users, the easiest method is:**

1. ✅ **Use Dokploy Terminal** (click "Open Terminal" in database page)
2. ✅ **Or use Backups/Advanced tab** in Dokploy web interface
3. ❌ **Avoid** installing MySQL on host (not needed with Dokploy)

---

## 📝 Quick Reference

**Correct command:**
```bash
mysql -u event_user -p event_db
```

**Wrong command:**
```bash
MySQL -u root -p  # ❌ Wrong case
sudo MySQL -u root -p  # ❌ Wrong case + not needed
```

**Access via Docker:**
```bash
docker exec -it container-name mysql -u event_user -p event_db
```

**Import SQL:**
```bash
mysql -u event_user -p event_db < schema.sql
```

---

## ✅ Next Steps

1. **Try Dokploy Terminal first** (easiest)
2. **If that doesn't work**, use Docker exec method
3. **Or use web interface** (Backups/Advanced tab)

Your SQL file: `server/database/schema.sql`

Need help with a specific step? Let me know!

