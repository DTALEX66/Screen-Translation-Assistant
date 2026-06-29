param(
  [switch]$InstallLocalEngines
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Service = Join-Path $Root "sidecars\ocr_service"
Set-Location $Service

$Existing = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
if ($Existing -and !$InstallLocalEngines) {
  Write-Host "ScreenLingua local sidecar is already listening on http://127.0.0.1:8765 (PID: $($Existing.OwningProcess))"
  return
}

$VenvPython = Join-Path $Service ".venv\Scripts\python.exe"

function Test-SupportedPython {
  param([Parameter(Mandatory = $true)][string]$PythonPath)

  try {
    $VersionText = (& $PythonPath -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
    $Version = [version]$VersionText
    return $Version -ge [version]"3.10" -and $Version -le [version]"3.12"
  } catch {
    return $false
  }
}

function Resolve-PythonForVenv {
  $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($PyLauncher) {
    foreach ($VersionArg in @("-3.12", "-3.11", "-3.10")) {
      $Output = & $PyLauncher.Source $VersionArg -c "import sys; print(sys.executable)" 2>$null
      if ($LASTEXITCODE -eq 0 -and $Output) {
        $PythonPath = ([string]($Output | Select-Object -First 1)).Trim()
        if ($PythonPath -and (Test-SupportedPython $PythonPath)) {
          return $PythonPath
        }
      }
    }
  }

  $SystemPython = Get-Command python -ErrorAction SilentlyContinue
  if ($SystemPython -and (Test-SupportedPython $SystemPython.Source)) {
    return $SystemPython.Source
  }

  return $null
}

if (!(Test-Path $VenvPython)) {
  $PythonForVenv = Resolve-PythonForVenv
  if (!$PythonForVenv) {
    throw "No supported Python was found for sidecar .venv creation. Install Python 3.10, 3.11, or 3.12, or create sidecars\ocr_service\.venv first."
  }

  Write-Host "Creating sidecar .venv with $PythonForVenv"
  & $PythonForVenv -m venv .venv
}

function Install-RequirementFileIfNeeded {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RequirementFile,
    [Parameter(Mandatory = $true)]
    [string]$MarkerFile
  )

  if (!(Test-Path -LiteralPath $RequirementFile)) {
    throw "Requirement file not found: $RequirementFile"
  }

  $PythonVersion = (& $VenvPython --version 2>&1 | Out-String).Trim()
  $RequirementHash = (Get-FileHash -LiteralPath $RequirementFile -Algorithm SHA256).Hash
  $DesiredState = "$PythonVersion`n$RequirementHash"

  if (Test-Path -LiteralPath $MarkerFile) {
    $CurrentState = (Get-Content -LiteralPath $MarkerFile -Raw).Trim()
    if ($CurrentState -eq $DesiredState) {
      Write-Host "Python dependencies are up to date for $RequirementFile"
      return
    }
  }

  & $VenvPython -m pip install -r $RequirementFile
  Set-Content -LiteralPath $MarkerFile -Value $DesiredState -Encoding UTF8
}

$BaseMarker = Join-Path $Service ".venv\.screenlingua-requirements.sha256"
Install-RequirementFileIfNeeded `
  -RequirementFile (Join-Path $Service "requirements.txt") `
  -MarkerFile $BaseMarker

if ($InstallLocalEngines) {
  $LocalMarker = Join-Path $Service ".venv\.screenlingua-requirements-local.sha256"
  Install-RequirementFileIfNeeded `
    -RequirementFile (Join-Path $Service "requirements-local.txt") `
    -MarkerFile $LocalMarker
}

if ($Existing) {
  Write-Host "Local engines are installed. Restart the sidecar to load newly installed packages. Current PID: $($Existing.OwningProcess)"
  return
}

& $VenvPython main.py
