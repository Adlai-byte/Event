# Quick script to add firewall rule for port 3001
# Run as Administrator

$ruleName = "Expo Development Server - Port 3001"

# Remove existing rule if it exists
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

# Create new rule
New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3001 `
    -Action Allow `
    -Profile Domain,Private,Public `
    -Description "Allow Expo development server on port 3001 for Android emulator access"

Write-Host "✅ Firewall rule created: $ruleName" -ForegroundColor Green
Write-Host "   Port 3001 is now allowed for inbound connections" -ForegroundColor Cyan




