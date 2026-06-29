param(
  [ValidateSet("dev", "build")]
  [string]$Mode = "dev",
  [switch]$CheckOnly,
  [string[]]$ExtraArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-NodeVersion {
  param([Parameter(Mandatory = $true)][string]$Version)

  $Parts = $Version.Split(".")
  if ($Parts.Count -lt 2) {
    return $false
  }

  $Major = [int]$Parts[0]
  $Minor = [int]$Parts[1]

  return (($Major -eq 20 -and $Minor -ge 19) -or ($Major -eq 22 -and $Minor -ge 12) -or $Major -ge 23)
}

function Get-NodeVersion {
  param([Parameter(Mandatory = $true)][string]$NodePath)

  try {
    $Version = (& $NodePath -p "process.versions.node" 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $Version) {
      return $null
    }
    return $Version
  } catch {
    return $null
  }
}

function Add-Candidate {
  param(
    [Parameter(Mandatory = $true)]$List,
    [string]$Path
  )

  if (-not $Path) {
    return
  }

  $AlreadyExists = $false
  foreach ($Item in $List) {
    if ($Item -ieq $Path) {
      $AlreadyExists = $true
      break
    }
  }

  if (-not $AlreadyExists) {
    $List.Add($Path) | Out-Null
  }
}

$Candidates = New-Object System.Collections.Generic.List[string]
$SystemNode = Get-Command node -ErrorAction SilentlyContinue
if ($SystemNode) {
  Add-Candidate $Candidates $SystemNode.Source
}

Add-Candidate $Candidates "$env:ProgramFiles\nodejs\node.exe"
Add-Candidate $Candidates "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
Add-Candidate $Candidates "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

$CodexRuntimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes"
if (Test-Path $CodexRuntimeRoot) {
  Get-ChildItem -Path $CodexRuntimeRoot -Recurse -Filter node.exe -ErrorAction SilentlyContinue |
    ForEach-Object { Add-Candidate $Candidates $_.FullName }
}

$SelectedNode = $null
$SelectedVersion = $null

foreach ($Candidate in $Candidates) {
  if (-not (Test-Path $Candidate)) {
    continue
  }

  $Version = Get-NodeVersion $Candidate
  if ($Version -and (Test-NodeVersion $Version)) {
    $SelectedNode = $Candidate
    $SelectedVersion = $Version
    break
  }
}

if (-not $SelectedNode) {
  Write-Host "No compatible Node.js was found." -ForegroundColor Red
  Write-Host "Install Node.js 20.19+ or 22.12+, then reopen PowerShell." -ForegroundColor Yellow
  Write-Host "You can open installer pages with: pnpm env:open-prereqs" -ForegroundColor Yellow
  exit 1
}

Write-Host ("Using Node.js v{0}: {1}" -f $SelectedVersion, $SelectedNode) -ForegroundColor Green

if ($CheckOnly) {
  exit 0
}

$ViteCli = Join-Path $Root "node_modules\vite\bin\vite.js"
if (-not (Test-Path $ViteCli)) {
  Write-Host "Vite is not installed. Run pnpm install first." -ForegroundColor Red
  exit 1
}

$ViteArgs = @($ViteCli)
if ($Mode -eq "build") {
  $ViteArgs += "build"
} else {
  $ViteArgs += @("--host", "127.0.0.1")
}

$ViteArgs += $ExtraArgs

& $SelectedNode @ViteArgs
exit $LASTEXITCODE
