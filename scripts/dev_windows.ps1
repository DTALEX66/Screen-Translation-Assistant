Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "[1/4] Check compatible Node.js"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_vite_compat.ps1 -CheckOnly

Write-Host "[2/4] Smoke check"
python scripts\smoke_check.py

Write-Host "[3/4] Install frontend dependencies"
pnpm install

Write-Host "[4/4] Start Vite dev server"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare_tauri_dev.ps1
