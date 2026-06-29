param(
  [int]$Port = 8765,
  [int]$WaitSeconds = 45
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-SidecarHealth {
  param([int]$HealthPort)

  try {
    $Health = Invoke-RestMethod -Uri "http://127.0.0.1:$HealthPort/health" -TimeoutSec 2
    return [bool]$Health.ok
  } catch {
    return $false
  }
}

if (Test-SidecarHealth $Port) {
  $Existing = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $Pids = ($Existing | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
  Write-Host "ScreenLingua sidecar is healthy on 127.0.0.1:$Port (pid: $Pids). Reusing it."
  exit 0
}

$ExistingPort = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($ExistingPort) {
  $Pids = ($ExistingPort | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
  Write-Host "Port 127.0.0.1:$Port is listening (pid: $Pids), but /health did not respond." -ForegroundColor Yellow
  Write-Host "Stop that process or start sidecar manually with: pnpm sidecar" -ForegroundColor Yellow
  exit 1
}

$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stdout = Join-Path $LogDir "sidecar.out.log"
$Stderr = Join-Path $LogDir "sidecar.err.log"

Write-Host "Starting ScreenLingua sidecar in the background..."
$Process = Start-Process `
  -FilePath "powershell" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\start_local_sidecar.ps1")) `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $Stdout `
  -RedirectStandardError $Stderr `
  -PassThru

$Deadline = (Get-Date).AddSeconds($WaitSeconds)
while ((Get-Date) -lt $Deadline) {
  Start-Sleep -Milliseconds 750
  if (Test-SidecarHealth $Port) {
    Write-Host "ScreenLingua sidecar is ready on 127.0.0.1:$Port (pid: $($Process.Id))."
    exit 0
  }

  if ($Process.HasExited) {
    Write-Host "Sidecar process exited before becoming healthy. See logs:" -ForegroundColor Red
    Write-Host "  $Stdout"
    Write-Host "  $Stderr"
    exit 1
  }
}

Write-Host "Timed out waiting for sidecar health. See logs:" -ForegroundColor Red
Write-Host "  $Stdout"
Write-Host "  $Stderr"
exit 1
