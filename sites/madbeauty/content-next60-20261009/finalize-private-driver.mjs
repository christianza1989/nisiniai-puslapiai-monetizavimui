import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const here=new URL('.',import.meta.url);
const save=state=>fs.writeFile(new URL('PRIVATE-FINALIZATION-STATE.json',here),JSON.stringify({updatedAt:new Date().toISOString(),approval:false,productionDeployed:false,...state},null,2)+'\n');
try{
 await save({state:'WAITING_FOR_NATIVE_REVISION_DRIVER'});
 while(true){const r=JSON.parse(await fs.readFile(new URL('NATIVE-DRIVER-STATE.json',here),'utf8'));if(r.state==='FAILED_REQUIRES_FIX')throw Error(r.error);if(r.state==='NATIVE_REVISIONS_AND_MEDIA_COMPLETE_REQUIRE_ACTUAL_FINAL_REVIEW')break;await new Promise(r=>setTimeout(r,1000));}
 // Preserve the earlier actual reconcile inputs/receipt before including the later S121 body-scrub evidence.
 for(const name of ['FINAL-REVISION-PLAN-INPUT.json','FINAL-REVISION-PREPARATION.json'])await fs.copyFile(new URL(name,here),new URL('HISTORICAL-BEFORE-LATE-S121-'+name,here));
 for(const script of ['prepare-final-revisions.mjs','revise-required.mjs','copyedit-layout.mjs','link-catalogue.mjs','select-links.mjs']){
  await save({state:'RUNNING_PRIVATE_FINALIZATION',script});
  const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,[fileURLToPath(new URL(script,here))],{windowsHide:true,stdio:['ignore','pipe','pipe']});c.stdout.pipe(process.stdout);c.stderr.pipe(process.stderr);c.on('error',reject);c.on('exit',resolve);});if(code!==0)throw Error(script+' failed '+code);
 }
 await save({state:'READY_FOR_ACTUAL_FINAL_TEXT_AND_RENDERED_REVIEW'});
}catch(error){await save({state:'FAILED_REQUIRES_FIX',error:error.message});throw error;}
