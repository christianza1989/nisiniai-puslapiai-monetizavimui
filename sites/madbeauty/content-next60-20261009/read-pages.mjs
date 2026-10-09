import fs from 'node:fs/promises';
import {bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',import.meta.url),'utf8'));
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8'));
const start=Number(process.argv[2]||1),count=Number(process.argv[3]||5);
for(const item of sel.pages.slice(start-1,start-1+count)){const p=site.pages.find(x=>x.id===item.pageId);const record={planId:item.planId,title:p.title,description:p.description,authors:p.editorial?.authors,publishAt:p.publishAt,words:bodyPlainText(p.body).split(/\s+/).filter(Boolean).length,body:process.argv.includes('--plain')||process.argv.includes('--body-only')?bodyPlainText(p.body):p.body,factChecks:p.factChecks,sources:p.editorial?.sources,model:p.generatedDraft?.generationReceipt?.observed};if(process.argv.includes('--body-only')){delete record.authors;delete record.sources;}console.log(JSON.stringify(record,null,2));}
