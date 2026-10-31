import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const [runtime,evidence,base='http://127.0.0.1:8918']=process.argv.slice(2);
if(process.env.KVAPU_QA_MAIL_DISABLED!=='1')throw Error('This verifier submits several valid forms. Restart the own runtime with LEAD_SMTP_ENABLED:0 and no native email binding, then explicitly set KVAPU_QA_MAIL_DISABLED=1. No request was submitted.');
if(!runtime||!evidence||new URL(base).hostname!=='127.0.0.1')throw Error('Local QA requires explicit own runtime, evidence and loopback base.');
const directory=path.join(runtime,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const files=(await readdir(directory)).filter(n=>n.endsWith('.sqlite')&&n!=='metadata.sqlite');
const databases=files.map(n=>new DatabaseSync(path.join(directory,n)));
const leadDbs=databases.filter(d=>d.prepare("SELECT name FROM sqlite_master WHERE name='niche_leads'").get());
assert.ok(leadDbs.length,'The isolated DB migration must exist');
const marker='KVAPU-LOCAL-QA-'+crypto.randomUUID(),checks=[];
const defaults={name:marker,contact_method:'phone',phone:'+37060000000',email:'',message:'Vietinis sintetinis bandymas.',consent:'yes'};
async function submit(label,patch,status,headers={}){
 const r=await fetch(base+'/uzklausa',{method:'POST',headers:{Origin:base,Referer:base+'/patalpu-kvapu-naikinimas',...headers},body:new URLSearchParams({...defaults,...patch})});
 const body=await r.text();assert.equal(r.status,status,label+': '+body.slice(0,150));checks.push({label,status:r.status});return body;
}
try{
 assert.match(await submit('phone without email',{},200),/tikras el. laiškas neišsiųstas/);
 assert.match(await submit('email without phone',{contact_method:'email',phone:'',email:'fixture@example.invalid'},200),/tikras el. laiškas neišsiųstas/);
 await submit('missing preferred phone',{phone:''},400);
 await submit('missing preferred email',{contact_method:'email',email:''},400);
 await submit('invalid optional email',{email:'not-an-email'},400);
 await submit('missing notice acknowledgement',{consent:''},400);
 await submit('cross origin rejected',{},403,{Origin:'https://unrelated.example'});
 await submit('honeypot ignored',{website:'https://bot.example'},200);
 await submit('3000 Lithuanian characters accepted',{message:'ą'.repeat(3000)},200);
 const rows=leadDbs.flatMap(db=>db.prepare('SELECT email,message,source_path,status FROM niche_leads WHERE site_id=? AND name=? ORDER BY created_at').all('kvapunaikinimas',marker));
 assert.equal(rows.length,3,'Only three valid submissions are durably stored');
 assert.equal(rows.filter(r=>r.email==='').length,2,'Phone inquiries retain no invented email');
 assert.ok(rows.every(r=>r.source_path==='/patalpu-kvapu-naikinimas'&&r.status==='new'));
 assert.ok(rows.some(r=>r.message.includes('ą'.repeat(3000))));
 checks.push({label:'durable storage and requested callback details',rows:rows.length,realMailSent:false});
 for(const old of ['/sitemap_index.xml','/page-sitemap.xml']){const r=await fetch(base+old,{redirect:'manual'});assert.equal(r.status,301);assert.equal(new URL(r.headers.get('location'),base).href,base+'/sitemap.xml');checks.push({label:old,status:r.status,location:r.headers.get('location')});}
 const slash=await fetch(base+'/patalpu-kvapu-naikinimas/',{redirect:'manual'});assert.equal(slash.status,308);assert.equal(new URL(slash.headers.get('location'),base).pathname,'/patalpu-kvapu-naikinimas');checks.push({label:'old trailing slash URL has one permanent redirect',status:308});
 for(const p of ['/__missing_page__','/niche/kvapunaikinimas']){const r=await fetch(base+p);assert.equal(r.status,404);assert.ok(!(await r.text()).includes('rel="canonical"'));checks.push({label:p,status:404});}
 const home=await fetch(base);assert.match(home.headers.get('x-robots-tag')||'',/noindex/);
 assert.equal(home.headers.get('set-cookie'),null);checks.push({label:'preview noindex and no response cookie',status:200});
 const full=await (await fetch(base+'/llms-full.txt')).text();assert.ok(full.includes('Pagrindiniai ozonavimo privalumai:'));checks.push({label:'LLMS export includes native homepage body',status:200});
 await writeFile(evidence,JSON.stringify({status:'PASS',at:new Date().toISOString(),base,checks,productionDeliveryVerified:false,syntheticRowsRemoved:true},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',checks:checks.length,syntheticRows:rows.length,evidence}));
}finally{for(const db of leadDbs)db.prepare('DELETE FROM niche_leads WHERE site_id=? AND name=?').run('kvapunaikinimas',marker);for(const d of databases)d.close();}
