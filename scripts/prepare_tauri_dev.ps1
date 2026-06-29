Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start_sidecar_if_needed.ps1
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start_vite_if_needed.ps1
exit $LASTEXITCODE
