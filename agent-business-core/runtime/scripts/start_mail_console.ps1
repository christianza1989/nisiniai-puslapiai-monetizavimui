$ErrorActionPreference = 'Stop'
# Reuse the single core API; mail is a module of that core.
& (Join-Path $PSScriptRoot 'start_local_background.ps1')
Write-Output 'Mail console: http://127.0.0.1:8840/operator/mail-ui (operator authentication required).'
