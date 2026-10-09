import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobOwnerActive,currentJobOwner} from '../src/job-owner.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
test('a second server cannot recover work owned by a live same-host writer',()=>{
 assert.equal(jobOwnerActive(currentJobOwner()),true);
 assert.equal(jobOwnerActive({host:'fixture',pid:42},{host:'fixture',probe:()=>{}}),true);
 assert.equal(jobOwnerActive({host:'fixture',pid:42},{host:'fixture',probe:()=>{throw Object.assign(Error(),{code:'ESRCH'});}}),false);
 assert.equal(jobOwnerActive({host:'fixture',pid:42},{host:'fixture',probe:()=>{throw Object.assign(Error(),{code:'EPERM'});}}),true);
 assert.equal(jobOwnerActive({host:'foreign',pid:42},{host:'fixture'}),false);
 assert.equal(jobOwnerActive(null),false);
});
test('actual second model process preserves a live queued owner and recovers it only after exit',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'studio-job-owner-')),env={...process.env,STUDIO_DATA_DIR:path.join(tmp,'data')};
 const model=new URL('../src/model.mjs',import.meta.url).href,writer=path.join(tmp,'writer.mjs'),recover=path.join(tmp,'recover.mjs');let child;
 try{
  await writeFile(writer,`const m=await import(${JSON.stringify(model)});await m.initialize();await m.createJob('fixture','alpha');console.log('ready');setInterval(()=>{},1000);`);
  await writeFile(recover,`const m=await import(${JSON.stringify(model)});await m.initialize({recoverJobs:true});console.log((await m.listJobs())[0].status);`);
  child=spawn(process.execPath,[writer],{env,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Fixture exited '+code)));});
  const status=()=>execFileSync(process.execPath,[recover],{env,encoding:'utf8',timeout:10000}).trim();
  assert.equal(status(),'queued');
  await new Promise(resolve=>{child.once('exit',resolve);child.kill();});child=null;
  assert.equal(status(),'failed');
 }finally{if(child)child.kill();assert.equal(path.dirname(tmp),path.resolve(os.tmpdir()));await rm(tmp,{recursive:true,force:true});}
});
