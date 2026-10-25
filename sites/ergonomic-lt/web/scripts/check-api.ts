import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {parseHTML} from 'linkedom';
async function main(){
const base=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const seed=JSON.parse(readFileSync('content/seed.json','utf8'));
const p=seed.products.find((p:any)=>p.configurations.length>0);
const db=new DatabaseSync('.runtime-qa/ergonomic.sqlite');
let cookie='';
async function send(url:string,method:string,data:unknown,origin=base,authenticated=true){return fetch(base+url,{method,headers:{'Content-Type':'application/json',Origin:origin,...(authenticated&&cookie?{Cookie:cookie}:{})},body:JSON.stringify(data),redirect:'manual'});}
const unauthorized=await send('/api/admin/import/','POST',{},base,false);assert.equal(unauthorized.status,401);
const privatePage=await fetch(base+'/admin/uzklausos/',{redirect:'manual'});assert.equal(privatePage.status,307);
const password=readFileSync('.local-admin.txt','utf8').match(/Slaptažodis: (.+)/)![1].trim();
assert.equal((await send('/api/admin/login/','POST',{password},'https://evil.invalid')).status,403);
assert.equal((await send('/api/admin/login/','POST',{password:'incorrect'})).status,401);
const login=await send('/api/admin/login/','POST',{password});assert.equal(login.status,200);const rawCookie=login.headers.get('set-cookie')!;assert(rawCookie.includes('HttpOnly')&&rawCookie.includes('SameSite=strict'));cookie=rawCookie.split(';')[0];
const dashboard=await fetch(base+'/admin/',{headers:{Cookie:cookie}});assert.equal(dashboard.status,200);assert((await dashboard.text()).includes('Atnaujinti tiekėjo katalogą'));
const input={name:'[PATIKRA] Klientas',email:'qa@example.invalid',phone:'',company:'Testinė',message:'Patikros įrašas vietinėje QA bazėje.',items:[{productId:p.id,configurationId:p.configurations[0].id,quantity:3,note:'[PATIKRA]'}],consent:true,website:'',startedAt:Date.now()-5000,submissionKey:randomUUID()};
assert.equal((await send('/api/quotes/','POST',input,'https://evil.invalid')).status,403);
assert.equal((await send('/api/quotes/','POST',{...input,consent:false})).status,400);
const first=await send('/api/quotes/','POST',input);assert.equal(first.status,201);const record=await first.json();
const second=await send('/api/quotes/','POST',input);assert.equal(second.status,200);assert.equal((await second.json()).id,record.id);
const saved=db.prepare('SELECT payload FROM quotes WHERE id=?').get(record.id) as {payload:string};const items=JSON.parse(saved.payload).items;assert.equal(items[0].quantity,3);assert.equal(items[0].configurationId,p.configurations[0].id);assert.equal(items[0].productName,p.name);
const update=await send('/api/admin/quotes/'+record.id+'/','PATCH',{action:'status',status:'in_progress'});assert.equal(update.status,200);
const retry=await send('/api/admin/quotes/'+record.id+'/','PATCH',{action:'retry'});assert.equal((await retry.json()).delivery,'awaiting_configuration');
const raw=JSON.parse(readFileSync('../data/nextjs_catalog.json','utf8'));
const edited={name:p.name,description:'[PATIKRA] Lietuviškas tekstas, išlaikomas pakartotiniu importu.',gallery:p.gallery.slice(0,3),documents:p.documents,published:false,translationReviewed:true};
assert.equal((await send('/api/admin/products/'+p.id+'/','PATCH',{...edited,published:true,translationReviewed:false})).status,400);
assert.equal((await send('/api/admin/products/'+p.id+'/','PATCH',edited)).status,200);
const imported=await send('/api/admin/import/','POST',raw);assert.equal(imported.status,200);assert.equal((await imported.json()).products,255);
const row=db.prepare('SELECT data FROM product_edits WHERE id=?').get(p.id) as {data:string};assert.equal(JSON.parse(row.data).description,edited.description);
// Remove only this test's product override. Quotes stay visible in the QA database.
db.prepare('DELETE FROM product_edits WHERE id=?').run(p.id);
const result={checkedAt:new Date().toISOString(),unauthorized:401,privatePage:307,crossOrigin:403,login:true,secureCookieFlags:true,formValidation:true,persistentQuote:true,idempotent:true,variantAndQuantity:true,statusUpdate:true,retryWithoutSmtp:'awaiting_configuration',publishGuard:true,importCount:255,localEditsPreserved:true};
writeFileSync('.impeccable/review/api-check.json',JSON.stringify(result,null,2));db.close();console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
