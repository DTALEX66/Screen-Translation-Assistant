Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Failures = New-Object System.Collections.Generic.List[string]

function Test-CommandExists {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Write-Check {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][bool]$Ok,
    [string]$Detail = ""
  )

  if ($Ok) {
    Write-Host ("[ok]   {0} {1}" -f $Name, $Detail) -ForegroundColor Green
  } else {
    Write-Host ("[miss] {0} {1}" -f $Name, $Detail) -ForegroundColor Red
    $Failures.Add($Name) | Out-Null
  }
}

if (Test-CommandExists "node") {
  $NodeVersion = (& node -p "process.versions.node").Trim()
  $NodeParts = $NodeVersion.Split(".")
  $NodeMajor = [int]$NodeParts[0]
  $NodeMinor = [int]$NodeParts[1]
  $NodeOk = (($NodeMajor -eq 20 -and $NodeMinor -ge 19) -or ($NodeMajor -eq 22 -and $NodeMinor -ge 12) -or $NodeMajor -ge 23)
  if ($NodeOk) {
    Write-Check "Node.js" $true "v$NodeVersion"
  } else {
    $CompatNodeOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_vite_compat.ps1 -CheckOnly 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Check "Node.js compatible runtime" $true ($CompatNodeOutput -join " ")
      Write-Host "[note] system Node.js v$NodeVersion is too old; Vite is wired through dev:compat/build:compat." -ForegroundColor Yellow
    } else {
      Write-Check "Node.js 20.19+ or 22.12+" $false "v$NodeVersion"
    }
  }
} else {
  $CompatNodeOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_vite_compat.ps1 -CheckOnly 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Check "Node.js compatible runtime" $true ($CompatNodeOutput -join " ")
  } else {
    Write-Check "Node.js" $false
  }
}

if (Test-CommandExists "pnpm") {
  Write-Check "pnpm" $true (pnpm --version)
} else {
  Write-Check "pnpm" $false
}

$HasWinget = Test-CommandExists "winget"
if ($HasWinget) {
  Write-Check "winget" $true (winget --version)
} else {
  Write-Host "[note] winget not found; pnpm env:install requires App Installer/winget." -ForegroundColor Yellow
  Write-Host "[note] run pnpm env:winget:check for repair/install guidance." -ForegroundColor Yellow
}

if (Test-CommandExists "python") {
  Write-Check "Python" $true (python --version)
} else {
  Write-Check "Python 3.10+" $false
}

if (Test-CommandExists "rustc") {
  Write-Check "rustc" $true (rustc --version)
} else {
  Write-Check "Rust stable / rustc" $false
}

if (Test-CommandExists "cargo") {
  Write-Check "Cargo" $true (cargo --version)
} else {
  Write-Check "Cargo" $false
}

$HasCppTools = $false
if (Test-CommandExists "cl") {
  $HasCppTools = $true
}

$VsWhereCandidates = @(
  "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe",
  "$env:ProgramFiles\Microsoft Visual Studio\Installer\vswhere.exe"
)

foreach ($Candidate in $VsWhereCandidates) {
  if ($Candidate -and (Test-Path $Candidate)) {
    $InstallPath = & $Candidate -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($LASTEXITCODE -eq 0 -and $InstallPath) {
      $HasCppTools = $true
      break
    }
  }
}

Write-Check "Visual Studio Build Tools C++" $HasCppTools

if ($Failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Install the missing tools above before running pnpm tauri:dev or pnpm tauri:build." -ForegroundColor Yellow
  Write-Host "You can preview install commands with: pnpm env:install:dry" -ForegroundColor Yellow
  if ($HasWinget) {
    Write-Host "To install with winget, run: pnpm env:install" -ForegroundColor Yellow
  } else {
    Write-Host "Run pnpm env:winget:check, install App Installer, or install the missing tools manually." -ForegroundColor Yellow
    Write-Host "To open manual installer pages, run: pnpm env:open-prereqs" -ForegroundColor Yellow
  }
  exit 1
}

Write-Host ""
Write-Host "Desktop environment looks ready." -ForegroundColor Green
