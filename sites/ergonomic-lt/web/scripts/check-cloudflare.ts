import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID,createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {baseSeed,productPath} from '../src/lib/catalog';
import {families,initialState,expandedSelection,stateToken} from '../src/lib/expanded-configurator';

const base=process.env.CHECK_ORIGIN||'http://127.0.0.1:3004';
const origin='https://ergonomic-preview.pinet-azprekyba.workers.dev';
const secrets=JSON.parse(readFileSync('.cloudflare-secrets.json','utf8'));
const body=String(Date.now()+3600_000),cookie='ergonomic_admin='+body+'.'+createHmac('sha256',secrets.SESSION_SECRET).update(body).digest('hex');
const results:{model:string;page:number;pdfBytes:number}[]=[];
const password=readFileSync('.cloudflare-admin.txt','utf8').match(/Slaptažodis: ([^\r\n]+)/)![1];
const login=await fetch(base+'/api/admin/login/',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({password})});
assert.equal(login.status,200,'Administratorius neprisijungia');assert(login.headers.get('set-cookie')?.includes('HttpOnly'));assert(login.headers.get('set-cookie')?.includes('Secure'));
const products=baseSeed().products;
let quoteState:ReturnType<typeof initialState>|undefined;
let quoteProduct:typeof products[number]|undefined;
for(const family of families){
  const p=products.find(p=>p.id===family.productId)!;
  const state=initialState(family);
  const page=await fetch(base+productPath(p));assert.equal(page.status,200);const html=await page.text();assert(!html.includes('Nepavyko įkelti puslapio.'));assert(html.includes(p.name));
  const pdf=await fetch(base+'/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(stateToken(state)));
  const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(pdf.status,200,`${p.name}: ${bytes.toString().slice(0,150)}`);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  results.push({model:p.name,page:page.status,pdfBytes:bytes.length});
  if(family.id==='xilium'){quoteState=state;quoteProduct=p;}
}
const selection=expandedSelection(quoteProduct!,quoteState!);
const payload={name:'[PATIKRA] Cloudflare diegimas',email:'cloudflare-qa-'+randomUUID()+'@example.invalid',phone:'',company:'Automatinė patikra',message:'Diegimo patikra – klientui nesiųsti.',
 items:[{productId:quoteProduct!.id,configurationId:selection.configuration.id,configurationState:quoteState,quantity:1,note:'Bandomasis įrašas'}],consent:true,submissionKey:randomUUID(),website:'',startedAt:Date.now()-5000};
const submit=(data:unknown,requestOrigin=origin)=>fetch(base+'/api/quotes/',{method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin},body:JSON.stringify(data)});
assert.equal((await submit(payload,'https://wrong.example.invalid')).status,403);
const quotes=await Promise.all([submit(payload),submit(payload),submit(payload)]);
const statuses=quotes.map(r=>r.status).sort();assert.deepEqual(statuses,[200,200,201]);
const ids=await Promise.all(quotes.map(async r=>(await r.json() as {id:string}).id));assert.equal(new Set(ids).size,1);
const admin=await fetch(base+'/admin/uzklausos/',{headers:{Cookie:cookie}});assert.equal(admin.status,200);const adminHtml=await admin.text();assert(adminHtml.includes(ids[0]),'D1 įrašas nematomas administravime');assert(!adminHtml.includes('Nepavyko įkelti puslapio.'));
assert.equal((await fetch(base+'/api/admin/quotes/'+ids[0]+'/',{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'status',status:'done'})})).status,401);
const changed=await fetch(base+'/api/admin/quotes/'+ids[0]+'/',{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify({action:'status',status:'done'})});assert.equal(changed.status,200);
const invalid=await submit({...payload,submissionKey:randomUUID(),items:[{...payload.items[0],configurationState:{...quoteState,values:{...quoteState!.values,CBASE:'FAKE'}}}]});assert.equal(invalid.status,400);
const repeat=await fetch(base+'/api/admin/quotes/'+ids[0]+'/',{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify({action:'retry'})});assert.equal(repeat.status,200);assert.equal((await repeat.json() as {delivery:string}).delivery,'awaiting_configuration');
const result={checkedAt:new Date().toISOString(),origin:base,models:results,quotes:{concurrentSubmissionStatuses:statuses,id:ids[0],durableRecordVisible:true,statusUpdate:true,smtp:'awaiting_configuration'},security:{crossOrigin:403,unauthenticatedAdmin:401,forgedConfiguration:400}};
mkdirSync('.impeccable/review/cloudflare',{recursive:true});writeFileSync('.impeccable/review/cloudflare/'+(base.startsWith('https:')?'remote':'local')+'-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
