Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "[1/3] Smoke check"
python scripts\smoke_check.py

Write-Host "[2/3] Install frontend dependencies"
pnpm install

Write-Host "[3/3] Start Vite dev server"
pnpm dev
