@echo off
echo Checking for existing server on port 3001...

REM Find process ID using port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        echo Found existing server process (PID: %%a). Stopping it...
        taskkill /PID %%a /F >nul 2>&1
        if errorlevel 1 (
            echo Failed to stop process %%a
        ) else (
            echo Process stopped successfully.
        )
    )
)

timeout /t 1 /nobreak >nul 2>&1
echo.
echo Starting server...
echo.
npm run server
