# Prepared installer. Do not execute until Rokas authorizes deployment/installation.
# Registers a DISABLED task; it neither provisions a token nor starts the program.
param([Parameter(Mandatory=$true)][string]$Config)
$ErrorActionPreference = 'Stop'
$bridgeTaskName = 'Promedical-Rewrite-Bridge-3510'
if (Get-ScheduledTask -TaskName $bridgeTaskName -ErrorAction SilentlyContinue) { throw 'Task already exists. Inspect its owner and state; do not overwrite it.' }
$bridgeConfigPath = (Resolve-Path -LiteralPath $Config).Path
$bridgeConfig = Get-Content -LiteralPath $bridgeConfigPath -Raw | ConvertFrom-Json
if ($bridgeConfig.enabled -ne $false) { throw 'Install only from explicitly disabled configuration.' }
if ($bridgeConfig.origin -ne 'https://promedical.lt') { throw 'Unexpected site origin.' }
$bridgeRun = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'run-content-rewrite-bridge.ps1')).Path
foreach ($bridgePath in @($bridgeConfigPath,$bridgeRun)) { if ($bridgePath.Contains('"')) { throw 'Invalid path quote.' } }
$bridgePowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$bridgeArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $bridgeRun + '" -Config "' + $bridgeConfigPath + '"'
$bridgeAction = New-ScheduledTaskAction -Execute $bridgePowerShell -Argument $bridgeArguments -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$bridgeTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
$bridgePrincipal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$bridgeSettings = New-ScheduledTaskSettingsSet -Disable -Hidden -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$bridgeTask = New-ScheduledTask -Action $bridgeAction -Trigger $bridgeTrigger -Principal $bridgePrincipal -Settings $bridgeSettings -Description 'No-AI Promedical queue-to-file transport; requires logged-in Drive user. Disabled until approved activation.'
Register-ScheduledTask -TaskName $bridgeTaskName -InputObject $bridgeTask | Select-Object TaskName,State
