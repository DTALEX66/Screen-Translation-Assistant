param(
  [switch]$DryRun,
  [switch]$Yes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-CommandExists {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-WingetCommand {
  if (Test-CommandExists "winget") {
    return "winget"
  }

  $Candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe"
  )

  foreach ($Candidate in $Candidates) {
    if ($Candidate -and (Test-Path $Candidate)) {
      return $Candidate
    }
  }

  return $null
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string[]]$Command
  )

  Write-Host ""
  Write-Host $Title -ForegroundColor Cyan
  Write-Host ("  {0}" -f ($Command -join " "))

  if ($DryRun) {
    return
  }

  & $Command[0] $Command[1..($Command.Length - 1)]
  if ($LASTEXITCODE -ne 0) {
    throw "$Title failed with exit code $LASTEXITCODE"
  }
}

$Winget = Get-WingetCommand

if ((-not $DryRun) -and (-not $Winget)) {
  Write-Host "winget was not found. Run pnpm env:winget:check, install App Installer, then rerun this script." -ForegroundColor Red
  exit 1
}

Write-Host "This script installs/updates desktop build prerequisites:" -ForegroundColor Yellow
Write-Host "  - Node.js LTS"
Write-Host "  - Rustup / Rust stable toolchain"
Write-Host "  - Visual Studio 2022 Build Tools with C++ workload"

if ($DryRun) {
  Write-Host ""
  Write-Host "DryRun mode: commands will be printed but not executed." -ForegroundColor Yellow
  if (-not $Winget) {
    Write-Host "winget is not currently available; actual install requires winget/App Installer." -ForegroundColor Yellow
  }
} elseif (-not $Yes) {
  Write-Host ""
  $Answer = Read-Host "Continue? Type YES to install"
  if ($Answer -ne "YES") {
    Write-Host "Cancelled."
    exit 0
  }
}

$WingetArgs = @("--source", "winget", "--accept-source-agreements", "--accept-package-agreements")

$NodeCommand = @(
  $(if ($Winget) { $Winget } else { "winget" }),
  "install",
  "--id",
  "OpenJS.NodeJS.LTS",
  "--exact",
  "--silent"
) + $WingetArgs

$RustCommand = @(
  $(if ($Winget) { $Winget } else { "winget" }),
  "install",
  "--id",
  "Rustlang.Rustup",
  "--exact",
  "--silent"
) + $WingetArgs

$VsBuildToolsCommand = @(
  $(if ($Winget) { $Winget } else { "winget" }),
  "install",
  "--id",
  "Microsoft.VisualStudio.2022.BuildTools",
  "--exact",
  "--silent",
  "--override",
  "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
) + $WingetArgs

Invoke-Step "Install or update Node.js LTS" $NodeCommand
Invoke-Step "Install or update Rustup" $RustCommand
Invoke-Step "Install Visual Studio 2022 Build Tools C++ workload" $VsBuildToolsCommand

Write-Host ""
if ($DryRun) {
  Write-Host "DryRun finished. After installing prerequisites, reopen PowerShell and run:" -ForegroundColor Green
} else {
  Write-Host "Installation commands finished. Reopen PowerShell, then run:" -ForegroundColor Green
}
Write-Host "  cd `"$Root`""
Write-Host "  pnpm env:check"
Write-Host "  pnpm tauri:dev"
