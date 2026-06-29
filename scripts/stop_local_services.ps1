param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = (Split-Path -Parent $PSScriptRoot).ToLowerInvariant()
$Ports = @(5173, 8765)
$Targets = New-Object System.Collections.Generic.List[object]

function Test-ScreenLinguaSidecar {
  try {
    $Health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 2
    return ($Health.ok -and $Health.version -eq "0.5-local" -and $Health.mode -eq "local-first")
  } catch {
    return $false
  }
}

foreach ($Port in $Ports) {
  $Connections = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($Connection in $Connections) {
    $ProcessId = $Connection.OwningProcess
    $ProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if (-not $ProcessInfo) {
      continue
    }

    $CommandLine = [string]$ProcessInfo.CommandLine
    $SafeToStop = ($Port -eq 8765 -and (Test-ScreenLinguaSidecar)) -or
      $CommandLine.ToLowerInvariant().Contains($Root) -or
      $CommandLine.ToLowerInvariant().Contains("screen-translation-assistant") -or
      $CommandLine.ToLowerInvariant().Contains("screenlingua")

    $Targets.Add([ordered]@{
      port = $Port
      pid = $ProcessId
      name = $ProcessInfo.Name
      commandLine = $CommandLine
      safeToStop = $SafeToStop
    }) | Out-Null
  }
}

if ($Targets.Count -eq 0) {
  Write-Host "No local ScreenLingua services are listening on 5173 or 8765."
  exit 0
}

foreach ($Target in $Targets) {
  $Action = if ($Target.safeToStop) { "stop" } else { "skip" }
  Write-Host ("{0}: port={1} pid={2} process={3}" -f $Action, $Target.port, $Target.pid, $Target.name)
  if (-not $Target.safeToStop) {
    Write-Host "      command line does not look like this project, so it will not be stopped."
    continue
  }

  if ($DryRun) {
    Write-Host "      dry-run only"
    continue
  }

  Stop-Process -Id $Target.pid -Force
}

if ($DryRun) {
  Write-Host "DryRun finished. No processes were stopped."
} else {
  Write-Host "Stop request finished."
}
