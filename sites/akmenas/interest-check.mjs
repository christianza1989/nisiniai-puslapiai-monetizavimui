import assert from 'node:assert/strict';
import {request} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const cwd=path.resolve(import.meta.dirname,'../../output/akmenas-production'),base='http://127.0.0.1:8886';
const run=promisify(execFile),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function sql(command){const{stdout}=await run(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--command',command,'--json'],{cwd,maxBuffer:512000});return JSON.parse(stdout).flatMap(v=>v.results||[]);}
const filter=`site_id='akmenas' AND day='${day}' AND page_path='/redakcija' AND event='email_click'`;
async function count(){return (await sql(`SELECT count FROM niche_interest_daily WHERE ${filter}`))[0]?.count??0;}
const before=await count();
function post(body,headers={}){return new Promise((resolve,reject)=>{const req=request(base+'/ivykius',{method:'POST',agent:false,headers:{origin:base,'content-type':'application/json','user-agent':'AKMENAS_AUDIT_SELF_TEST','content-length':Buffer.byteLength(body),...headers}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode));});req.on('error',reject);req.end(body);});}
const payload=JSON.stringify({event:'email_click',path:'/redakcija'}),checks={};
for(const[key,body,headers,status]of[['dnt',payload,{dnt:'1'},204],['gpc',payload,{'sec-gpc':'1'},204],['bot',payload,{'user-agent':'Lighthouse Headless Audit'},204],['foreignOrigin',payload,{origin:'https://outside.invalid'},403],['futurePath',JSON.stringify({event:'pageview',path:'/gidas/stalvirsio-pasiulymo-apimtis'}),{},404],['size','x'.repeat(600),{},413],['invalidEvent',JSON.stringify({event:'purchase',path:'/redakcija'}),{},400],['unknownHost','',{host:'unknown.example'},404]]){checks[key]=await post(body,headers);assert.equal(checks[key],status,key);}
assert.equal(await count(),before,'privacy exclusions must not store events');
checks.accepted=await post(payload);assert.equal(checks.accepted,204);assert.equal(await count(),before+1,'per-site stored count');
if(before)await sql(`UPDATE niche_interest_daily SET count=${before} WHERE ${filter}`);else await sql(`DELETE FROM niche_interest_daily WHERE ${filter} AND count=1`);
assert.equal(await count(),before);
const evidence={at:new Date().toISOString(),base,siteId:'akmenas',synthetic:true,checks,privacyExclusionsDidNotStore:true,perSiteIncrement:true,testCountRestored:true,fields:['site_id','day','page_path','event','count'],noVisitorIdentifier:true,warning:'Browser QA and local totals are synthetic, not real demand.'};
await writeFile(path.join(import.meta.dirname,'INTEREST-VERIFICATION.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
