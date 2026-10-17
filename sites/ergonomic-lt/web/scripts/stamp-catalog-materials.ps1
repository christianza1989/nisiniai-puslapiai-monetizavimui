param([Parameter(Mandatory=$true)][string]$Engine,[ValidateSet('material-verification.json','swatch-verification.json','photo-verification.json')][string]$Report='material-verification.json')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskReportPath=Join-Path $taskRoot ('..\research\configurator\batch-10\'+$Report)
$taskReport=Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
$taskPublic=[IO.Path]::GetFullPath((Join-Path $taskRoot 'public'))+[IO.Path]::DirectorySeparatorChar
foreach($taskGroup in ($taskReport | Group-Object file)){
  $taskAsset=[IO.Path]::GetFullPath((Join-Path $taskRoot $taskGroup.Name))
  if(!$taskAsset.StartsWith($taskPublic,[StringComparison]::OrdinalIgnoreCase)){throw 'Material outside public directory'}
  $taskCodes=(@($taskGroup.Group | ForEach-Object { if ($_.code) {$_.code} else {$_.article} }) -join ', ')
  & $Engine embed-prompt $taskAsset --prompt ($taskGroup.Group[0].origin+' Public source asset. Identifiers: '+$taskCodes+'.') | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Provenance embedding failed'}
  $taskDigest=(Get-FileHash -LiteralPath $taskAsset -Algorithm SHA256).Hash.ToLowerInvariant()
  foreach($taskTexture in $taskGroup.Group){$taskTexture | Add-Member -NotePropertyName assetSha256 -NotePropertyValue $taskDigest -Force}
}
[IO.File]::WriteAllText($taskReportPath,($taskReport | ConvertTo-Json -Depth 30),[Text.UTF8Encoding]::new($false))
Write-Output ('Stamped source finishes: '+$taskReport.Count)
