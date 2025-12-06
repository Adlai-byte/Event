# PowerShell script to configure Windows Firewall for Node.js server
# Run this as Administrator

Write-Host "🔧 Configuring Windows Firewall for Node.js server on port 3001..." -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Find Node.js executable
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $nodePath) {
    Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "   Make sure Node.js is installed and in your PATH" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Found Node.js at: $nodePath" -ForegroundColor Green

# Add firewall rule for Node.js (if it doesn't exist)
$ruleName = "Node.js Server - Port 3001"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Firewall rule already exists: $ruleName" -ForegroundColor Yellow
    Write-Host "   Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
}

# Create new firewall rule
try {
    New-NetFirewallRule -DisplayName $ruleName `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3001 `
        -Action Allow `
        -Profile Domain,Private,Public `
        -Description "Allow Node.js server on port 3001 for Expo development" | Out-Null
    
    Write-Host "✅ Firewall rule created successfully!" -ForegroundColor Green
    Write-Host "   Rule name: $ruleName" -ForegroundColor Cyan
    Write-Host "   Port: 3001" -ForegroundColor Cyan
    Write-Host "   Action: Allow" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create firewall rule: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "✅ Firewall configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure your server is running: npm run server" -ForegroundColor White
Write-Host "2. Restart your Android emulator" -ForegroundColor White
Write-Host "3. Try your Expo app again" -ForegroundColor White
Write-Host ""
pause














