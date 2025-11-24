# Script to restart the server by killing existing process on port 3001
Write-Host "Checking for existing server on port 3001..." -ForegroundColor Yellow

$port = 3001

# Find process using port 3001
try {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    
    if ($connection) {
        $processId = $connection.OwningProcess | Select-Object -First 1
        if ($processId) {
            Write-Host "Found existing server process (PID: $processId). Stopping it..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            Write-Host "Process stopped." -ForegroundColor Green
        }
    } else {
        Write-Host "No existing server found on port 3001." -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking for existing process: $_" -ForegroundColor Red
}

Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host ""
npm run server
