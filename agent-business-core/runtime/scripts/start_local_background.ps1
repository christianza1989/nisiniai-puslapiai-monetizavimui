$ErrorActionPreference = 'Stop'
$runtimeRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $runtimeRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Run uv sync first.' }
$logRoot = Join-Path $runtimeRoot 'artifacts/local-processes'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Start-LocalService {
    param([string]$Name, [string[]]$Arguments, [int]$Port = 0)
    if ($Port -gt 0) {
        $listener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listener) { Write-Output "$Name port $Port already occupied; existing process preserved."; return }
    }
    if ($Name -eq 'jobs') {
        $existing = Get-CimInstance Win32_Process | Where-Object {
            $_.Name -like 'python*' -and $_.CommandLine -match '\-m pinet_core\.jobs(?:\s|$)'
        }
        if ($existing) { Write-Output 'Jobs process already running; preserved.'; return }
    }
    if ($Name -eq 'knowledge') {
        $existing = Get-CimInstance Win32_Process | Where-Object {
            $_.Name -like 'python*' -and $_.CommandLine -match 'scripts[/\\]local_knowledge_sync\.py(?:\s|$)' -and
            $_.CommandLine.Contains($runtimeRoot)
        }
        if ($existing) { Write-Output 'Knowledge projection process already running; preserved.'; return }
    }
    $process = Start-Process -FilePath $pythonPath -ArgumentList $Arguments -WorkingDirectory $runtimeRoot `
        -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot "$Name.stdout.log") `
        -RedirectStandardError (Join-Path $logRoot "$Name.stderr.log") -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $logRoot "$Name.pid")
    Write-Output "Started local $Name helper, PID $($process.Id)."
}

# No provider worker, SMTP toggle, Windows service or scheduled task is installed.
Start-LocalService -Name 'api' -Arguments @('-m','uvicorn','pinet_core.api:app','--host','127.0.0.1','--port','8840','--no-access-log') -Port 8840
Start-LocalService -Name 'jobs' -Arguments @('-u','-m','pinet_core.jobs')
Start-LocalService -Name 'knowledge' -Arguments @('-u','scripts/local_knowledge_sync.py')
Start-LocalService -Name 'preview' -Arguments @('-u','scripts/start_site_preview.py') -Port 5187
