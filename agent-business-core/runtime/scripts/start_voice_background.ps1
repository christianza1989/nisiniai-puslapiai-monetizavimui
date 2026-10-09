param([switch]$Probe, [switch]$WithPreview, [string]$Site = 'traktoriupadangos', [int]$PreviewPort = 5187)
$ErrorActionPreference = 'Stop'
$runtimeRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $runtimeRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Run uv sync --locked first.' }
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONPATH = Join-Path $runtimeRoot 'src'
Push-Location $runtimeRoot
try {
    $gate = (& $pythonPath -c 'import json; from pinet_core.config import settings; from pinet_core.profiles import PROFILES; c=settings(); print(json.dumps({"live":c.voice_ready,"probe":c.m0_probe_enabled and c.voice_provider_ready,"environment":c.environment,"core_url":c.core_url,"sites":[s for s in c.voice_sites if s in PROFILES]}))' | ConvertFrom-Json)
} finally { Pop-Location }
if ($LASTEXITCODE -ne 0 -or ($Probe -and -not $gate.probe) -or (-not $Probe -and -not $gate.live)) {
    throw 'Requested voice mode is not ready. Run prelive_doctor.py; no certification flags are changed here.'
}
if ($Site -notin $gate.sites -or $PreviewPort -lt 1024 -or $PreviewPort -gt 65535) { throw 'Requested site or preview port is not admitted.' }
$coreUri = [uri]$gate.core_url
if ($coreUri.Scheme -ne 'http' -or $coreUri.Host -ne '127.0.0.1' -or $coreUri.Port -lt 1024 -or $coreUri.UserInfo -or $coreUri.Query -or $coreUri.Fragment) {
    throw 'This local launcher requires the configured loopback HTTP API.'
}
$corePort = $coreUri.Port
$logRoot = Join-Path $runtimeRoot 'artifacts/voice-processes'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Start-VoiceService {
    param([string]$Name, [string[]]$Arguments, [int]$Port = 0)
    $recordPath = Join-Path $logRoot "$Name.process.json"
    if (Test-Path -LiteralPath $recordPath) {
        $record = Get-Content -LiteralPath $recordPath | ConvertFrom-Json
        $existing = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
        if ($existing -and $existing.StartTime.ToUniversalTime() -eq ([datetime]$record.started_at).ToUniversalTime()) {
            $expectedMode = if ($Probe) { 'private_probe' } else { 'live' }
            if ($record.mode -ne $expectedMode -or $record.environment -ne $gate.environment -or $record.site -ne $Site) { throw "$Name runs in another mode/site/namespace; existing process preserved." }
            Write-Output "$Name already running; preserved."
            return
        }
    }
    if ($Port -gt 0 -and (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
        throw "$Name port $Port occupied by an unregistered process; existing process preserved."
    }
    $process = Start-Process -FilePath $pythonPath -ArgumentList $Arguments -WorkingDirectory $runtimeRoot `
        -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot "$Name.stdout.log") `
        -RedirectStandardError (Join-Path $logRoot "$Name.stderr.log") -PassThru
    @{ pid = $process.Id; started_at = $process.StartTime.ToUniversalTime().ToString('o'); environment = $gate.environment; site = $Site; mode = $(if ($Probe) { 'private_probe' } else { 'live' }) } |
        ConvertTo-Json | Set-Content -LiteralPath $recordPath
    Write-Output "Started $Name, PID $($process.Id)."
}

# PostgreSQL and LiveKit must already be running. This helper installs no machine service.
Start-VoiceService -Name 'api' -Arguments @('-m','uvicorn','pinet_core.api:app','--host','127.0.0.1','--port',"$corePort",'--no-access-log') -Port $corePort
$apiReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri ($gate.core_url.TrimEnd('/') + '/health') -TimeoutSec 1
        if ($health.environment -ne $gate.environment) { throw 'Unexpected core namespace.' }
        if ($health.status -eq 'ok') { $apiReady = $true; break }
    } catch { if ($attempt -eq 29) { throw 'Core did not become healthy; inspect private API log.' } }
    Start-Sleep -Milliseconds 500
}
if (-not $apiReady) { throw 'Core health did not report ready; dependent services were not started.' }
$workerModule = if ($Probe) { 'pinet_core.m0_voice_worker' } else { 'pinet_core.voice_worker' }
Start-VoiceService -Name 'consultant' -Arguments @('-m',$workerModule,'start')
$consultantReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $worker = Invoke-RestMethod -Uri 'http://127.0.0.1:8081/worker' -TimeoutSec 1
        $expectedName = if ($Probe) { 'pinet-m0-consultant' } else { 'pinet-consultant' }
        if ($worker.agent_name -ne $expectedName) { throw 'Unexpected voice worker.' }
        $registration = Get-Content -LiteralPath (Join-Path $logRoot 'consultant.registration.json') | ConvertFrom-Json
        $record = Get-Content -LiteralPath (Join-Path $logRoot 'consultant.process.json') | ConvertFrom-Json
        if ($registration.ready -and $registration.agent_name -eq $expectedName -and
            $registration.environment -eq $gate.environment -and
            [datetime]$registration.registered_at -ge [datetime]$record.started_at -and
            (Get-Process -Id $registration.pid -ErrorAction SilentlyContinue)) { $consultantReady = $true; break }
    } catch { if ($attempt -eq 29) { throw 'Consultant did not become healthy; inspect private worker log.' } }
    Start-Sleep -Milliseconds 500
}
if (-not $consultantReady) { throw 'Consultant registration did not complete; dependent services were not started.' }
Start-VoiceService -Name 'jobs' -Arguments @('-u','-m','pinet_core.jobs')
if ($WithPreview) { Start-VoiceService -Name 'preview' -Arguments @('-u','scripts/start_site_preview.py','--site',$Site,'--port',"$PreviewPort") -Port $PreviewPort }
