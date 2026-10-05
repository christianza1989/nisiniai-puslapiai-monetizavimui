param(
    [string]$Directory = (Join-Path $PSScriptRoot 'output/top200-research-20261001/selected'),
    [ValidateRange(1,4)][int]$Workers = 4,
    [ValidateRange(0,200)][int]$Limit = 0,
    [ValidateRange(0,200)][int]$StopAfterTotal = 0
)
$ErrorActionPreference = 'Stop'
$nicheDirectory = (Resolve-Path -LiteralPath $Directory).Path
$nichePython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
$nicheScript = Join-Path $PSScriptRoot 'niche_research.py'
if (-not (Test-Path -LiteralPath (Join-Path $nicheDirectory 'selection.json'))) {
    throw 'Truksta uzfiksuoto TOP200 selection.json.'
}
$nicheLockPath = Join-Path $nicheDirectory '.run.lock'
if (Test-Path -LiteralPath $nicheLockPath) {
    $nicheLock = [System.IO.File]::Open($nicheLockPath, 'Open', 'ReadWrite', 'ReadWrite')
    try {
        try { $nicheLock.Lock(0,1) }
        catch { throw 'Siame TOP200 kataloge jau vyksta tyrimas.' }
        $nicheLock.Unlock(0,1)
    }
    finally { $nicheLock.Dispose() }
}
$nicheStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$nicheStdout = Join-Path $nicheDirectory ('research-' + $nicheStamp + '.out.log')
$nicheStderr = Join-Path $nicheDirectory ('research-' + $nicheStamp + '.err.log')
$nicheArguments = @('-X','utf8','-u',('"' + $nicheScript + '"'),'--directory',('"' + $nicheDirectory + '"'),
    '--workers',"$Workers",'--limit',"$Limit",'--stop-after-total',"$StopAfterTotal")
$nicheProcess = Start-Process -FilePath $nichePython -ArgumentList $nicheArguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $nicheStdout -RedirectStandardError $nicheStderr
$nicheMetadata = [ordered]@{launcher_pid=$nicheProcess.Id; started_at=$nicheProcess.StartTime.ToUniversalTime().ToString('o'); workers=$Workers; limit=$Limit; stop_after_total=$StopAfterTotal; model='gpt-6.1-sol'; reasoning_effort='xhigh'; stdout=$nicheStdout; stderr=$nicheStderr}
$nicheMetadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $nicheDirectory 'research_background.json') -Encoding utf8
$nicheMetadata | ConvertTo-Json -Compress
