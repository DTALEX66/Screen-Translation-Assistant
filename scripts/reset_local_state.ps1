$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$paths = @(
  (Join-Path $root "diagnostics"),
  (Join-Path $root ".screenlingua-dev"),
  (Join-Path $root "debug_screenshots")
)
foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item -Recurse -Force $p
    Write-Host "Removed $p"
  }
}
Write-Host "Local state reset complete."
