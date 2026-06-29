param(
  [int]$Port = 5173
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Existing = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($Existing) {
  $Pids = ($Existing | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
  Write-Host "Vite dev server already listening on 127.0.0.1:$Port (pid: $Pids). Reusing it."
  exit 0
}

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_vite_compat.ps1 -Mode dev
exit $LASTEXITCODE
