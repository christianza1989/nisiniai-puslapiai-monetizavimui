// A finite, explicitly selected queue of published articles. It shares the
// per-code locks with the main queue and never activates or deploys data.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const codes=process.argv.find(v=>v.startsWith('--articles='))?.slice(11).split(',');
assert(codes?.length&&codes.length<=12&&new Set(codes).size===codes.length);
const root=path.resolve('../research/configurator/all-chairs-20261014');
const selection=JSON.parse(await fs.readFile(path.join(root,'selection-available.json'),'utf8'));
const allowed=new Set(selection.products.flatMap(p=>p.articles.map(a=>a.code)));
assert(codes.every(code=>allowed.has(code)),'Only supplier-published selected articles');
const receiptName=process.argv.find(v=>v.startsWith('--receipt='))?.slice(10)||'priority-chair-queue.json';
assert(/^[a-z0-9-]+\.json$/.test(receiptName),'A scoped queue receipt filename is required');
const receipt=path.join(root,receiptName),results=[];
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const save=async state=>{const temp=receipt+'.tmp-'+process.pid;await fs.writeFile(temp,JSON.stringify({pid:process.pid,codes,results,at:new Date().toISOString(),...state},null,2)+'\n');await fs.rename(temp,receipt);};
for(const code of codes){
 await save({phase:'waiting',current:code});
 while(true){
  let lock;try{lock=JSON.parse(await fs.readFile(path.join(root,'article-locks',code+'.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!lock||!alive(lock.pid))break;
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 await save({phase:'preparing',current:code});
 const child=spawn(process.execPath,['scripts/prepare-chair-worker.mjs','--article='+code],{cwd:process.cwd(),stdio:'inherit'});
 const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 const state=JSON.parse(await fs.readFile(path.join(root,'status-v4',code+'.json'),'utf8'));
 results.push({code,exitCode,phase:state.phase,reason:state.reason||null});
}
await save({phase:'completed',current:null});
console.log(JSON.stringify({priorityArticles:codes.length,verified:results.filter(r=>r.phase==='verified').length,review:results.filter(r=>r.phase!=='verified').map(r=>r.code)}));
