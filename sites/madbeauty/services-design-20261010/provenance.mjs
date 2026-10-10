import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const dir=import.meta.dirname,repo=path.resolve(dir,'../../..');
const inputs=JSON.parse(await readFile(path.join(dir,'ASSET_INPUTS.json'),'utf8'));
const manifest=JSON.parse(await readFile(path.join(dir,'ASSET_MANIFEST.json'),'utf8'));
const mediaFile=path.resolve(repo,'sites/madbeauty/prototype/public/media.json');
const media=JSON.parse(await readFile(mediaFile,'utf8'));
const exe='C:/Users/Lenovo/.impeccable/bin/0.1.8/impeccable.exe';
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const a of manifest.assets){
 const prompt=inputs.find(i=>i.id===a.id).prompt;
 const original=path.resolve(dir,a.original);
 execFileSync(exe,['embed-prompt',original,'--prompt',prompt],{stdio:'pipe'});
 a.sha256=hash(await readFile(original));
 for(const v of a.variants){
  const file=path.resolve(repo,'sites/madbeauty/prototype/public',v.file);
  execFileSync(exe,['embed-prompt',file,'--prompt',prompt],{stdio:'pipe'});
  const bytes=await readFile(file);v.bytes=bytes.length;v.sha256=hash(bytes);
 }
 media.assets.find(i=>i.id==='service-illustration-'+a.id).variants=a.variants;
}
manifest.provenance='Exact generation prompt embedded in each original and WebP derivative; pixels and alpha unchanged.';
await writeFile(path.join(dir,'ASSET_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(mediaFile,JSON.stringify(media,null,2)+'\n');
console.log(JSON.stringify({state:'PROVENANCE_EMBEDDED',assets:manifest.assets.length,variants:manifest.assets.reduce((n,a)=>n+a.variants.length,0)}));
