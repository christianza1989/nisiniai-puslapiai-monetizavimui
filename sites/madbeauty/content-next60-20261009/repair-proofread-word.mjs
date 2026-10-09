import fs from 'node:fs/promises';
import {v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>['running','queued'].includes(j.status)))throw Error('Writer active');
const i=sel.pages.find(i=>i.planId==='MD-gidas'),p=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId),body=structuredClone(p.body);let count=0;
const fix=t=>{if(t.includes('Nekiekviena')){count++;return t.replaceAll('Nekiekviena','Ne kiekviena');}return t;};
for(const b of body){if(b.text)b.text=fix(b.text);if(b.content)for(const n of b.content)n.text=fix(n.text);if(b.type==='list')b.items=b.items.map(fix);if(b.type==='richList')for(const row of b.items)for(const n of row)n.text=fix(n.text);}
if(count!==1)throw Error('Expected the one actually read spelling issue');
await editPage('madbeauty',p.id,{body});const final=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId);
await fs.writeFile(new URL('FINAL-PROOFREAD-WORD.json',here),JSON.stringify({checkedAt:new Date().toISOString(),planId:i.planId,beforeRevisionHash:v2RevisionHash(p),afterRevisionHash:v2RevisionHash(final),from:'Nekiekviena',to:'Ne kiekviena',count,basis:'Actually read final paragraph; spelling-only correction. Full text review and two actual rendered views must be refreshed.'},null,2)+'\n');console.log({planId:i.planId,count});
