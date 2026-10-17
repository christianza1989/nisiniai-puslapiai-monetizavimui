"""Embed public source provenance in shipping copies; raw source assets stay intact."""
import argparse, hashlib, json, subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--engine',type=Path,required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[1];manifest=root/'content/asset-provenance.json'
rows=json.loads(manifest.read_text(encoding='utf-8'));seen=set();failures=[];count=0
for row in rows:
    target=(root/'public'/row['path'].lstrip('/')).resolve()
    if not target.is_relative_to((root/'public').resolve()):raise ValueError('Path outside public')
    if target.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):continue
    row.setdefault('source_sha256',row['sha256'])
    if target not in seen:
        seen.add(target)
        prompt=f"Sourced asset. Origin: {row['source']}. Source download SHA256: {row['source_sha256']}. Original asset supplied by its source; no generated content."
        result=subprocess.run([str(args.engine),'embed-prompt',str(target),'--prompt',prompt],capture_output=True,text=True,encoding='utf-8')
        if result.returncode:failures.append({'path':row['path'],'error':result.stderr.strip() or result.stdout.strip()})
        else:count+=1
    row['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
manifest.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
seedpath=root/'content/seed.json';seed=json.loads(seedpath.read_text(encoding='utf-8'));seed['provenance']=rows
seedpath.write_text(json.dumps(seed,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'embedded':count,'failures':failures},ensure_ascii=False));raise SystemExit(bool(failures))
