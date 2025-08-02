#!/usr/bin/env pwsh
# Setup Script for My Calendar App - PowerShell Version

Write-Host "🚀 Setting up My Calendar App..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After installation, restart your terminal/PowerShell" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm detected: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

try {
    npm install
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Write-Host ""
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created! Please edit it with your configuration." -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit the .env file with your database and API credentials"
Write-Host "2. Set up a PostgreSQL database (local or cloud)"
Write-Host "3. Run 'npm run db:push' to set up the database schema"
Write-Host "4. Run 'npm run dev' to start the development server"
Write-Host "5. Open http://localhost:5000 in your browser"
Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "npm run dev      - Start development server"
Write-Host "npm run build    - Build for production"
Write-Host "npm run start    - Start production server"
Write-Host "npm run check    - Run TypeScript checks"
Write-Host "npm run db:push  - Update database schema"
Write-Host ""
Write-Host "📚 Documentation: Check out the README.md file for more details!" -ForegroundColor Magenta

Read-Host "Press Enter to continue"
