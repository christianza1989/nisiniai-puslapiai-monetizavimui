import fs from 'node:fs/promises';
import {v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8'));
const input=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
let rows=[];try{rows=JSON.parse(await fs.readFile(new URL('REVISED-TEXT-OBSERVATIONS.json',here),'utf8'));}catch{}
for(const n of input){const item=sel.pages.find(i=>i.planId===n.planId),p=site.pages.find(p=>p.id===item.pageId);rows.push({...n,pageId:p.id,revisionHash:v2RevisionHash(p),observedAt:new Date().toISOString(),state:'ACTUAL_COMPLETE_REVISED_BODY_READ_NOT_FINAL_APPROVAL'});}
await fs.writeFile(new URL('REVISED-TEXT-OBSERVATIONS.json',here),JSON.stringify(rows,null,2)+'\n');
console.log({recorded:input.length,total:rows.length});
