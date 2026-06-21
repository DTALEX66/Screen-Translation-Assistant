# ScreenLingua V4 Windows dev packaging placeholder
# Run from scaffold/ directory.

$ErrorActionPreference = "Stop"

Write-Host "ScreenLingua Windows dev package check" -ForegroundColor Cyan
python .\scripts\v4_self_check.py

Write-Host "If Node/Rust/Tauri dependencies are installed, run:" -ForegroundColor Yellow
Write-Host "  npm install"
Write-Host "  npm run tauri dev"
Write-Host "  npm run tauri build"

Write-Host "V4 packaging script completed basic checks." -ForegroundColor Green
