# SSH Connection Troubleshooting for Hostinger VPS

## Problem: Connection Timeout

When you see:
```
ssh: connect to host 72.62.64.59 port 22: Connection timed out
```

## Quick Fix Steps

### Step 1: Check VPS Status (Most Common Fix)

1. **Log in to Hostinger Control Panel**
   - Go to https://hpanel.hostinger.com
   - Navigate to **VPS** section

2. **Verify VPS is Running**
   - Check if VPS status shows **"Running"** or **"Active"**
   - If it shows **"Stopped"** or **"Off"**, click **Start** or **Power On**
   - Wait 2-3 minutes for VPS to fully boot

3. **Check SSH Access Settings**
   - In VPS details, look for **SSH Access** or **Server Access**
   - Ensure SSH is **enabled**
   - Some VPS plans require manual SSH activation

### Step 2: Use Hostinger Web Console

If SSH is blocked, use Hostinger's web-based console:

1. **Access Web Console**
   - In Hostinger panel, find **Web Console**, **VNC**, or **Terminal** option
   - Click to open browser-based terminal

2. **Once Connected, Fix Firewall**
   ```bash
   # Check firewall status
   ufw status
   
   # If active, allow SSH
   sudo ufw allow 22/tcp
   sudo ufw reload
   
   # Or check iptables
   sudo iptables -L -n | grep 22
   sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
   sudo iptables-save
   ```

3. **Verify SSH Service**
   ```bash
   # Check if SSH is running
   sudo systemctl status ssh
   # or
   sudo systemctl status sshd
   
   # If not running, start it
   sudo systemctl start ssh
   sudo systemctl enable ssh
   ```

### Step 3: Verify Connection Details

**Check IP Address:**
- Confirm IP `72.62.64.59` is correct in Hostinger panel
- Try using domain name if configured: `ssh root@yourdomain.com`

**Check SSH Port:**
- Some Hostinger VPS use non-standard ports
- Check Hostinger panel for SSH port number
- Try: `ssh -p 2222 root@72.62.64.59`

**Check Username:**
- Some VPS use `root`, others use custom usernames
- Check Hostinger panel for correct username
- Try: `ssh your-username@72.62.64.59`

### Step 4: Test Network Connectivity

From your Windows PowerShell:

```powershell
# Test if server is reachable
Test-NetConnection -ComputerName 72.62.64.59 -Port 22

# Or use ping
ping 72.62.64.59
```

### Step 5: Try Alternative Connection Methods

**Using PuTTY (Windows):**
1. Download PuTTY: https://www.putty.org/
2. Enter IP: `72.62.64.59`
3. Port: `22` (or port from Hostinger panel)
4. Connection type: `SSH`
5. Click **Open**

**Using Git Bash:**
```bash
# With verbose output to see what's happening
ssh -v root@72.62.64.59

# Or with specific port
ssh -p 2222 -v root@72.62.64.59
```

### Step 6: Contact Hostinger Support

If nothing works, contact Hostinger:

1. **Live Chat** (fastest)
   - Available in Hostinger control panel
   - Ask: "SSH connection timeout to VPS IP 72.62.64.59"

2. **What to Ask:**
   - Verify VPS is running and accessible
   - Enable SSH access if disabled
   - Check firewall rules on their end
   - Provide correct SSH port and credentials
   - Check if IP address is correct

## Common Hostinger VPS SSH Issues

### Issue 1: VPS Not Activated
**Solution:** Start VPS from Hostinger control panel

### Issue 2: SSH Disabled by Default
**Solution:** Enable SSH in VPS settings or contact support

### Issue 3: Firewall Blocking Port 22
**Solution:** Access via web console and configure firewall

### Issue 4: Wrong SSH Port
**Solution:** Check Hostinger panel for actual SSH port

### Issue 5: Root Login Disabled
**Solution:** Use provided username or enable root login

## Alternative: File Transfer Without SSH

If SSH is completely unavailable:

### Option 1: Hostinger File Manager
1. Use File Manager in Hostinger control panel
2. Upload files directly via web interface
3. Limited to file operations only

### Option 2: FTP/SFTP
1. Check Hostinger panel for FTP credentials
2. Use FileZilla or WinSCP
3. Connect via FTP/SFTP protocol

### Option 3: Git Deployment
If you have Git access:
1. Push code to GitHub/GitLab
2. Use Hostinger's Git deployment feature
3. Or use web console to clone repository

## Verification Checklist

Before trying SSH again, verify:

- [ ] VPS is **Running** in Hostinger panel
- [ ] SSH is **enabled** in VPS settings  
- [ ] Firewall allows port 22 (checked via web console)
- [ ] SSH service is running (checked via web console)
- [ ] Using correct **IP address** from Hostinger
- [ ] Using correct **SSH port** (check panel)
- [ ] Using correct **username** (root or custom)
- [ ] Network test shows port 22 is reachable

## Once SSH Works

After successfully connecting:

1. **Secure your server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Setup firewall properly
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Continue with deployment:**
   - Follow the main deployment guide
   - Run the deployment script
   - Configure your application

---

**Still Having Issues?** Contact Hostinger support with:
- Your VPS IP: `72.62.64.59`
- Error message: "Connection timed out on port 22"
- Steps you've already tried

