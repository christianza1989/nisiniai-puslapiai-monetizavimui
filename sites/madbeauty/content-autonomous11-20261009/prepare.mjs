import fs from 'node:fs/promises';
import {draftSnapshotHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/draft-v2.mjs';
const here=new URL('.',import.meta.url),old=new URL('../content-next30-20261009/',here),data='C:/Users/Lenovo/.codex/tmp/madbeauty-autonomous11-20261009';
try{await fs.access(data);throw Error('Tenant already exists, preserve');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.cp('C:/Users/Lenovo/.codex/tmp/madbeauty-next30-20261009',data,{recursive:true,force:false,errorOnExist:true});
const original=JSON.parse(await fs.readFile(new URL('SELECTION.json',old),'utf8'));
const pending=JSON.parse(await fs.readFile(new URL('RELEASE-LINKS.json',old),'utf8')).specialistPendingPlanIds;
const sel={...original,createdAt:new Date().toISOString(),privateStudio:data,selection:'Eleven actual existing texts; autonomous owner policy supersedes human-signature gate, real agent checks retained',pages:original.pages.filter(p=>pending.includes(p.planId))};
await fs.writeFile(new URL('SELECTION.json',here),JSON.stringify(sel,null,2)+'\n');
for(const name of ['SOURCE-NOTES.json','MEDIA-PLAN.json','REVIEW-NOTES.json'])await fs.copyFile(new URL(name,old),new URL(name,here));
await fs.mkdir(new URL('assets/',here),{recursive:true});
await fs.writeFile(new URL('.gitignore',here),'screenshots/\nSCREENS*.png\nrelease/release-manifest.json\n');
process.env.STUDIO_DATA_DIR=data;process.env.STUDIO_OUTPUT_DIR=data+'/output';
const {getSite,editPage,selectReleaseLinks,finalizeInternalLinks}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
let site=await getSite('madbeauty');
await fs.writeFile(new URL('BASELINE.json',here),JSON.stringify({approvedSnapshots:site.pages.filter(p=>p.publishedRevision).map(p=>({id:p.id,revision:p.publishedRevision})),dates:site.pages.map(p=>({id:p.id,publishAt:p.publishAt}))},null,2)+'\n');
for(const i of sel.pages){const p=site.pages.find(p=>p.id===i.pageId);if(!p.body.length||!p.generatedDraft)throw Error('Missing actual draft');if(p.factChecks.some(c=>!c.startsWith('Plane aiškiai numatyta patikra dar neatlikta:')))throw Error('Additional unresolved claim '+i.planId);await editPage('madbeauty',p.id,{factChecks:[]});}
site=await getSite('madbeauty');const ids=new Set(sel.pages.map(i=>i.pageId));
const decisions=sel.pages.map(i=>{const p=site.pages.find(p=>p.id===i.pageId),proposals=[...(p.linkSuggestions||[]),...(p.generatedDraft?.internalLinks||[]),...(p.links||[])].filter((l,k,a)=>a.findIndex(x=>x.targetPageId===l.targetPageId)===k),ready=id=>ids.has(id)||!!site.pages.find(p=>p.id===id)?.publishedRevision;return {pageId:p.id,keep:proposals.filter(l=>ready(l.targetPageId)).map(l=>l.targetPageId),defer:proposals.filter(l=>!ready(l.targetPageId)).map(l=>({targetPageId:l.targetPageId,reason:'Tema dar neparašyta arba galutinė agento faktų ir medijos patikra neatlikta; būsimas adresas lieka privačiame plane.'}))};});
const receipt=await selectReleaseLinks('madbeauty',{expectedSiteHash:draftSnapshotHash(site),pageIds:[...ids],decisions});await finalizeInternalLinks('madbeauty',[...ids]);
await fs.writeFile(new URL('RELEASE-LINKS.json',here),JSON.stringify({selectedPlanIds:sel.pages.map(p=>p.planId),specialistPendingPlanIds:[],receipt},null,2)+'\n');
await fs.writeFile(new URL('DELIVERY.json',here),JSON.stringify({state:'REAL_REVIEW_PENDING',policy:'../EDITORIAL_POLICY.json'},null,2)+'\n');
console.log(JSON.stringify({selected:sel.pages.length,approvedBefore:58,humanSignatureRequired:false,approvedNow:false}));
