// Preserve the reviewed draft's immutable assets without copying gigabytes.
// Fresh application assets win; chair assets are content-addressed and verified.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isRuntimeTables,unpackRuntimeTables} from '../src/lib/runtime-tables.mjs';
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const baseline=path.resolve(arg('baseline')),stage=path.resolve(arg('stage')),target=path.resolve('dist/client');
assert(baseline.startsWith(path.resolve('D:/Core')+path.sep)&&stage.startsWith(path.resolve('D:/Core/output')+path.sep));
assert(baseline!==target&&target.startsWith(path.resolve(process.cwd())+path.sep));
const hash=b=>createHash('sha256').update(b).digest('hex');
let linkedBaseline=0,linkedChairs=0;
async function linkTree(from,to,chair=false){
 await fs.mkdir(to,{recursive:true});
 for(const item of await fs.readdir(from,{withFileTypes:true})){
  const source=path.join(from,item.name),dest=path.join(to,item.name);
  assert(!item.isSymbolicLink(),'Unexpected symlink inside reviewed assets');
  if(item.isDirectory()){await linkTree(source,dest,chair);continue;}
  assert(item.isFile());
  try{await fs.link(source,dest);chair?linkedChairs++:linkedBaseline++;}
  catch(e){if(e.code!=='EEXIST')throw e;if(chair)assert.equal(hash(await fs.readFile(source)),hash(await fs.readFile(dest)));}
 }
}
await fs.access(path.join(target,'_headers'));
await linkTree(baseline,target);
await linkTree(path.join(stage,'assets'),target,true);
const manifest=JSON.parse(await fs.readFile(path.join(stage,'chair-structure-candidates.json'),'utf8'));
assert.deepEqual(JSON.parse(await fs.readFile('content/chair-structure-candidates.json','utf8')),manifest);
const receipts={};
for(const entry of Object.values(manifest.models)){
 const bytes=await fs.readFile(path.join(target,entry.runtime.asset));assert.equal(hash(bytes),entry.runtime.sha256);receipts[entry.runtime.asset]=entry.runtime.sha256;
 const encoded=JSON.parse(bytes);assert.equal(isRuntimeTables(encoded),entry.runtime.encoding==='tables-v1','Runtime encoding binding mismatch');
 if(entry.runtime.encoding)assert(entry.runtime.encoding==='tables-v1'&&entry.code==='KSOO004WW002'&&entry.acceptance==='TECHNICAL_DRAFT','Unadmitted table transport');
 const runtime=entry.runtime.encoding==='tables-v1'?unpackRuntimeTables(encoded):encoded;
 for(const anchor of runtime.family.anchors){const asset=anchor.geometry.asset;if(!receipts[asset]){assert.equal(hash(await fs.readFile(path.join(target,asset))),anchor.geometry.assetSha256);receipts[asset]=anchor.geometry.assetSha256;}}
}
let files=0,totalBytes=0;
async function inspect(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await inspect(p);else{const size=(await fs.stat(p)).size;assert(size<=25*1024*1024,'Static file too large '+p);files++;totalBytes+=size;}}}
await inspect(target);assert(files<=100000);
const report={at:new Date().toISOString(),baseline,target,linkedBaseline,linkedChairs,files,totalBytes,models:Object.keys(manifest.models).length,receipts,originalsPreserved:true,launchDeployed:false};
await fs.writeFile(path.join(stage,'BUILD-ASSETS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({models:report.models,files,totalBytes,linkedBaseline,linkedChairs,originalsPreserved:true}));
