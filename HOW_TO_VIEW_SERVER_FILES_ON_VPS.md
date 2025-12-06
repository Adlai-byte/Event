# How to View/Show Server Files on VPS

## Method 1: SSH Command Line (Recommended)

### Connect to Your VPS

```bash
# Connect via SSH
ssh root@72.62.64.59
# Or if you have a different user
ssh username@72.62.64.59
```

### Navigate to Server Directory

```bash
# Go to server directory
cd /var/www/event-app/server

# List all files
ls -la

# Show directory structure
tree
# Or if tree is not installed:
find . -type f | head -20
```

### View File Contents

```bash
# View a file (e.g., index.js)
cat index.js

# View with line numbers
cat -n index.js

# View first 50 lines
head -50 index.js

# View last 50 lines
tail -50 index.js

# View with pagination (press 'q' to quit)
less index.js
```

### Check Uploads Directory

```bash
# Navigate to uploads
cd /var/www/event-app/server/uploads/images

# List all images
ls -lah

# Count files
ls -1 | wc -l

# Show file sizes
du -sh *
```

## Method 2: Windows PowerShell (SCP/SFTP)

### View Files Remotely

```powershell
# Connect via SSH and run commands
ssh root@72.62.64.59 "ls -la /var/www/event-app/server"

# View a specific file
ssh root@72.62.64.59 "cat /var/www/event-app/server/index.js"

# Download a file to view locally
scp root@72.62.64.59:/var/www/event-app/server/index.js ./
```

### Download Entire Directory

```powershell
# Download server directory to local machine
scp -r root@72.62.64.59:/var/www/event-app/server ./server-backup
```

## Method 3: FileZilla (SFTP Client) - GUI Method

### Setup FileZilla

1. **Download FileZilla**: https://filezilla-project.org/
2. **Connect to VPS**:
   - Host: `sftp://72.62.64.59`
   - Username: `root`
   - Password: Your VPS password
   - Port: `22`

3. **Navigate to Server Directory**:
   - Go to: `/var/www/event-app/server`
   - You'll see all files in a GUI interface
   - Double-click files to view/edit

### View Files
- Right-click file → "View/Edit"
- Files open in your default editor
- Changes can be saved directly

## Method 4: VS Code Remote SSH Extension

### Install Extension

1. Open VS Code
2. Install "Remote - SSH" extension
3. Press `F1` → Type "Remote-SSH: Connect to Host"
4. Enter: `root@72.62.64.59`

### Access Server Files

1. After connecting, click "Open Folder"
2. Navigate to: `/var/www/event-app/server`
3. Browse files like on your local machine
4. Edit files directly in VS Code

## Method 5: Web-Based File Manager

### Install FileBrowser (Simple Web UI)

On your VPS:

```bash
# Download FileBrowser
curl -fsSL https://raw.githubusercontent.com/filebrowser/get/master/get.sh | bash

# Run FileBrowser
filebrowser -a 0.0.0.0 -p 8080 -r /var/www/event-app/server
```

Then access: `http://72.62.64.59:8080`

### Or Install TinyFileManager

```bash
cd /var/www/event-app/server
wget https://github.com/prasathmani/tinyfilemanager/archive/refs/heads/master.zip
unzip master.zip
# Configure and access via browser
```

## Method 6: Quick Commands Reference

### Essential Commands

```bash
# Check if server directory exists
ls -la /var/www/event-app/server

# View server files
cd /var/www/event-app/server && ls -la

# View uploads
ls -lah /var/www/event-app/server/uploads/images

# Find a specific file
find /var/www/event-app/server -name "index.js"

# View file permissions
stat /var/www/event-app/server/index.js

# View disk usage
du -sh /var/www/event-app/server

# Count files
find /var/www/event-app/server -type f | wc -l
```

### View Logs

```bash
# PM2 logs
pm2 logs event-api

# Server logs
tail -f /var/www/event-app/server/logs/*.log

# System logs
journalctl -u your-service-name
```

## Method 7: Hostinger Web Console

If you're using Hostinger VPS:

1. **Login to Hostinger Control Panel**
2. **Go to VPS Management**
3. **Click "Web Console"** or "Terminal"
4. **Access server directly** without SSH client

## Quick Check Commands

Run these to verify your server setup:

```bash
# Check server directory structure
cd /var/www/event-app/server
ls -la

# Should show:
# - index.js
# - package.json
# - db.js
# - uploads/
# - services/
# - database/

# Check uploads directory
ls -lah uploads/images/

# Check if server is running
pm2 status

# Check server logs
pm2 logs event-api --lines 50
```

## Troubleshooting

### "Permission Denied"
```bash
# Fix permissions
sudo chmod -R 755 /var/www/event-app/server
sudo chown -R www-data:www-data /var/www/event-app/server
```

### "Directory Not Found"
```bash
# Find where files actually are
find /var/www -name "index.js" -type f
find / -name "index.js" -type f 2>/dev/null
```

### "Cannot Connect via SSH"
- Check VPS is running
- Verify SSH is enabled
- Use Hostinger Web Console as backup
- Check firewall settings

## Recommended Setup

For daily use, I recommend:
1. **VS Code Remote SSH** - Best for editing files
2. **FileZilla** - Best for transferring files
3. **SSH Command Line** - Best for quick checks

Choose the method that works best for you!

