@echo off
title My Calendar App - Restart Server
echo.
echo ========================================
echo    Restarting My Calendar App Server
echo ========================================
echo.

cd /d "%~dp0"

echo 🔄 Stopping any existing servers on port 3001...
netstat -ano | findstr :3001 > nul
if %errorlevel%==0 (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :3001') do taskkill /pid %%i /f > nul 2>&1
    echo ✅ Stopped existing server
) else (
    echo ℹ️  No server running on port 3001
)

echo.
echo 🚀 Starting the React development server...
echo.
echo After the server starts, go to: http://localhost:3001
echo.

node server/simple-server.cjs

echo.
echo ========================================
echo Server stopped. Press any key to exit.
echo ========================================
pause > nul
