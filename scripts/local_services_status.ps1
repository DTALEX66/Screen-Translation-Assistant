param(
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-PortStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port,
    [string]$HealthPath = ""
  )

  $Connections = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $Pids = @()
  $Processes = @()

  if ($Connections) {
    $Pids = @($Connections | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($ProcessId in $Pids) {
      $ProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
      $Processes += [ordered]@{
        pid = $ProcessId
        name = $ProcessInfo.Name
        commandLine = $ProcessInfo.CommandLine
      }
    }
  }

  $Health = $null
  if ($HealthPath) {
    try {
      $Health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port$HealthPath" -TimeoutSec 2
    } catch {
      $Health = $null
    }
  }

  return [ordered]@{
    name = $Name
    port = $Port
    listening = [bool]$Connections
    pids = $Pids
    processes = $Processes
    healthy = [bool]$Health
    health = $Health
  }
}

$Services = @(
  (Get-PortStatus -Name "vite" -Port 5173),
  (Get-PortStatus -Name "sidecar" -Port 8765 -HealthPath "/health")
)

if ($Json) {
  $Services | ConvertTo-Json -Depth 8
  exit 0
}

foreach ($Service in $Services) {
  $State = if ($Service.listening) { "listening" } else { "stopped" }
  $PidText = if ($Service.pids.Count -gt 0) { $Service.pids -join ", " } else { "-" }
  Write-Host ("{0,-8} port={1} state={2} pid={3}" -f $Service.name, $Service.port, $State, $PidText)

  if ($Service.name -eq "sidecar" -and $Service.healthy) {
    Write-Host ("         health=ok version={0} ocr={1} translation={2}" -f $Service.health.version, $Service.health.ocr.provider, $Service.health.translation.provider)
  } elseif ($Service.name -eq "sidecar" -and $Service.listening) {
    Write-Host "         health=not responding"
  }
}
