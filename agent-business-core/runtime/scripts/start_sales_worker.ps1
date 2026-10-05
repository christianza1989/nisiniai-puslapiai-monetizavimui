$ErrorActionPreference = 'Stop'
$salesRuntime = Split-Path -Parent $PSScriptRoot
$salesPython = Join-Path $salesRuntime '.venv/Scripts/python.exe'
$salesLogs = Join-Path $salesRuntime 'artifacts/local-processes'
New-Item -ItemType Directory -Path $salesLogs -Force | Out-Null
$existingSales = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'pinet_core\.sales_worker(?:\s|$)' -and
    $_.CommandLine -like "*$salesRuntime*"
}
if ($existingSales) { Write-Output 'Owned sales worker already running; preserved.'; exit 0 }
$salesProcess = Start-Process -FilePath $salesPython -ArgumentList @('-u','-m','pinet_core.sales_worker',
    '--duration-seconds','1800','--max-cli-calls','30') -WorkingDirectory $salesRuntime -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $salesLogs 'sales.stdout.log') `
    -RedirectStandardError (Join-Path $salesLogs 'sales.stderr.log') -PassThru
$salesProcess.Id | Set-Content -LiteralPath (Join-Path $salesLogs 'sales.pid')
Write-Output "Started bounded owner sales worker, PID $($salesProcess.Id), 30 minutes / 30 CLI calls."
