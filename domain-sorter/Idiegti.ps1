$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskPython = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
if (-not $taskPython) { throw 'Reikalingas Python 3.11 arba naujesnis.' }
& $taskPython -m venv .venv
if ($LASTEXITCODE -ne 0) { throw 'Nepavyko sukurti Python aplinkos.' }
& '.venv/Scripts/python.exe' -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Nepavyko idiegti priklausomybiu.' }
Write-Host 'Paruosta. Paleiskite Paleisti.cmd. Codex CLI turi buti idiegtas ir prisijunges (codex login).'
