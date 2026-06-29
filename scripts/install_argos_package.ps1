param(
  [string]$From = "en",
  [string]$To = "zh"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$VenvPython = Join-Path $Root "sidecars\ocr_service\.venv\Scripts\python.exe"

if (!(Test-Path $VenvPython)) {
  throw "Sidecar virtual environment was not found. Run pnpm sidecar first."
}

& $VenvPython (Join-Path $Root "scripts\install_argos_package.py") --from $From --to $To
