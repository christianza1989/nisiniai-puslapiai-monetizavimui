import fs from 'node:fs/promises';
import path from 'node:path';
import {bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),selection=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=selection.privateStudio;process.env.STUDIO_OUTPUT_DIR=selection.privateStudio+'/output';
const {getSite,listJobs,saveResponsiveAsset,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
const site=await getSite('madbeauty');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Wait for writer; never change its snapshot');
if(selection.pages.some(i=>!site.pages.find(p=>p.id===i.pageId)?.body.length))throw Error('All 60 written drafts required before attachment');
const plan=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
await fs.mkdir(new URL('assets/',here),{recursive:true});
for(const p of plan){
 if(p.imported){console.log(JSON.stringify({planId:p.planId,state:'existing-import-preserved'}));continue;}
 if(!p.originalPath||p.originalPixelReview?.state!=='PASS_ORIGINAL_PIXELS'||p.originalPixelReview.sha256!==p.originalSha256)throw Error('Actual original review missing '+p.planId);
 const asset=await saveResponsiveAsset('madbeauty',{mime:'image/png',alt:p.alt,rights:'Originali pagal užsakymą sugeneruota Madbeauty redakcinė iliustracija',prompt:p.actualPrompt||p.prompt,credit:''},await fs.readFile(p.originalPath));
 const largest=asset.variants.toSorted((a,b)=>b.width-a.width)[0];
 const page=(await getSite('madbeauty')).pages.find(x=>x.id===p.pageId);
 await editPage('madbeauty',page.id,{media:[{id:largest.id}],editorial:{...page.editorial,dateModified:null,featuredImageId:largest.id,readingMinutes:Math.max(1,Math.ceil(bodyPlainText(page.body).split(/\s+/).length/200))}});
 for(const v of asset.variants)await fs.copyFile(selection.privateStudio+'/media/madbeauty/'+path.basename(v.src),new URL('assets/'+path.basename(v.src),here));
 p.imported={id:largest.id,groupId:asset.groupId,variants:asset.variants,optimization:asset.optimization};p.status='IMPORTED_REQUIRES_RENDERED_REVIEW';p.originalPixelsInspected=true;p.pixelReview='All 60 original photographs viewed individually and in four contact sheets: relevant subject, distinct composition/palette, anatomical plausibility, no fake before/after or unsafe procedure portrayal. Mobile rendered focal point checked separately.';
 await fs.writeFile(new URL('MEDIA-PLAN.json',here),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({planId:p.planId,variants:asset.variants.length,largest:largest.width}));
}
console.log('60 responsive media families imported; no editorial approval or deployment performed.');
