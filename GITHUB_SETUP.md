# GitHub Setup Instructions

## Quick Setup (Automated)

Run the PowerShell script:

```powershell
.\push-to-github.ps1
```

## Manual Setup

If the script doesn't work, follow these steps:

### 1. Install Git (if not installed)

Download and install Git from: https://git-scm.com/download/win

### 2. Initialize Git Repository

```bash
git init
```

### 3. Add Remote Repository

```bash
git remote add origin https://github.com/TheSilent351/eventTest.git
```

Or if remote already exists:

```bash
git remote set-url origin https://github.com/TheSilent351/eventTest.git
```

### 4. Add All Files

```bash
git add .
```

### 5. Commit Changes

```bash
git commit -m "Initial commit: Event management app with booking, messaging, and payment features"
```

### 6. Push to GitHub

```bash
git branch -M main
git push -u origin main
```

## Authentication

If you're prompted for credentials:

1. **Use Personal Access Token** (recommended):
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Use your GitHub username and the token as password

2. **Or use GitHub CLI**:
   ```bash
   gh auth login
   ```

## Important Notes

⚠️ **Before pushing, make sure:**

- ✅ `.env` files are in `.gitignore` (already configured)
- ✅ Sensitive files like `google-services.json` are excluded
- ✅ Database credentials are not in the code
- ✅ API keys are in environment variables, not hardcoded

## Files Excluded from Git

The following files/folders are automatically excluded:
- `node_modules/`
- `.env` files
- `*.keystore` files
- `google-services.json`
- Build directories
- Log files

## Troubleshooting

### "Repository not found"
- Make sure the repository exists at: https://github.com/TheSilent351/eventTest
- Check your GitHub authentication

### "Permission denied"
- Use Personal Access Token instead of password
- Make sure you have write access to the repository

### "Failed to push"
- Try: `git push -u origin main --force` (⚠️ only if you're sure)
- Check your internet connection
- Verify GitHub credentials

## After Pushing

1. Verify files on GitHub: https://github.com/TheSilent351/eventTest
2. Add a README.md (optional)
3. Set up GitHub Actions for CI/CD (optional)
4. Add collaborators if needed

## Next Steps

After pushing to GitHub, you can:
- Deploy backend using Railway/Render (they can connect to GitHub)
- Set up automated deployments
- Share the repository with team members
- Create releases and tags

