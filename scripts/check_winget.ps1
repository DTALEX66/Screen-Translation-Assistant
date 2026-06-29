param(
  [switch]$Register
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-CommandExists {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

if (Test-CommandExists "winget") {
  Write-Host ("winget is available: {0}" -f (winget --version)) -ForegroundColor Green
  exit 0
}

$AppInstaller = Get-AppxPackage -Name Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue

if ($AppInstaller) {
  Write-Host "App Installer is installed, but winget is not available in this shell." -ForegroundColor Yellow
  Write-Host "Try reopening PowerShell first."
  Write-Host ""
  Write-Host "If winget is still missing, run:"
  Write-Host "  pnpm env:winget:register"

  if ($Register) {
    Write-Host ""
    Write-Host "Registering Windows Package Manager app package..." -ForegroundColor Cyan
    Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe
    Write-Host "Registration requested. Reopen PowerShell, then run: pnpm env:check" -ForegroundColor Green
  }

  exit 1
}

Write-Host "App Installer/winget is not installed or not registered for this user." -ForegroundColor Red
Write-Host "Install App Installer from Microsoft Store, then reopen PowerShell."
Write-Host "Microsoft Store page:"
Write-Host "  https://apps.microsoft.com/detail/9nblggh4nns1"
Write-Host ""
Write-Host "To open all prerequisite pages manually, run:"
Write-Host "  pnpm env:open-prereqs"
exit 1
