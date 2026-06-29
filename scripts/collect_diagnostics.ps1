$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$out = Join-Path $root "diagnostics"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Get-OptionalCommandOutput {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $Command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $Command) {
    return $null
  }

  try {
    return (& $Command.Source @Arguments 2>$null | Out-String).Trim()
  } catch {
    return $null
  }
}

$info = [ordered]@{
  timestamp = (Get-Date).ToString("o")
  os = (Get-CimInstance Win32_OperatingSystem).Caption
  version = (Get-CimInstance Win32_OperatingSystem).Version
  node = Get-OptionalCommandOutput "node" @("--version")
  npm = Get-OptionalCommandOutput "npm" @("--version")
  pnpm = Get-OptionalCommandOutput "pnpm" @("--version")
  rustc = Get-OptionalCommandOutput "rustc" @("--version")
  cargo = Get-OptionalCommandOutput "cargo" @("--version")
  python = Get-OptionalCommandOutput "python" @("--version")
}
$info | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $out "environment.json")
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "scripts\local_services_status.ps1") -Json |
  Set-Content -Encoding UTF8 (Join-Path $out "services.json")
Write-Host "Diagnostics saved to $out"
