import fs from 'node:fs/promises';
import {bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8'));
for(const i of sel.pages){const p=site.pages.find(p=>p.id===i.pageId),text=bodyPlainText(p.body),foreign=[...text.matchAll(/.{0,35}[\u0400-\u04ff]+.{0,45}/gu)].map(m=>m[0]);if(process.argv.includes('--foreign-only')&&!foreign.length)continue;if(p.factChecks.length||foreign.length)console.log(JSON.stringify({planId:i.planId,factChecks:p.factChecks,foreign}));}
