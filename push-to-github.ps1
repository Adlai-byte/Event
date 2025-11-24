# PowerShell script to push project to GitHub
# Run this script: .\push-to-github.ps1

Write-Host "Pushing Event project to GitHub..." -ForegroundColor Cyan

# Check if git is installed
try {
    $gitVersion = git --version 2>&1
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Check if repository is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "Repository initialized" -ForegroundColor Green
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Green
}

# Check if remote exists
$remoteCheck = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/TheSilent351/eventTest.git
    Write-Host "Remote added" -ForegroundColor Green
} else {
    Write-Host "Remote already exists: $remoteCheck" -ForegroundColor Green
    # Update remote URL if needed
    git remote set-url origin https://github.com/TheSilent351/eventTest.git
    Write-Host "Remote URL updated" -ForegroundColor Green
}

# Add all files
Write-Host "Adding files to staging..." -ForegroundColor Yellow
git add .
Write-Host "Files added" -ForegroundColor Green

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
} else {
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m "Initial commit: Event management app with booking, messaging, and payment features"
    Write-Host "Changes committed" -ForegroundColor Green
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "You may be prompted for GitHub credentials" -ForegroundColor Yellow

# Try to push to main branch first, then master
$currentBranch = git branch --show-current 2>&1
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    git branch -M main
}

$pushResult = git push -u origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/TheSilent351/eventTest" -ForegroundColor Cyan
} else {
    Write-Host "Failed to push to 'main' branch, trying 'master'..." -ForegroundColor Yellow
    git branch -M master
    $pushResult2 = git push -u origin master 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "Repository: https://github.com/TheSilent351/eventTest" -ForegroundColor Cyan
    } else {
        Write-Host "Failed to push. Error: $pushResult2" -ForegroundColor Red
        Write-Host "You may need to:" -ForegroundColor Yellow
        Write-Host "   1. Authenticate with GitHub (use Personal Access Token)" -ForegroundColor Yellow
        Write-Host "   2. Or use: git push -u origin main --force (if repository already exists)" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Done! Your project is now on GitHub!" -ForegroundColor Green
