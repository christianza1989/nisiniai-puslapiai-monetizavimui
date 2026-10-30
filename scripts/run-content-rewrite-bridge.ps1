param([Parameter(Mandatory=$true)][string]$Config)
$ErrorActionPreference = 'Stop'
$bridgeConfig = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
if ($bridgeConfig.enabled -ne $true) { throw 'Bridge disabled: deployment approval and explicit activation are required.' }
$bridgeSource = Join-Path $PSScriptRoot 'content-rewrite-bridge.mjs'
$bridgeLogDir = Join-Path (Split-Path -Parent $bridgeConfig.state) 'logs'
New-Item -ItemType Directory -Path $bridgeLogDir -Force | Out-Null
$bridgeLog = Join-Path $bridgeLogDir ((Get-Date -Format 'yyyy-MM-dd') + '.log')
$bridgeExit = 1
try {
    # DPAPI ciphertext is readable only as the Windows user who provisioned it.
    # Never put the secret in config, command arguments, Drive, or task XML.
    $bridgeSecure = Get-Content -LiteralPath $bridgeConfig.tokenFile -Raw | ConvertTo-SecureString
    $bridgeCredential = New-Object System.Management.Automation.PSCredential('rewrite-bridge', $bridgeSecure)
    $env:CONTENT_REWRITE_BRIDGE_TOKEN = $bridgeCredential.GetNetworkCredential().Password
    & node $bridgeSource $Config 2>&1 | Out-File -LiteralPath $bridgeLog -Append -Encoding utf8
    $bridgeExit = $LASTEXITCODE
} catch {
    # Error details may contain a private path; retain them only in the local log.
    ('{0:o} bridge wrapper failed: {1}' -f (Get-Date), $_.Exception.Message) | Out-File -LiteralPath $bridgeLog -Append -Encoding utf8
} finally {
    Remove-Item Env:CONTENT_REWRITE_BRIDGE_TOKEN -ErrorAction SilentlyContinue
    $bridgeCredential = $null
    $bridgeSecure = $null
}
exit $bridgeExit
