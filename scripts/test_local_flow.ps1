param(
  [string[]]$Image = @(),
  [string[]]$ImageDir = @(),
  [string]$BaseUrl = "http://127.0.0.1:8765",
  [int]$Timeout = 120,
  [int]$MaxSamples = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$VenvPython = Join-Path $Root "sidecars\ocr_service\.venv\Scripts\python.exe"
$Script = Join-Path $Root "scripts\local_flow_test.py"

if (Test-Path -LiteralPath $VenvPython) {
  $Python = $VenvPython
} else {
  $SystemPython = Get-Command python -ErrorAction SilentlyContinue
  if (!$SystemPython) {
    throw "Python was not found in PATH and no sidecar .venv exists."
  }
  $Python = $SystemPython.Source
}

$ArgsList = @(
  $Script,
  "--base-url", $BaseUrl,
  "--timeout", $Timeout,
  "--max-samples", $MaxSamples
)

foreach ($Item in $Image) {
  $ArgsList += @("--image", $Item)
}

foreach ($Item in $ImageDir) {
  $ArgsList += @("--image-dir", $Item)
}

& $Python @ArgsList
