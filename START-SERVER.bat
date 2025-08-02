@echo off
title My Calendar App - Development Server
echo.
echo ========================================
echo    My Calendar App - Starting Server
echo ========================================
echo.

cd /d "%~dp0"

echo 🚀 Starting the React development server...
echo.
echo This will open your calendar app in the browser.
echo After the server starts, go to: http://localhost:3000
echo.

node server/simple-server.cjs

echo.
echo ========================================
echo Server stopped. Press any key to exit.
echo ========================================
pause > nul
