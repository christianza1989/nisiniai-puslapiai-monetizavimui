param(
    [ValidateRange(1, 300)][int]$BatchSize = 100,
    [ValidateRange(1, 4)][int]$Workers = 4
)
$ErrorActionPreference = 'Stop'

$domainPythonPath = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
$domainClassifierPath = Join-Path $PSScriptRoot 'pipeline.py'
$domainOutputDirectory = Join-Path $PSScriptRoot 'output'
if (-not (Test-Path -LiteralPath $domainPythonPath -PathType Leaf)) {
    throw 'Truksta Python aplinkos; pirma paleiskite Idiegti.ps1.'
}

# Check the same OS lock used by the classifier before creating a new log.
$domainLockPath = Join-Path $domainOutputDirectory '.run.lock'
if (Test-Path -LiteralPath $domainLockPath -PathType Leaf) {
    $domainLock = [System.IO.File]::Open($domainLockPath, 'Open', 'ReadWrite', 'ReadWrite')
    try {
        try { $domainLock.Lock(0, 1) }
        catch { throw 'Siame kataloge jau vyksta analize; antro proceso nepaleidziame.' }
        $domainLock.Unlock(0, 1)
    }
    finally { $domainLock.Dispose() }
}

$domainLogDirectory = Join-Path $domainOutputDirectory 'logs'
New-Item -ItemType Directory -Path $domainLogDirectory -Force | Out-Null
$domainStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$domainStdout = Join-Path $domainLogDirectory ('analysis-' + $domainStamp + '.out.log')
$domainStderr = Join-Path $domainLogDirectory ('analysis-' + $domainStamp + '.err.log')
$domainArguments = @('-X', 'utf8', '-u', ('"' + $domainClassifierPath + '"'),
    '--model', 'gpt-6.1-sol', '--batch-size', "$BatchSize", '--workers', "$Workers")
# pipeline.py ranks the whole source by name before starting AI; no partial legacy queue.
$domainProcess = Start-Process -FilePath $domainPythonPath -ArgumentList $domainArguments `
    -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $domainStdout -RedirectStandardError $domainStderr

$domainMetadata = [ordered]@{
    launcher_pid = $domainProcess.Id
    started_at = $domainProcess.StartTime.ToUniversalTime().ToString('o')
    model = 'gpt-6.1-sol'
    reasoning_effort = 'xhigh'
    batch_size = $BatchSize
    workers = $Workers
    top_n = 1000
    strategy_batch = 6
    stdout = $domainStdout
    stderr = $domainStderr
}
$domainMetadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $domainOutputDirectory 'background_run.json') -Encoding utf8
$domainMetadata | ConvertTo-Json -Compress
