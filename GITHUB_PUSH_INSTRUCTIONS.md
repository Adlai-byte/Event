# How to Push Your Project to GitHub

## Step 1: Install Git

Git is not currently installed on your system. Install it:

1. **Download Git for Windows**: https://git-scm.com/download/win
2. **Run the installer** and follow the setup wizard
3. **Important**: During installation, make sure to select:
   - ✅ "Add Git to PATH" option
   - ✅ "Git from the command line and also from 3rd-party software"

4. **Restart your terminal/PowerShell** after installation

## Step 2: Verify Git Installation

Open a new PowerShell/Command Prompt and run:

```bash
git --version
```

You should see something like: `git version 2.x.x`

## Step 3: Push to GitHub

### Option A: Use the Automated Script

After installing Git, run:

```powershell
.\push-to-github.ps1
```

### Option B: Manual Commands

If the script doesn't work, run these commands one by one:

```bash
# 1. Initialize Git repository
git init

# 2. Add remote repository
git remote add origin https://github.com/TheSilent351/eventTest.git

# 3. Add all files
git add .

# 4. Commit changes
git commit -m "Initial commit: Event management app with booking, messaging, and payment features"

# 5. Set branch to main
git branch -M main

# 6. Push to GitHub
git push -u origin main
```

## Step 4: Authentication

When you run `git push`, you'll be prompted for credentials:

### Use Personal Access Token (Recommended)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: "Event App Push"
4. Select scope: ✅ **`repo`** (full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)

When prompted:
- **Username**: Your GitHub username (`TheSilent351`)
- **Password**: Paste the Personal Access Token (not your GitHub password)

## Alternative: Use GitHub Desktop

If you prefer a GUI:

1. Download **GitHub Desktop**: https://desktop.github.com/
2. Sign in with your GitHub account
3. Click **"File"** → **"Add Local Repository"**
4. Select your project folder: `C:\wamp64\www\Event`
5. Click **"Publish repository"**
6. Repository name: `eventTest`
7. Click **"Publish Repository"**

## Troubleshooting

### "Repository not found"
- Make sure the repository exists at: https://github.com/TheSilent351/eventTest
- If it doesn't exist, create it on GitHub first

### "Permission denied"
- Use Personal Access Token instead of password
- Make sure the token has `repo` scope

### "Failed to push some refs"
- If the repository already has files, use:
  ```bash
  git push -u origin main --force
  ```
  ⚠️ **Warning**: This will overwrite existing files on GitHub

### "Git is not recognized"
- Make sure Git is installed
- Restart your terminal after installation
- Check if Git is in PATH: `where git`

## What Gets Pushed?

✅ **Included:**
- All source code
- Configuration files
- Documentation

❌ **Excluded** (via .gitignore):
- `node_modules/`
- `.env` files
- `*.keystore` files
- `google-services.json`
- Build directories
- Log files

## After Pushing

1. ✅ Verify on GitHub: https://github.com/TheSilent351/eventTest
2. ✅ Check that sensitive files are NOT visible
3. ✅ Add a README.md if needed
4. ✅ Set repository to private if it contains sensitive code

## Quick Reference

```bash
# Check Git status
git status

# See what will be committed
git status --short

# Add specific file
git add filename

# Commit with message
git commit -m "Your message"

# Push to GitHub
git push -u origin main

# Check remote URL
git remote -v
```

---

**Need Help?** Check `GITHUB_SETUP.md` for more detailed instructions.

