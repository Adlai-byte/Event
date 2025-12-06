# PowerShell script to verify server/index.js before upload
# Run this before uploading to VPS

Write-Host "🔍 Verifying server/index.js before upload..." -ForegroundColor Cyan
Write-Host ""

$filePath = "server\index.js"

# Check if file exists
if (-not (Test-Path $filePath)) {
    Write-Host "❌ File not found: $filePath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ File exists: $filePath" -ForegroundColor Green

# Check for allowedOrigins (should NOT exist)
$allowedOrigins = Select-String -Path $filePath -Pattern "allowedOrigins" -CaseSensitive
if ($allowedOrigins) {
    Write-Host "❌ ERROR: Found 'allowedOrigins' reference!" -ForegroundColor Red
    $allowedOrigins | ForEach-Object { Write-Host "   Line $($_.LineNumber): $($_.Line)" -ForegroundColor Yellow }
    exit 1
}
Write-Host "✅ No 'allowedOrigins' reference found" -ForegroundColor Green

# Check for CORS config
$corsConfig = Select-String -Path $filePath -Pattern "app\.use\(cors\(" -Context 0,10
if (-not $corsConfig) {
    Write-Host "❌ ERROR: CORS configuration not found!" -ForegroundColor Red
    exit 1
}

# Check if origin: true is present
$originTrue = Select-String -Path $filePath -Pattern "origin:\s*true" -CaseSensitive
if (-not $originTrue) {
    Write-Host "❌ ERROR: 'origin: true' not found in CORS config!" -ForegroundColor Red
    Write-Host "   Current CORS config:" -ForegroundColor Yellow
    $corsConfig | ForEach-Object { Write-Host "   $($_.Line)" -ForegroundColor Yellow }
    exit 1
}
Write-Host "✅ CORS config uses 'origin: true'" -ForegroundColor Green

# Check for origin function (should NOT exist)
$originFunction = Select-String -Path $filePath -Pattern "origin:\s*function" -CaseSensitive
if ($originFunction) {
    Write-Host "⚠️  WARNING: Found 'origin: function' - this might cause issues" -ForegroundColor Yellow
    $originFunction | ForEach-Object { Write-Host "   Line $($_.LineNumber): $($_.Line)" -ForegroundColor Yellow }
}

# Count CORS configs (should be only 1)
$corsCount = (Select-String -Path $filePath -Pattern "app\.use\(cors\(").Count
if ($corsCount -gt 1) {
    Write-Host "⚠️  WARNING: Found $corsCount CORS configurations (should be 1)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Only 1 CORS configuration found" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 CORS Configuration:" -ForegroundColor Cyan
$corsConfig | Select-Object -First 1 | ForEach-Object {
    $lines = Get-Content $filePath | Select-Object -Skip ($_.LineNumber - 1) -First 10
    $lines | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "✅ File is ready to upload!" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Upload command:" -ForegroundColor Cyan
Write-Host "   scp server\index.js root@72.62.64.59:/var/www/event-app/server/index.js" -ForegroundColor White

