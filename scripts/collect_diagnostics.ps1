$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$out = Join-Path $root "diagnostics"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$info = [ordered]@{
  timestamp = (Get-Date).ToString("o")
  os = (Get-CimInstance Win32_OperatingSystem).Caption
  version = (Get-CimInstance Win32_OperatingSystem).Version
  node = (node --version 2>$null)
  npm = (npm --version 2>$null)
  rustc = (rustc --version 2>$null)
  cargo = (cargo --version 2>$null)
  python = (python --version 2>$null)
}
$info | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $out "environment.json")
Write-Host "Diagnostics saved to $out"
