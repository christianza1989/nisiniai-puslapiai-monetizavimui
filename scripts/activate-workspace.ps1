# Dot-source: . ./scripts/activate-workspace.ps1
param([ValidateSet('start', 'continue', 'handoff')][string]$FreshnessPhase = 'start')
$pinetWorkspaceRoot = Split-Path -Parent $PSScriptRoot
$pinetPublicCoreRoot = Join-Path (Split-Path -Parent $pinetWorkspaceRoot) 'dovanos-memorycasting'
if (-not (Test-Path -LiteralPath (Join-Path $pinetPublicCoreRoot 'package.json'))) {
    throw 'Missing sibling dovanos-memorycasting checkout; follow docs/MULTI_MACHINE.md.'
}
& node (Join-Path $PSScriptRoot 'git-freshness.mjs') --repo $pinetWorkspaceRoot --companion $pinetPublicCoreRoot --phase $FreshnessPhase
if ($LASTEXITCODE -ne 0) {
    throw 'Git freshness blocked: read docs/MULTI_MACHINE.md. No source files were rewritten.'
}
$env:PINET_PUBLIC_CORE_PATH = (Resolve-Path -LiteralPath $pinetPublicCoreRoot).Path
$env:STUDIO_NETWORK_SETTINGS = Join-Path $env:PINET_PUBLIC_CORE_PATH 'config/niche-network.json'
$env:PINET_VOICE_ENABLED = 'false'
$env:PINET_SMTP_ENABLED = 'false'
Write-Output 'Workspace paths configured for this PowerShell process; voice and SMTP remain off.'
