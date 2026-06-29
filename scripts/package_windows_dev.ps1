$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "ScreenLingua Windows desktop package readiness" -ForegroundColor Cyan
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_desktop_env.ps1

Write-Host ""
Write-Host "Environment is ready. Useful commands:" -ForegroundColor Yellow
Write-Host "  pnpm install"
Write-Host "  pnpm env:install"
Write-Host "  pnpm tauri:dev"
Write-Host "  pnpm tauri:build"

Write-Host "Windows desktop package readiness check completed." -ForegroundColor Green
