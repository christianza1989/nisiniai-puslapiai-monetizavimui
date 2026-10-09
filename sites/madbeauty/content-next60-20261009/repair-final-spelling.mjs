import fs from 'node:fs/promises';
import {v2RevisionHash,bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>['queued','running'].includes(j.status)))throw Error('Writer active');
const i=sel.pages.find(i=>i.planId==='FX-joga-pilatesas'),p=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId),body=structuredClone(p.body),before=v2RevisionHash(p);
let count=0;const replace=t=>{if(t.includes('Эti')){count++;return t.replaceAll('Эti','Šie');}return t;};
for(const b of body){if(b.text)b.text=replace(b.text);if(b.content)for(const n of b.content)n.text=replace(n.text);if(b.type==='richList')for(const row of b.items)for(const n of row)n.text=replace(n.text);if(b.type==='list')b.items=b.items.map(replace);}
if(count!==1)throw Error('Expected the one actually observed FX foreign-word occurrence');
await editPage('madbeauty',p.id,{body});const final=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId);
if(/[\u0400-\u04ff]/u.test(bodyPlainText(final.body)))throw Error('Foreign word remains');
await fs.copyFile(new URL('RENDER-DRIVER-STATE.json',here),new URL('HISTORICAL-RENDER-REJECTION-01.json',here));
await fs.writeFile(new URL('FINAL-SPELLING-REPAIR.json',here),JSON.stringify({checkedAt:new Date().toISOString(),planId:i.planId,beforeRevisionHash:before,afterRevisionHash:v2RevisionHash(final),actualObserved:'Эti',correctedTo:'Šie',occurrences:count,basis:'Actual browser and full-text observation; original phrase-spanning replacement did not match a typed node. Literal word correction only, no substantive content or source changes.'},null,2)+'\n');
console.log({planId:i.planId,occurrences:count});
