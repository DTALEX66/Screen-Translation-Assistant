param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Links = @(
  [ordered]@{
    Name = "App Installer / winget"
    Url = "https://apps.microsoft.com/detail/9nblggh4nns1"
    Note = "Install this first if winget is missing."
  },
  [ordered]@{
    Name = "Node.js LTS"
    Url = "https://nodejs.org/en/download"
    Note = "Install Node.js 20.19+ or 22.12+."
  },
  [ordered]@{
    Name = "Rustup"
    Url = "https://rustup.rs/"
    Note = "Installs rustc and cargo."
  },
  [ordered]@{
    Name = "Visual Studio Build Tools"
    Url = "https://visualstudio.microsoft.com/downloads/"
    Note = "Install Build Tools for Visual Studio with C++ build tools."
  }
)

Write-Host "Desktop prerequisite pages:" -ForegroundColor Cyan
foreach ($Link in $Links) {
  Write-Host ""
  Write-Host $Link.Name -ForegroundColor Yellow
  Write-Host ("  {0}" -f $Link.Url)
  Write-Host ("  {0}" -f $Link.Note)
}

if ($DryRun) {
  Write-Host ""
  Write-Host "DryRun mode: pages were not opened." -ForegroundColor Green
  exit 0
}

foreach ($Link in $Links) {
  Start-Process $Link.Url
}

Write-Host ""
Write-Host "Opened prerequisite pages. After installing, reopen PowerShell and run:" -ForegroundColor Green
Write-Host '  cd "D:\Project Directory\Screen-Translation-Assistant"'
Write-Host "  pnpm env:check"
Write-Host "  pnpm tauri:dev"
