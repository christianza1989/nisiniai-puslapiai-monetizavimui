# UTF-8 is scoped to this process tree. No token is placed in command arguments.
$taskPreviousEncoding = $env:PYTHONIOENCODING
$taskPreviousUtf8 = $env:PYTHONUTF8
try {
    $env:PYTHONIOENCODING = 'utf-8'
    $env:PYTHONUTF8 = '1'
    if (-not $env:TREG_TOKEN) {
        $env:TREG_TOKEN = [Environment]::GetEnvironmentVariable('TREG_TOKEN', 'User')
    }
    $taskTregExe = Join-Path $env:USERPROFILE '.local/bin/treg.exe'
    if (-not (Test-Path -LiteralPath $taskTregExe)) { throw 'Install tools-registry[proxy] with uv first.' }
    & $taskTregExe @args
    $taskTregResult = $LASTEXITCODE
} finally {
    $env:PYTHONIOENCODING = $taskPreviousEncoding
    $env:PYTHONUTF8 = $taskPreviousUtf8
}
exit $taskTregResult
