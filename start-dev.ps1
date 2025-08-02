#!/usr/bin/env pwsh
Write-Host "🚀 Starting My Calendar App Development Server..." -ForegroundColor Green
Write-Host ""

$env:NODE_ENV = "development"
npm run dev
