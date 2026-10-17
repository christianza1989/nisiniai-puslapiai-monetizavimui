param([Parameter(Mandatory=$true)][string]$Engine)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskReportPath=Join-Path $taskRoot '..\research\configurator\render-quality\source-quality.json'
$taskReport=Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
$taskPublic=[IO.Path]::GetFullPath((Join-Path $taskRoot 'public'))+[IO.Path]::DirectorySeparatorChar
foreach($taskTexture in $taskReport.textures){
  $taskAsset=[IO.Path]::GetFullPath((Join-Path $taskRoot $taskTexture.file))
  if(!$taskAsset.StartsWith($taskPublic,[StringComparison]::OrdinalIgnoreCase)){throw 'Material outside public directory'}
  & $Engine embed-prompt $taskAsset --prompt $taskTexture.origin
  if($LASTEXITCODE -ne 0){throw 'Provenance embedding failed'}
  $taskTexture | Add-Member -NotePropertyName assetSha256 -NotePropertyValue ((Get-FileHash -LiteralPath $taskAsset -Algorithm SHA256).Hash.ToLowerInvariant()) -Force
}
[IO.File]::WriteAllText($taskReportPath,($taskReport | ConvertTo-Json -Depth 30),[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath $taskReportPath -Destination (Join-Path $taskRoot '.impeccable\review\configurator-render-quality\source-quality.json')
