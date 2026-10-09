import fs from 'node:fs/promises';
import {v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),read=async name=>JSON.parse(await fs.readFile(new URL(name,here),'utf8')),sel=await read('SELECTION.json');
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>['running','queued'].includes(j.status)))throw Error('Writer active');
const text=await read('FINAL-TEXT-REVIEW.json'),qa=await read('RENDER-CHECK.json'),visual=await read('RENDERED-PIXEL-REVIEW.json'),media=await read('MEDIA-PLAN.json');
if(text.state!=='PASS_ACTUAL60_FULL_FINAL_TEXT_REVIEWS'||text.pages.length!==60||visual.state!=='PASS_ACTUAL_RENDERED_PIXELS'||visual.sheets.length!==8||qa.views.length!==120)throw Error('Actual complete text and rendered pixel evidence required');
const decisions=[];
for(const i of sel.pages){
 const p=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId),n=text.pages.find(p=>p.planId===i.planId),m=media.find(m=>m.pageId===p.id),hash=v2RevisionHash(p),views=qa.views.filter(v=>v.planId===i.planId);
 if(n.revisionHash!==hash||views.length!==2||views.some(v=>v.revisionHash!==hash)||m.originalPixelReview?.state!=='PASS_ORIGINAL_PIXELS'||!n.remainingCheckResolution)throw Error('Stale or incomplete actual check '+i.planId);
 decisions.push({planId:i.planId,revisionHash:hash,originalNotes:p.factChecks,resolution:n.remainingCheckResolution,mediaEvidence:{originalSha256:m.originalSha256,originalPixelReview:m.originalPixelReview,renderViews:views.map(v=>({device:v.device,revisionHash:v.revisionHash,screenshot:v.screenshot}))},decision:'RESOLVED_BY_ACTUAL_AGENT_REVIEW'});
 if(p.factChecks.length){await editPage('madbeauty',p.id,{factChecks:[]});if(v2RevisionHash((await getSite('madbeauty')).pages.find(p=>p.id===i.pageId))!==hash)throw Error('Clearing private check unexpectedly changed public revision');}
}
await fs.writeFile(new URL('RESOLVED-CHECKS.json',here),JSON.stringify({checkedAt:new Date().toISOString(),humanExpertReviewPerformed:false,decisions},null,2)+'\n');
console.log({pages:decisions.length,publicRevisionsUnchanged:true});
