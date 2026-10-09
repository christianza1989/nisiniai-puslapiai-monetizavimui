import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const save=state=>fs.writeFile(new URL('RENDER-DRIVER-STATE.json',here),JSON.stringify({updatedAt:new Date().toISOString(),approval:false,productionDeployed:false,...state},null,2)+'\n');
let server;
try{
 await save({state:'WAITING_FOR_PRIVATE_FINALIZATION'});
 while(true){const r=JSON.parse(await fs.readFile(new URL('PRIVATE-FINALIZATION-STATE.json',here),'utf8'));if(r.state==='FAILED_REQUIRES_FIX')throw Error(r.error);if(r.state==='READY_FOR_ACTUAL_FINAL_TEXT_AND_RENDERED_REVIEW')break;await new Promise(r=>setTimeout(r,1000));}
 const jobs=JSON.parse(await fs.readFile(sel.privateStudio+'/jobs.json','utf8'));if(jobs.some(j=>['running','queued'].includes(j.status)))throw Error('Writer still active');
 const origin='http://127.0.0.1:8876';
 let existing=false;try{existing=(await fetch(origin+'/api/meta',{signal:AbortSignal.timeout(1000)})).ok;}catch{}
 if(existing)throw Error('Port8876 already occupied; do not reuse an unknown tenant');
 server=spawn(process.execPath,['C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/server.mjs'],{env:{...process.env,STUDIO_PORT:'8876',STUDIO_DATA_DIR:sel.privateStudio,STUDIO_OUTPUT_DIR:sel.privateStudio+'/output'},windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout.pipe(process.stdout);server.stderr.pipe(process.stderr);
 let ready=false;for(let k=0;k<60;k++){if(server.exitCode!==null)throw Error('Native preview server failed');try{ready=(await fetch(origin+'/api/meta',{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Native server unavailable');
 for(const script of ['capture-preview.mjs','render-check.mjs','screen-contact-sheet.mjs']){
  await save({state:'RUNNING_ACTUAL_PRIVATE_BROWSER_CHECK',script});
  const extra=script==='render-check.mjs'?process.argv.filter(a=>a.startsWith('--only=')):[];
  const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,[fileURLToPath(new URL(script,here)),...extra],{windowsHide:true,stdio:['ignore','pipe','pipe']});c.stdout.pipe(process.stdout);c.stderr.pipe(process.stderr);c.on('error',reject);c.on('exit',resolve);});if(code!==0)throw Error(script+' failed '+code);
 }
 await save({state:'ACTUAL120_VIEWS_CAPTURED_REQUIRE_ACTUAL_PIXEL_OBSERVATION_AND_FINAL_TEXT_REVIEW'});
}catch(error){await save({state:'FAILED_REQUIRES_FIX',error:error.message});throw error;}finally{if(server)server.kill();}
