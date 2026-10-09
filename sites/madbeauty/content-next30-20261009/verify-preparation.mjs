import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8'));
const previous=JSON.parse(await fs.readFile('C:/Users/Lenovo/.codex/tmp/madbeauty-calendar-20261009/sites/madbeauty.json','utf8'));
const media=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
const jobs=JSON.parse(await fs.readFile(sel.privateStudio+'/jobs.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const oldPublished=previous.pages.filter(p=>p.publishedRevision);
for(const p of oldPublished){const current=site.pages.find(x=>x.id===p.id);for(const key of ['body','publishAt','media','editorial','publishedRevision'])if(JSON.stringify(p[key])!==JSON.stringify(current[key]))throw Error('Old approved page changed '+p.id+' '+key);}
for(const p of previous.pages)if(p.publishAt!==site.pages.find(x=>x.id===p.id)?.publishAt)throw Error('Publication moment changed '+p.id);
const selected=new Set(sel.pages.map(i=>i.pageId)),receipts=[];
for(const j of jobs){for(const [id,r] of Object.entries(j.generationReceipts||{})){if(!selected.has(id))continue;if(r.observed?.model!=='gpt-6-luna'||r.observed?.reasoningEffort!=='xhigh'||r.fallback)throw Error('Wrong native writer policy '+id);const raw=await fs.readFile(path.join(sel.privateStudio,r.resultArtifact));if(hash(raw)!==r.resultSha256)throw Error('CLI result artifact changed '+id);receipts.push({jobId:j.id,pageId:id,jobType:j.type,status:j.status,...r});}}
if(media.length!==30||new Set(media.map(m=>m.originalSha256)).size!==30)throw Error('30 distinct original photos required');
for(const m of media){if(hash(await fs.readFile(m.originalPath))!==m.originalSha256)throw Error('Original image changed');if(m.imported.variants.length!==5)throw Error('Responsive family missing');for(const a of m.imported.variants){if(hash(await fs.readFile(new URL('assets/'+path.basename(a.src),here)))!==a.sha256)throw Error('Responsive bytes changed');}}
const observations=sel.pages.map(i=>{const p=site.pages.find(p=>p.id===i.pageId);const date=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Vilnius'}).format(new Date(p.publishAt));if(date!==i.localDate+' '+i.localTime)throw Error('Local publication mismatch '+i.planId);return {planId:i.planId,pageId:i.pageId,publishAt:p.publishAt,localDate:i.localDate,localTime:i.localTime,timezone:'Europe/Vilnius',written:!!p.body.length,mediaVariants:p.media.length,hasApprovedSnapshot:!!p.publishedRevision,factChecks:p.factChecks};});
const report={checkedAt:new Date().toISOString(),written:observations.filter(p=>p.written).length,originalPhotographs:30,responsiveAssets:150,priorApprovedSnapshotsPreserved:oldPublished.length,allExistingPublicationMomentsPreserved:true,verifiedCliReceipts:receipts.length,receipts,pages:observations,scope:'Preparation and immutable local files; deployment is established by a separate actual-domain receipt'};
await fs.writeFile(new URL('PREPARATION-CHECK.json',here),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,receipts:undefined,pages:undefined}));
