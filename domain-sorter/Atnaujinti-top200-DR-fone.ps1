param(
    [string]$Directory = (Join-Path $PSScriptRoot 'output/top200-research-20261001/selected')
)
$ErrorActionPreference = 'Stop'
$drDirectory = (Resolve-Path -LiteralPath $Directory).Path
$drPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
$drScript = Join-Path $PSScriptRoot 'ahrefs_dr.py'
$drLockPath = Join-Path $drDirectory 'dr-runtime/.run.lock'
if (Test-Path -LiteralPath $drLockPath) {
    $drLock = [System.IO.File]::Open($drLockPath, 'Open', 'ReadWrite', 'ReadWrite')
    try {
        try { $drLock.Lock(0,1) }
        catch { throw 'DR ataskaitos atnaujinimas jau veikia.' }
        $drLock.Unlock(0,1)
    }
    finally { $drLock.Dispose() }
}
$drStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$drStdout = Join-Path $drDirectory ('dr-sync-' + $drStamp + '.out.log')
$drStderr = Join-Path $drDirectory ('dr-sync-' + $drStamp + '.err.log')
$drArguments = @('-X','utf8','-u',('"' + $drScript + '"'),'--directory',('"' + $drDirectory + '"'),
    '--export-only','--follow-research')
$drProcess = Start-Process -FilePath $drPython -ArgumentList $drArguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $drStdout -RedirectStandardError $drStderr
$drMetadata = [ordered]@{launcher_pid=$drProcess.Id; started_at=$drProcess.StartTime.ToUniversalTime().ToString('o'); mode='export-only-follow-research'; stdout=$drStdout; stderr=$drStderr; api_requests=0}
$drMetadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $drDirectory 'dr_sync_background.json') -Encoding utf8
$drMetadata | ConvertTo-Json -Compress
