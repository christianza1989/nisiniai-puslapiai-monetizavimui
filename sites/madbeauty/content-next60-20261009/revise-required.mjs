import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {bodyPlainText,v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const primary='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui';
const {getSite,listJobs,editPage}=await import('file:///'+primary+'/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer still active');
const initial=await getSite('madbeauty');if(sel.pages.some(i=>!initial.pages.find(p=>p.id===i.pageId).body.length))throw Error('Finish all60 first');
const plan=JSON.parse(await fs.readFile(new URL('REVISION-PLAN.json',here),'utf8')),ledger=JSON.parse(await fs.readFile(new URL('SOURCE-NOTES.json',here),'utf8'));
let records=[];try{records=JSON.parse(await fs.readFile(new URL('REVISION-RECEIPTS.json',here),'utf8'));}catch{}
await fs.mkdir(new URL('revision-requests/',here),{recursive:true});
for(const item of sel.pages){
 let p=(await getSite('madbeauty')).pages.find(p=>p.id===item.pageId),specific=plan[item.planId];
 if(records.some(r=>r.planId===item.planId))continue;
 const language=/[\u0400-\u04ff]|\[[^\]]+\]\(https?:[^)]+\)/.test(bodyPlainText(p.body));if(!specific&&!language)continue;
 const additions=(specific?.sources||[]).map(id=>{const s=ledger.find(s=>s.id===id);if(s?.review!=='READ_FOR_BOUNDED_CLAIMS')throw Error('Source unread '+id);return s;});
 const existing=p.editorial.sources;
 await editPage('madbeauty',p.id,{editorial:{...p.editorial,sources:[...existing,...additions.filter(s=>!existing.some(x=>x.id===s.id&&x.url===s.url)).map(s=>({id:s.id,title:s.title,publisher:new URL(s.url).hostname,url:s.url,accessedAt:s.retrievedAt,public:true}))]},externalLinks:[...p.externalLinks.map(l=>({...l,reason:ledger.find(s=>s.url===l.url)?.note||l.reason})),...additions.filter(s=>!p.externalLinks.some(x=>x.url===s.url)).map(s=>({url:s.url,label:s.title,reason:s.note,verified:true}))]});
 p=(await getSite('madbeauty')).pages.find(x=>x.id===p.id);
 const instruction='Atlik konkrečią redakcinę pataisą tam pačiam straipsniui, išlaikyk tikslų reader job ir originalią praktinę naudą. Savininko Madbeauty EDITORIAL_POLICY: autonominė faktinė agento patikra, neprivaloma žmogaus specialisto parašo priklausomybė; neišgalvok žmogaus ekspertizės, peržiūros, publikavimo ar ateity atliktos patikros. Šaltiniai realiai perskaityti tik jų reason įvardytoje apimtyje. Viešame tekste neturi būti tyrimo juodraščio scaffold ar redaktoriui skirtų vartų; factChecks tik konkrečioms tikrai nepatikrintoms viešoms pretenzijoms. STRICT: inline external URL tik iš exact separately verified externalLinks; inline page target tik jau publishedRevisionapproved UUID. Naujos60partijos arba unknown temos tik internalLinks suggestions su exact providedID. Jokio papildomo neištirtoURL. Visas tekstas natūralia LT be kirilicos/rawMarkdownURL; URL realiais typed rich link mazgais. Neiškraipyk meniu apimčių ir kainų vienetų, nevartok universalių protokolų, efektyvumo ar saugumo garantijų. '+(specific?.instruction||'Ištaisyk svetimakalbius žodžius ir rawMarkdownURL, išlaikyk teisingą faktinį turinį.');
 const requestFile=new URL('revision-requests/'+item.planId+'.json',here).pathname.replace(/^\/(?:([A-Z]:))/,'$1');
 const exactUrls=p.externalLinks.filter(l=>l.verified).map(l=>l.url);
 await fs.writeFile(requestFile,JSON.stringify({expectedRevisionHash:v2RevisionHash(p),editorialInstruction:instruction+' EXACT ALLOWED EXTERNAL URL STRINGS: '+JSON.stringify(exactUrls)+'. Kopijuok pasirinktą URL pažodžiui iš šio sąrašo. Netrumpink žodžių, nekeisk slug, galūnių ar brūkšnių. Prieš pateikdamas patikrink visus savo target.kind external URL pagal exact sąrašą. Nevartok svetimų rašmenų ar žodžių lietuviškuose sakiniuose.'},null,2)+'\n');
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,[primary+'/content-studio/scripts/revise-page.mjs','madbeauty',p.id,requestFile],{env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});c.stdout.pipe(process.stdout);c.stderr.pipe(process.stderr);c.on('error',reject);c.on('exit',resolve);});if(code!==0)throw Error('Revision failed '+item.planId);
 p=(await getSite('madbeauty')).pages.find(x=>x.id===p.id);
 const job=(await listJobs()).findLast(j=>j.pageId===p.id&&j.type==='revise'&&j.status==='complete');
 const receipt=job?.lastGenerationReceipt;
 if(receipt?.observed?.model!=='gpt-6-luna'||receipt?.observed?.reasoningEffort!=='xhigh'||receipt.execution!=='CODEX_CLI'||receipt.fallback!==false)throw Error('Actual native Luna revision receipt missing '+item.planId);
 records.push({planId:item.planId,completedAt:new Date().toISOString(),revisionHash:v2RevisionHash(p),generationReceipt:receipt,jobId:job.id,requestFile,state:'REVISED_REQUIRES_FULL_TEXT_REVIEW'});
 await fs.writeFile(new URL('REVISION-RECEIPTS.json',here),JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify({planId:item.planId,state:'revised-by-native-Luna-xhigh'}));
}
