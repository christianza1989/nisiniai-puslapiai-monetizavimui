import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const here=new URL('.',import.meta.url);
const selection=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const primary='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui';
const data=selection.privateStudio;
process.env.STUDIO_DATA_DIR=data;process.env.STUDIO_OUTPUT_DIR=data+'/output';
const {getSite}=await import('file:///'+primary+'/content-studio/src/model.mjs');
for(const item of selection.pages){
 const page=(await getSite('madbeauty')).pages.find(p=>p.id===item.pageId);
 if(page.body.length){if(!page.generatedDraft?.generationReceipt&&!page.generatedDraft)throw Error('Existing body without generation provenance');console.log(JSON.stringify({planId:item.planId,state:'existing-draft-preserved'}));continue;}
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[primary+'/content-studio/scripts/draft-page.mjs','madbeauty',item.pageId],{env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);child.on('error',reject);child.on('exit',resolve);});
 if(code!==0)throw Error('Draft job failed: '+item.planId);
 console.log(JSON.stringify({planId:item.planId,state:'written-private-draft'}));
}
console.log('BATCH_WRITTEN_REQUIRES_MEDIA_AND_REVIEW');
