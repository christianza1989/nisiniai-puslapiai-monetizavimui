// Preserve old measured component captures when a new dependency plan changes
// their exact field set. No supplier seed, editorial or app mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const code=process.argv.find(v=>v.startsWith('--article='))?.slice(10);
assert(/^K[A-Z0-9]+$/.test(code||''),'Explicit published article required');
const root=path.resolve('../research/configurator/all-chairs-20261014');
const source=path.join(root,'source-v3');
const folder=path.join(source,code);
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
const previous=new Map();
for(const anchor of manifest.anchors){
 const file=path.join(folder,anchor,'component-plan.json');
 try{previous.set(anchor,await fs.readFile(file));}catch(error){if(error.code!=='ENOENT')throw error;}
}
const log=await fs.open(path.join(root,'logs-v3',code+'-replan.log'),'a');
const result=spawnSync(process.execPath,['scripts/plan-catalog-configurators.mjs','--force','--selection='+path.join(root,'selection-available.json'),'--source='+source,'--article='+code],{cwd:process.cwd(),stdio:['ignore',log.fd,log.fd]});
await log.close();assert.equal(result.status,0,'Replanning failed');
const archive=path.join(root,'archives','component-plans',code,new Date().toISOString().replace(/[:.]/g,'-'));
let moved=0;
for(const anchor of manifest.anchors){
 const dir=path.resolve(folder,anchor);assert(dir.startsWith(folder+path.sep),'Invalid source anchor');
 const newPlan=JSON.parse(await fs.readFile(path.join(dir,'component-plan.json'),'utf8'));
 const old=previous.get(anchor);if(old){await fs.mkdir(path.join(archive,anchor),{recursive:true});await fs.writeFile(path.join(archive,anchor,'component-plan-before.json'),old);}
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  if(!entry.isDirectory()||!/^component-\d+$/.test(entry.name))continue;
  const index=Number(entry.name.split('-')[1]),captureDir=path.resolve(dir,entry.name);
  assert(captureDir.startsWith(folder+path.sep),'Move escaped this owned article');
  let capture;
  try{capture=JSON.parse(await fs.readFile(path.join(captureDir,await fs.stat(path.join(captureDir,'manifest.json')).then(()=> 'manifest.json',()=> 'checkpoint.json')),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(capture&&JSON.stringify(capture.fields)===JSON.stringify(newPlan.groups[index]))continue;
  const destination=path.resolve(archive,anchor,entry.name);assert(destination.startsWith(path.resolve(root,'archives')+path.sep),'Archive escaped owned research');
  await fs.mkdir(path.dirname(destination),{recursive:true});await fs.rename(captureDir,destination);moved++;
 }
}
console.log(JSON.stringify({code,anchors:manifest.anchors.length,archivedComponents:moved,archive}));
