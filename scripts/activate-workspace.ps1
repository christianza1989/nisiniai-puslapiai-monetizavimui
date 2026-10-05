# Dot-source: . ./scripts/activate-workspace.ps1
$pinetWorkspaceRoot = Split-Path -Parent $PSScriptRoot
$pinetPublicCoreRoot = Join-Path (Split-Path -Parent $pinetWorkspaceRoot) 'dovanos-memorycasting'
if (-not (Test-Path -LiteralPath (Join-Path $pinetPublicCoreRoot 'package.json'))) {
    throw 'Missing sibling dovanos-memorycasting checkout; follow docs/MULTI_MACHINE.md.'
}
$env:PINET_PUBLIC_CORE_PATH = (Resolve-Path -LiteralPath $pinetPublicCoreRoot).Path
$env:STUDIO_NETWORK_SETTINGS = Join-Path $env:PINET_PUBLIC_CORE_PATH 'config/niche-network.json'
$env:PINET_VOICE_ENABLED = 'false'
$env:PINET_SMTP_ENABLED = 'false'
Write-Output 'Workspace paths configured for this PowerShell process; voice and SMTP remain off.'
