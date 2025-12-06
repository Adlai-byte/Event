# Where Should Images Be Uploaded?

## Answer: On Your VPS Server (Production) or Locally (Development)

### Current Setup

The images are saved **wherever your Node.js server is running**:

- **Local Development**: `C:\wamp64\www\FINALLYevent\Event\server\uploads\images`
- **VPS Production**: `/var/www/event-app/server/uploads/images` (or wherever you deploy)

### How It Works

The code uses `path.join(__dirname, 'uploads', 'images')` which means:
- `__dirname` = the directory where `server/index.js` is located
- Images are saved relative to the server directory

### For VPS Deployment

When you deploy to your VPS:

1. **Images will be saved on the VPS** at: `/var/www/event-app/server/uploads/images`
2. **The server serves them** via: `http://your-vps-ip:3001/uploads/images/filename.jpg`
3. **Nginx can also serve them** directly (faster) if configured

### Configuration Options

#### Option 1: Default (Current)
Images save to: `server/uploads/images` (relative to server directory)

#### Option 2: Environment Variable (New)
You can now set `UPLOADS_DIR` in your `.env` file:

```env
# For VPS - absolute path
UPLOADS_DIR=/var/www/event-app/server/uploads

# For local - absolute path
UPLOADS_DIR=C:\wamp64\www\FINALLYevent\Event\server\uploads
```

If `UPLOADS_DIR` is set, images will be saved to: `{UPLOADS_DIR}/images`
If not set, it defaults to: `server/uploads/images`

### Important Notes

1. **VPS**: Images MUST be on the VPS server, not your local machine
2. **Permissions**: Make sure the uploads directory is writable:
   ```bash
   chmod -R 775 /var/www/event-app/server/uploads
   chown -R www-data:www-data /var/www/event-app/server/uploads
   ```
3. **Backup**: Consider backing up the uploads directory regularly
4. **Storage**: Monitor disk space on your VPS

### Recommended VPS Setup

```bash
# On your VPS
cd /var/www/event-app/server
mkdir -p uploads/images
chmod -R 775 uploads
chown -R www-data:www-data uploads
```

### Testing

After deployment, test by:
1. Uploading an image
2. Checking if file exists: `ls -la /var/www/event-app/server/uploads/images/`
3. Accessing via URL: `http://your-vps-ip:3001/uploads/images/profile_55_xxx.jpeg`

