import fs from 'node:fs/promises';
import {bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer active');
const changes=[];
for(const i of sel.pages){
 const p=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId),body=structuredClone(p.body),groups=new Set(p.media.map(m=>m.groupId));
 if(groups.size!==1)throw Error('Review multi-image layout separately');
 let spaces=0;const nodes=row=>{for(let k=1;k<row.length;k++)if(/[\p{L}\p{N}.!?;:]$/u.test(row[k-1].text)&&/^[\p{L}\p{N}„“]/u.test(row[k].text)){row[k].text=' '+row[k].text;spaces++;}};
 let factualCorrections=0;
 if(i.planId==='NP-kaina-trukme')for(const b of body)if(b.type==='paragraph'&&b.text.includes('atskirkite naują priauginimą nuo paslaugos esamam klientui')){b.text=b.text.replace('atskirkite naują priauginimą nuo paslaugos esamam klientui','pasižymėkite, ar meniu variantas skirtas naujam ar esamam klientui');b.text+=' Kliento statusas pats savaime nepasako, ar atliekamas naujas priauginimas, ar jau priaugintų nagų papildymas.';factualCorrections++;}
 let joinedLinkParagraphs=0;
 for(let k=0;k<body.length-1;k++)if(body[k].type==='paragraph'&&/rasite\s*$/u.test(body[k].text)&&body[k+1].type==='richParagraph'){
  body[k]={type:'richParagraph',content:[{type:'text',text:body[k].text},...body[k+1].content]};body.splice(k+1,1);joinedLinkParagraphs++;
 }
 for(const b of body){if(b.content)nodes(b.content);if(b.type==='richList')b.items.forEach(nodes);}
 const removed=body.filter(b=>b.type==='image').length,finalBody=body.filter(b=>b.type!=='image');
 // One original photo per guide. The native featured image renders its family once;
 // a model-inserted copy of that same asset is a duplicate, not a second illustration.
 await editPage('madbeauty',p.id,{body:finalBody,editorial:{...p.editorial,dateModified:null,readingMinutes:Math.max(1,Math.ceil(bodyPlainText(finalBody).split(/\s+/).length/200))}});
 changes.push({planId:i.planId,typedLinkSpacingCorrections:spaces,duplicateInlineFeaturePhotosRemoved:removed,joinedLinkParagraphs,factualCorrections,basis:factualCorrections?'S02 menu differentiates client status, not a new set versus an infill. This bounded editor correction preserves the actual menu meaning.':null});
}
await fs.writeFile(new URL('COPYEDIT.json',here),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Native Luna drafts with editor corrections recorded per page: spacing, joined link paragraph, one featured photo, reading time, and S02 client-status wording. No model or expert-review substitution.',changes},null,2)+'\n');
console.log(JSON.stringify({pages:changes.length,spaces:changes.reduce((n,x)=>n+x.typedLinkSpacingCorrections,0),duplicatePhotosRemoved:changes.reduce((n,x)=>n+x.duplicateInlineFeaturePhotosRemoved,0)}));
