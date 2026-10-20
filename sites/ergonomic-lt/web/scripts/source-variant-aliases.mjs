import {spawnSync} from 'node:child_process';
import path from 'node:path';
// Current source normalization is scoped to the publisher's exact sample.
// Python verifies the original capture's canonical SHA before exposing only
// enum aliases; no session URL, prose, price or credential enters the runtime.
export function sourceVariantAliases(folder){
 const script=`import json,sys,hashlib
from pathlib import Path
root=Path(sys.argv[1]).resolve()
manifest=root/'seed-reference-manifest.json'
aliases={}
if manifest.exists():
 for reference in json.loads(manifest.read_text(encoding='utf8'))['references']:
  file=(root/reference['file']).resolve()
  if not file.is_relative_to(root):raise ValueError('Reference escaped source root')
  source=json.loads(file.read_text(encoding='utf8'))
  digest=hashlib.sha256(json.dumps(source,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
  if digest!=reference['sourceSha256']:raise ValueError('Reference capture SHA mismatch')
  for option in reference['requestedVariant'].split(';'):
   if not option.strip():continue
   field,original=option.split('=',1)
   current=source['properties'].get(field)
   if current is None or current['value']==original:continue
   for sample in reference['samples']:
    key=sample['sample']+'/'+field.split('.')[-1]+'='+original
    value={'text':current['value']}
    if key in aliases and aliases[key]!=value:raise ValueError('Ambiguous normalization for sample '+key)
    aliases[key]=value
print(json.dumps(aliases,ensure_ascii=False))`;
 const result=spawnSync(path.resolve('../.venv/Scripts/python.exe'),['-c',script,path.resolve(folder)],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:1_000_000});
 if(result.status!==0)throw Error('Source variant normalization receipt failed: '+result.stderr);
 return JSON.parse(result.stdout);
}
