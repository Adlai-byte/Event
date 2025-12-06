# How to Test Image Access on VPS

## ❌ Wrong Way (What You Did)

Don't paste URLs directly into the terminal - bash will try to execute them as commands!

```bash
# ❌ This won't work - bash tries to execute the URL
http://72.62.64.59:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
```

## ✅ Correct Ways to Test

### Method 1: Using `curl` (Recommended)

```bash
# Test if image is accessible
curl -I http://72.62.64.59:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg

# Download and view image info
curl -v http://72.62.64.59:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg

# Test the diagnostic endpoint
curl http://72.62.64.59:3001/api/test-image/profile_55_1764663693073_d1eqnbl.jpeg

# Test the fallback endpoint
curl -I http://72.62.64.59:3001/api/image/profile_55_1764663693073_d1eqnbl.jpeg
```

### Method 2: Using `wget`

```bash
# Test if file exists and get headers
wget --spider http://72.62.64.59:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg

# Download the image
wget http://72.62.64.59:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
```

### Method 3: Check File Exists Locally

```bash
# Navigate to uploads directory
cd /var/www/event-app/server/uploads/images

# List files
ls -lah profile_55_*

# Check specific file
ls -lah profile_55_1764663693073_d1eqnbl.jpeg

# View file info
file profile_55_1764663693073_d1eqnbl.jpeg
```

### Method 4: Test from Browser

Open in your web browser:
```
http://72.62.64.59:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
```

Or test the diagnostic endpoint:
```
http://72.62.64.59:3001/api/test-image/profile_55_1764663693073_d1eqnbl.jpeg
```

## Quick Diagnostic Commands

Run these on your VPS to check everything:

```bash
# 1. Check if file exists
cd /var/www/event-app/server/uploads/images
ls -lah profile_55_1764663693073_d1eqnbl.jpeg

# 2. Check file permissions
stat profile_55_1764663693073_d1eqnbl.jpeg

# 3. Check if server is running
pm2 status
# Or
ps aux | grep node

# 4. Check server logs
pm2 logs event-api --lines 50

# 5. Test the diagnostic endpoint
curl http://localhost:3001/api/test-image/profile_55_1764663693073_d1eqnbl.jpeg

# 6. Test image access from localhost
curl -I http://localhost:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
```

## Expected Results

### ✅ If Working Correctly:

```bash
$ curl -I http://localhost:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 29696
...
```

### ❌ If Not Working:

```bash
$ curl -I http://localhost:3001/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
HTTP/1.1 404 Not Found
```

## Troubleshooting Steps

1. **Check if file exists:**
   ```bash
   ls -lah /var/www/event-app/server/uploads/images/profile_55_*
   ```

2. **Check server is running:**
   ```bash
   pm2 status
   ```

3. **Check server logs for errors:**
   ```bash
   pm2 logs event-api
   ```

4. **Restart server:**
   ```bash
   pm2 restart event-api
   ```

5. **Test diagnostic endpoint:**
   ```bash
   curl http://localhost:3001/api/test-image/profile_55_1764663693073_d1eqnbl.jpeg
   ```

6. **Check file permissions:**
   ```bash
   chmod 644 /var/www/event-app/server/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
   chown www-data:www-data /var/www/event-app/server/uploads/images/profile_55_1764663693073_d1eqnbl.jpeg
   ```

## Common Issues

### Issue 1: 404 Not Found
- File doesn't exist at that path
- Check: `ls -lah /var/www/event-app/server/uploads/images/`

### Issue 2: 403 Forbidden
- Permission issue
- Fix: `chmod 644 /var/www/event-app/server/uploads/images/*.jpeg`

### Issue 3: Connection Refused
- Server not running
- Fix: `pm2 start event-api` or restart server

### Issue 4: Wrong Path
- Static file serving looking in wrong directory
- Check diagnostic endpoint response

