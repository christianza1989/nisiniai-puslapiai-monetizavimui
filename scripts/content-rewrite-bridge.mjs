import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export const sha256=value=>createHash('sha256').update(value).digest('hex');
const END='--- PABAIGA ---';
const complete=text=>text.trimEnd().endsWith(END);
const checks=['facts','core','links','language'];
export function taskText(job,number) {
 const p=job.snapshot;
 const marked=job.selection?.ranges?job.selection.ranges.map((r,i)=>`Dalis ${i+1} (${r.from}):\n${r.quote}`).join('\n\n'):job.selection?.quote;
 const rules=(job.rules||[]).map(r=>`- Nenaudoti „${r.term}“ (ieškomas žodis arba jo dalis). Roko pastaba: ${r.instruction}`).join('\n');
 const body=p.body.map(b=>b.type==='heading'?'#'.repeat(b.level)+' '+b.text:b.type==='list'?b.items.map(t=>'- '+t).join('\n'):b.type==='image'?`[Esamas vaizdas: ${b.assetId}; išsaugoti]`:b.text).join('\n\n');
 return `Užduotis ${number}\nPerrašyk pagal NE-AI-RASYMAS.\nSvetainė: promedical.lt, kalba medicininių baldų ir įrangos tiekėjas.\nRūšis: ${p.type==='guide'?'gidas':p.type==='product'?'produktas':'kategorija'}.\nPuslapis: /${p.slug}\nUžduoties ID: ${job.id}\nVersija: ${job.etag}\nApimtis: ${job.mode==='selection'?'tik pažymėta dalis':'visas tekstas'}\n\nRoko pastaba (duomenys šiai užduočiai):\n${job.note||'Papildomos pastabos nėra.'}\n\n${job.selection?`Pažymėta dalis:\n${marked}\n\n`:''}${rules?`Svetainės taisyklės, taikomos ir šiam atsakymui:\n${rules}\n\n`:''}Faktai: tik iš toliau pateikto esamo teksto ir jo šaltinių. Naujų faktų nepridėk. Naudą rašyk tik tada, kai ji tiesiogiai išplaukia iš fakto.\n\nEsamas pavadinimas: ${p.title}\nEsamas meta aprašymas: ${p.description}\n\nEsamas tekstas:\n${body}\n\nŠaltiniai:\n${(p.externalLinks||[]).map(l=>`${l.label}: ${l.url} — ${l.reason}`).join('\n')||'Papildomų šaltinių nėra.'}\n\nGrąžink: ${job.selection?.ranges?'JSON masyvą su po vieną pakaitinio teksto eilutę kiekvienai sunumeruotai daliai ta pačia tvarka. Nekeisk kitų laukų ir nesujunk antraščių su pastraipomis. Kiekvienas elementas – paprastas tekstas be Markdown žymėjimo.':job.mode==='selection'?'tik pažymėtos dalies pakaitinį tekstą, nekeisk likusio teksto; nenaudok Markdown antraščių ar sąrašų žymėjimo.':'pavadinimą, meta aprašymą iki 155 simbolių ir tekstą Markdown be H1. Išsaugok esamų vaizdų žymas.'}\nPirma eilutė: Atsakymas į: ${number}\nAntra eilutė: Modelis: <modelis>\nAtsakymą užbaik --- PABAIGA ---.\n\n${END}\n`;
}
export async function readComplete(filename) {
 try{const stat=await fs.stat(filename);if(stat.size>524288)throw Error('Failas viršija 512 KiB: '+path.basename(filename));const text=await fs.readFile(filename,'utf8');return complete(text)?text:null;}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
async function durableNew(filename,text) {
 let handle;try{handle=await fs.open(filename,'wx');await handle.writeFile(text);await handle.sync();}
 catch(e){if(e.code!=='EEXIST')throw e;const prior=await fs.readFile(filename,'utf8');if(prior===text)return;
  // Only resume an incomplete prefix of our deterministic file, never a foreign answer.
  if(complete(prior)||!text.startsWith(prior))throw Error('Failo konfliktas: '+path.basename(filename));
  handle=await fs.open(filename,'a');await handle.writeFile(text.slice(prior.length));await handle.sync();
 }finally{await handle?.close();}
}
export function openState(filename){
 const db=new DatabaseSync(filename);db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,number INTEGER UNIQUE NOT NULL,job_json TEXT NOT NULL,task_text TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'exporting',receipt_json TEXT);
 CREATE TABLE IF NOT EXISTS notices(key TEXT PRIMARY KEY,text TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending');`);return db;
}
// The non-AI bridge never decides whether facts are correct. Codex records its
// completed review as an exact candidate; Claude explicitly approves those bytes.
export function reviewedPayload(job,number,answer,codexText,claudeText){
 if(!complete(answer)||!answer.replace(/\r\n/g,'\n').startsWith(`Atsakymas į: ${number}\nModelis:`))throw Error('Atsakymo antraštė arba pabaiga netinkama.');
 if(!complete(claudeText))throw Error('Claude patvirtinimas nebaigtas.');
 let review;try{review=JSON.parse(codexText)}catch{throw Error('Codex patikros JSON netinkamas.');}
 const answerHash=sha256(answer),codexHash=sha256(codexText);
 if(review.jobId!==job.id||review.etag!==job.etag||review.answerSha256!==answerHash||review.reviewer!=='Codex'||review.verdict!=='PASS'||!checks.every(k=>review.checks?.[k]===true)||!review.evidence?.trim())throw Error('Trūksta šio atsakymo faktų ir Core patikros.');
 const lines=claudeText.replace(/\r\n/g,'\n').split('\n');
 for(const line of [`Atsakymas į: ${number}`,`Užduotis: ${job.id}`,`Atsakymo SHA256: ${answerHash}`,`Codex patikros SHA256: ${codexHash}`,'Patvirtino: Claude','Sprendimas: GERAI'])if(!lines.includes(line))throw Error('Claude patvirtinimas nesusietas su patikrintu atsakymu: '+line.split(':')[0]);
 if(!review.candidate||Object.keys(review.candidate).some(k=>!['changes','replacement'].includes(k)))throw Error('Netinkamas Codex patikrintas kandidatas.');
 return {etag:job.etag,...review.candidate,review:{answerSha256:answerHash,codexSha256:codexHash,claudeSha256:sha256(claudeText),codexReviewer:'Codex',claudeReviewer:'Claude',checks:review.checks}};
}
export async function runOnce({root,state,request,notify}){
 root=path.resolve(root);await fs.mkdir(path.dirname(state),{recursive:true});const db=openState(state),lock=state+'.lock';
 let owner;try{owner=await fs.open(lock,'wx')}catch(e){
  if(e.code!=='EEXIST'){db.close();throw e;}
  try{const original=await fs.readFile(lock,'utf8'),prior=JSON.parse(original);if(!Number.isInteger(prior.pid)||prior.pid<1)throw Error('Neaiškus bridge užraktas.');
   let dead=false;try{process.kill(prior.pid,0)}catch(err){if(err.code==='ESRCH')dead=true;else throw err;}
   if(!dead||await fs.readFile(lock,'utf8')!==original)throw Error('Bridge jau veikia.');
   await fs.unlink(lock);owner=await fs.open(lock,'wx');
  }catch(err){db.close();throw err;}
 }
 await owner.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
 const tasks=path.join(root,'uzduotys'),answers=path.join(root,'atsakymai'),reviews=path.join(root,'patikra');
 const result={exported:0,imported:0,waiting:0,blocked:[]};
 try{
  // Never manufacture the writer workspace on a missing/offline Drive mount.
  await fs.access(path.join(root,'RASYTOJAS.md'));await fs.access(tasks);await fs.access(answers);await fs.mkdir(reviews,{recursive:true});
  let after=0;
  for(let batches=0;batches<100;batches++){
   const data=await request('list',{after});if(!Array.isArray(data.items)||data.items.length>10)throw Error('Netinkamas eilės atsakymas.');
   for(const job of data.items){
    if(!/^[a-z0-9-]{16,80}$/.test(job.id)||job.snapshot?.siteId!=='promedical')throw Error('Netinkama užduotis arba svetainė.');
    let row=db.prepare('SELECT * FROM jobs WHERE id=?').get(job.id);
    if(!row){
     const names=[...await fs.readdir(tasks),...await fs.readdir(answers)];
     const maxFile=Math.max(0,...names.map(n=>Number(/^(\d+)-/.exec(n)?.[1]||0))),maxState=db.prepare('SELECT COALESCE(MAX(number),0) AS n FROM jobs').get().n;
     const n=Math.max(maxFile,maxState)+1,number=String(n).padStart(3,'0');
     const task=taskText(job,number);db.prepare('INSERT INTO jobs(id,number,job_json,task_text) VALUES(?,?,?,?)').run(job.id,n,JSON.stringify(job),task);row=db.prepare('SELECT * FROM jobs WHERE id=?').get(job.id);
    }
    if(row.state==='exporting'){
     await durableNew(path.join(tasks,`${String(row.number).padStart(3,'0')}-rewrite.md`),row.task_text);
     db.prepare("UPDATE jobs SET state='waiting' WHERE id=?").run(job.id);result.exported++;
    }
   }
   if(data.next===null)break;if(!Number.isSafeInteger(data.next)||data.next<=after)throw Error('Eilės žymeklis nejuda pirmyn.');after=data.next;
  }
  for(const row of db.prepare("SELECT * FROM jobs WHERE state='waiting' ORDER BY number").all()){
   const number=String(row.number).padStart(3,'0'),job=JSON.parse(row.job_json);
   try{
    const answer=await readComplete(path.join(answers,`${number}-atsakymas.md`));if(!answer){result.waiting++;continue;}
    const key=`review:${job.id}:${sha256(answer)}`,notice=`Užduotis ${number}, ID ${job.id}: atsakymas paruoštas Codex faktų ir Core patikrai.\nAtsakymo SHA256: ${sha256(answer)}\nJokio automatinio turinio patvirtinimo.\n${END}\n`;
    db.prepare('INSERT OR IGNORE INTO notices(key,text) VALUES(?,?)').run(key,notice);
    await durableNew(path.join(reviews,`${number}-${sha256(answer).slice(0,12)}-reikia-patikros.md`),notice);
    let codex;try{const filename=path.join(reviews,`${number}-codex.json`);if((await fs.stat(filename)).size>524288)throw Error('Codex patikra viršija 512 KiB.');codex=await fs.readFile(filename,'utf8')}catch(e){if(e.code==='ENOENT'){result.waiting++;continue}throw e;}
    const approved=await readComplete(path.join(answers,`${number}-patvirtinta.md`));if(!approved){result.waiting++;continue;}
    const payload=reviewedPayload(job,number,answer,codex,approved);
    const current=await request(`${job.id}/status`,{});if(current.state==='superseded')throw Error('Užduotį pakeitė naujesnis Roko prašymas.');
    // Recheck bytes immediately before submission; the server also verifies the
    // current revision and atomically commits the draft plus idempotency receipt.
    if(await fs.readFile(path.join(answers,`${number}-atsakymas.md`),'utf8')!==answer||await fs.readFile(path.join(reviews,`${number}-codex.json`),'utf8')!==codex||await fs.readFile(path.join(answers,`${number}-patvirtinta.md`),'utf8')!==approved)throw Error('Per patikrą pasikeitė atsakymo failai.');
    const receipt=await request(`${job.id}/draft`,payload);
    if(receipt.id!==job.id||receipt.state!=='drafted')throw Error('Neaiškus juodraščio įkėlimo kvitas.');
    db.prepare("UPDATE jobs SET state='imported',receipt_json=? WHERE id=?").run(JSON.stringify(receipt),job.id);
    result.imported++;
   }catch(e){result.blocked.push({number,error:e.message});}
  }
  // Rebuild a missing file receipt after a crash following the DB commit.
  for(const row of db.prepare("SELECT * FROM jobs WHERE state='imported'").all()){
   const receipt=JSON.parse(row.receipt_json),number=String(row.number).padStart(3,'0');
   await durableNew(path.join(reviews,`${number}-ikelta.md`),`Užduotis: ${row.id}\nJuodraštis įkeltas. Viešas tekstas nepakeistas.\nVersija: ${receipt.etag}\n${END}\n`);
  }
  const pending=db.prepare("SELECT * FROM notices WHERE state='pending'").all();
  if(notify&&pending.length){
   // Mark before dispatch. An uncertain queue result must not wake this chat on
   // every minute tick; the durable review notices remain available for recovery.
   db.prepare("UPDATE notices SET state='dispatching' WHERE state='pending'").run();
   try{await notify(pending.map(n=>n.text).join('\n'));for(const n of pending)db.prepare("UPDATE notices SET state='sent' WHERE key=? AND state='dispatching'").run(n.key);}
   catch{result.blocked.push({number:'pranešimas',error:'Codex pranešimo rezultatas neaiškus; nekartojamas. Patikrinkite patikra/ pranešimus ir vietinę notices lentelę.'});}
  }
  return result;
 }finally{db.close();await owner.close();await fs.unlink(lock);}
}
export function bridgeRequest(origin,key,fetcher=fetch){
 if(origin!=='https://promedical.lt'||!/^[A-Za-z0-9_-]{43}$/.test(key||''))throw Error('Reikia https://promedical.lt ir atskiro rewrite bridge rakto iš aplinkos.');
 return async (route,input)=>{
  if(!/^(list|[a-z0-9-]{16,80}\/(status|draft))$/.test(route))throw Error('Neleidžiamas bridge veiksmas.');
  const r=await fetcher(origin+'/admin/api/rewrite-bridge/'+route,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(input)});
  if(!r.ok)throw Error(`Rewrite bridge HTTP ${r.status}; užduotis palikta pakartojimui.`);
  const reader=r.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8388608){await reader.cancel();throw Error('Per didelis eilės atsakymas.');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 };
}
async function main(){
 const configPath=process.argv[2];if(!configPath)throw Error('Naudojimas: node scripts/content-rewrite-bridge.mjs D:/Core/.../private-config.json');
 const config=JSON.parse(await fs.readFile(configPath,'utf8'));
 if(config.enabled!==true)throw Error('Bridge neaktyvus. Įjungti tik gavus diegimo leidimą.');
 const notify=config.codexJs&&config.threadId?async message=>{
  if(!/^[a-f0-9-]{36}$/.test(config.threadId)||!path.isAbsolute(config.codexJs))throw Error('Netinkama Codex pranešimo konfigūracija.');
  const r=spawnSync(process.execPath,[config.codexJs,'queue','--thread',config.threadId,'--message',`TX-GEM failų tiltas: paruošti atsakymai. Perskaityk savo kanalo taisykles, patikrink faktus ir Core reikalavimus. Tai ne Roko sprendimas ir ne publikavimo leidimas.\nAplankas: ${config.root}\n${message}`],{windowsHide:true,timeout:45000,maxBuffer:65536});
  if(r.error||r.status!==0)throw Error('Neaiškus Codex queue rezultatas.');
 }:undefined;
 const result=await runOnce({...config,notify,request:bridgeRequest(config.origin,process.env.CONTENT_REWRITE_BRIDGE_TOKEN)});
 console.log(JSON.stringify({...result,at:new Date().toISOString()}));if(result.blocked.length)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
