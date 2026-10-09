import fs from 'node:fs/promises';
import {v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const stage=JSON.parse(await fs.readFile(new URL('PRIVATE-FINALIZATION-STATE.json',here),'utf8'));
if(stage.state!=='READY_FOR_ACTUAL_FINAL_TEXT_AND_RENDERED_REVIEW')throw Error('Finish all native revisions, copyedit and links before final text review');
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8')),jobs=JSON.parse(await fs.readFile(sel.privateStudio+'/jobs.json','utf8'));
if(jobs.some(j=>['running','queued'].includes(j.status)))throw Error('Writer active');
const input=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
let record={state:'PARTIAL_ACTUAL_FINAL_TEXT_REVIEW',pages:[]};try{record=JSON.parse(await fs.readFile(new URL('FINAL-TEXT-REVIEW.json',here),'utf8'));}catch{}
for(const n of input){
 const item=sel.pages.find(i=>i.planId===n.planId);if(!item||!n.usefulness||!n.verifiedClaims||!n.remainingCheckResolution)throw Error('Explicit actual usefulness/facts/check decision required');
 const p=site.pages.find(p=>p.id===item.pageId);
 const row={...n,pageId:p.id,reviewedAt:new Date().toISOString(),revisionHash:v2RevisionHash(p),state:n.pendingCopyedit?'READ_REQUIRES_COPYEDIT':'PASS_FULL_FINAL_TEXT_READ'};
 record.pages=record.pages.filter(r=>r.planId!==n.planId);record.pages.push(row);
}
record.checkedAt=new Date().toISOString();record.state=record.pages.length===60&&record.pages.every(p=>p.state==='PASS_FULL_FINAL_TEXT_READ')?'PASS_ACTUAL60_FULL_FINAL_TEXT_REVIEWS':'PARTIAL_ACTUAL_FINAL_TEXT_REVIEW';
await fs.writeFile(new URL('FINAL-TEXT-REVIEW.json',here),JSON.stringify(record,null,2)+'\n');
console.log({recorded:input.length,total:record.pages.length,state:record.state});
