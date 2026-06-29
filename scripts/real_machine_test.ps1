param(
  [string]$ImageDir = "",
  [string]$Image = "",
  [int]$MaxSamples = 3,
  [switch]$LaunchTauri
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "[1/5] Desktop environment"
pnpm env:check

Write-Host "[2/5] Local services"
pnpm tauri:prepare

Write-Host "[3/5] Frontend build"
pnpm build:compat

Write-Host "[4/5] Local OCR/translation flow"
$FlowArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\test_local_flow.ps1")
if ($ImageDir) {
  $FlowArgs += @("-ImageDir", $ImageDir)
}
if ($Image) {
  $FlowArgs += @("-Image", $Image)
}
if ($MaxSamples -gt 0) {
  $FlowArgs += @("-MaxSamples", [string]$MaxSamples)
}
powershell @FlowArgs

Write-Host "[5/5] Tauri desktop"
if ($LaunchTauri) {
  Write-Host "Launching Tauri dev. Close the desktop window to return."
  pnpm tauri:dev
} else {
  Write-Host "Ready. Launch desktop manually with: pnpm tauri:dev"
}
