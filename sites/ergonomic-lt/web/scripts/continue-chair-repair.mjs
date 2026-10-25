// One finite repair handoff after an already owned article job. No scheduler,
// registry mutation, publication or customer-data writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const option=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const after=option('after'),article=option('article');
const allowedAfter={KFLS001WW002:'KFLS001WW001',KFLS002WW001:'KFLS001WW002',KCAF011WW001:'KCAF010WW001'};
assert(article in allowedAfter,'Explicit repair scope required');
assert.equal(after,allowedAfter[article]);
const root=path.resolve('../research/configurator/all-chairs-20261014');
const receipt=path.join(root,'repair-handoff-'+article+'.json');
const save=async state=>fs.writeFile(receipt,JSON.stringify({after,article,pid:process.pid,at:new Date().toISOString(),...state},null,2)+'\n');
await save({phase:'waiting-for-owned-article'});
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
// Allow the predecessor process and its receipt to initialise. A queued
// predecessor also owns the dependency even before it takes its article lock.
await new Promise(resolve=>setTimeout(resolve,5000));
while(true){
 let lock;try{lock=JSON.parse(await fs.readFile(path.join(root,'article-locks',after+'.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 let predecessor;
 try{predecessor=JSON.parse(await fs.readFile(path.join(root,'repair-handoff-'+after+'.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!(lock&&alive(lock.pid))&&!(predecessor&&alive(predecessor.pid)))break;
 await new Promise(resolve=>setTimeout(resolve,5000));
}
let status;try{status=JSON.parse(await fs.readFile(path.join(root,'status-v4',article+'.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(status?.phase==='verified'){await save({phase:'already-verified'});process.exit(0);}
const archived=[];
if(article==='KFLS002WW001'){
 const source=path.resolve(root,'source-v3',article);
 let manifest;
 try{manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));}
 catch(error){if(error.code!=='ENOENT')throw error;manifest={anchors:[]};}
 for(const anchor of manifest.anchors){
  const directory=path.resolve(source,anchor);assert(directory.startsWith(source+path.sep));
  const base=JSON.parse(await fs.readFile(path.join(directory,'base.json'),'utf8'));
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
   if(!entry.isDirectory()||!/^component-\d+$/.test(entry.name))continue;
   const folder=path.resolve(directory,entry.name);assert(folder.startsWith(source+path.sep));
   let capture;try{capture=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
   const field=capture.fields.find(k=>k.endsWith('.DFRAMEDIAMETER'));
   if(!field||!base.choices[field]?.some(v=>v.value==='_25'&&v.selectable)||Object.keys(capture.records).some(key=>key.includes('DFRAMEDIAMETER=_25')))continue;
   const target=path.resolve(root,'archives/native-enum-encoding',article,String(Date.now()),anchor,entry.name);
   assert(target.startsWith(path.resolve(root,'archives')+path.sep));
   await fs.mkdir(path.dirname(target),{recursive:true});await fs.rename(folder,target);archived.push(target);
  }
 }
}
await save({phase:'repairing',archived});
const child=spawn(process.execPath,['scripts/prepare-chair-worker.mjs','--article='+article],{cwd:process.cwd(),stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
const final=JSON.parse(await fs.readFile(path.join(root,'status-v4',article+'.json'),'utf8'));
await save({phase:final.phase,archived,exitCode:code});
assert.equal(final.phase,'verified',final.reason||'Article repair remains under review');
