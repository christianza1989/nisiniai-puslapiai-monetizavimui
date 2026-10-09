import fs from 'node:fs/promises';
import {v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>['running','queued'].includes(j.status)))throw Error('Writer active');
const replacements={'PM-antakiai':[['mida teikėjas','ką teikėjas'],['o mida reikėtų','o ką reikėtų']],'PX-korekcija-nuemimas':[['įskaičiuotas.Ar','įskaičiuotas. Ar']],'GL-ar-stiprinimas':[['Norite padengti natūralų nagą, nekurdamas papildomo ilgio?','Norite padengti natūralų nagą nepridėdami papildomo ilgio?']]},changes=[];
for(const [planId,pairs] of Object.entries(replacements)){
 const i=sel.pages.find(i=>i.planId===planId),p=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId),body=structuredClone(p.body),observed=[];
 for(const b of body)if(b.type==='list')b.items=b.items.map(text=>{let next=text;for(const [from,to] of pairs)if(next.includes(from)){observed.push({from,to,actualListItemBefore:next});next=next.replaceAll(from,to);}return next;});
 if(observed.length){await editPage('madbeauty',p.id,{body});const final=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId);changes.push({planId,beforeRevisionHash:v2RevisionHash(p),afterRevisionHash:v2RevisionHash(final),observed});}
}
await fs.writeFile(new URL('FINAL-LIST-COPYEDIT.json',here),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Only previously actually read spelling/spacing fixes in plain-list nodes; no sources, claims or schedule changes.',changes},null,2)+'\n');
console.log(JSON.stringify(changes));
