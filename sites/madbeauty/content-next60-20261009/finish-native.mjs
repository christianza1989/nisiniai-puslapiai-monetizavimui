import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const save=state=>fs.writeFile(new URL('NATIVE-DRIVER-STATE.json',here),JSON.stringify({updatedAt:new Date().toISOString(),...state},null,2)+'\n');
try{
 await save({state:'WAITING_FOR_EXISTING_INITIAL60_WRITER',approval:false});
 while(true){const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8')),jobs=JSON.parse(await fs.readFile(sel.privateStudio+'/jobs.json','utf8'));
  if(sel.pages.every(i=>site.pages.find(p=>p.id===i.pageId).body.length)&&!jobs.some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))break;
  const last=jobs.filter(j=>j.siteId==='madbeauty').at(-1);if(last?.status==='failed')throw Error('Existing native writer failed '+last.id+': '+last.error);
  await new Promise(r=>setTimeout(r,1000));
 }
 for(const script of ['prepare-final-revisions.mjs','import-media.mjs','revise-required.mjs']){
  await save({state:'RUNNING_NATIVE_STEP',script,approval:false});
  const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,[fileURLToPath(new URL(script,here))],{cwd:path.resolve(fileURLToPath(here),'../../..'),env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});c.stdout.pipe(process.stdout);c.stderr.pipe(process.stderr);c.on('error',reject);c.on('exit',resolve);});
  if(code!==0)throw Error(script+' failed with code '+code);
 }
 await save({state:'NATIVE_REVISIONS_AND_MEDIA_COMPLETE_REQUIRE_ACTUAL_FINAL_REVIEW',approval:false});console.log('Native revision/media stage complete; no approval or deployment performed.');
}catch(error){await save({state:'FAILED_REQUIRES_FIX',error:error.message,approval:false});throw error;}
