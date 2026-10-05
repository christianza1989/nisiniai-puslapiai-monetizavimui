import assert from 'node:assert/strict';
import {request} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const root='C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-production';
const base='http://127.0.0.1:8786',siteId='laiptucentras',source='/laiptu-matavimas',name=`AUDIT-${randomUUID()}`;
const config=JSON.parse(await readFile(root+'/dist/server/wrangler.json','utf8'));
assert.ok(!config.send_email?.length);assert.ok(!Object.keys(config.vars??{}).some(k=>/PASSWORD|SECRET|TOKEN/.test(k)));
const run=promisify(execFile);
async function sql(command){const {stdout}=await run(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--command',command,'--json'],{cwd:root,maxBuffer:512000});return JSON.parse(stdout).flatMap(x=>x.results??[]);}
function post(path,body,extra={},chunked=false){return new Promise((resolve,reject)=>{const req=request(new URL(path,base),{method:'POST',agent:false,headers:{origin:base,referer:base+source,'content-type':'application/x-www-form-urlencoded','user-agent':'Mozilla/5.0 LocalAcceptance',...(chunked?{'transfer-encoding':'chunked'}:{'content-length':Buffer.byteLength(body)}),...extra}},res=>{let text='';res.setEncoding('utf8');res.on('data',x=>text+=x);res.on('end',()=>resolve({status:res.statusCode,text,headers:res.headers}));});req.on('error',reject);if(chunked){req.write(body.slice(0,6000));req.end(body.slice(6000));}else req.end(body);});}
const valid=new URLSearchParams({name,email:'audit@example.invalid',message:'AUDIT_SELF_TEST; vidaus laiptų poreikio sintetinis vietinis bandymas.',consent:'yes',website:''}).toString(),checks={};
for(const [key,body,extra,chunked,expected] of [
 ['shortName',new URLSearchParams({name:'A',email:'audit@example.invalid',message:'Pakankamai ilgas sintetinis tekstas',consent:'yes'}).toString(),{},false,400],
 ['email',valid.replace('audit%40example.invalid','invalid'),{},false,400],
 ['consent',valid.replace('consent=yes','consent='),{},false,400],
 ['origin',valid,{origin:'https://outside.invalid'},false,403],
 ['size','x='.padEnd(10010,'a'),{},false,400],
 ['chunkedSize','x='.padEnd(10010,'a'),{},true,400],
 ['honeypot',valid.replace('website=','website=bot'),{},false,200],
 ['unknownHost','',{host:'unknown-domain.example'},false,404]]){checks[key]=(await post('/uzklausa',body,extra,chunked)).status;assert.equal(checks[key],expected,key);}
const accepted=await post('/uzklausa',valid);assert.equal(accepted.status,200);assert.match(accepted.text,/tik šiame kompiuteryje/);checks.accepted=200;
const rows=await sql(`SELECT id,site_id,source_path,status FROM niche_leads WHERE name='${name}' AND site_id='${siteId}'`);assert.equal(rows.length,1);assert.equal(rows[0].source_path,source);assert.equal(rows[0].status,'new');assert.match(rows[0].id,/^[a-f0-9-]{36}$/);
await sql(`DELETE FROM niche_leads WHERE id='${rows[0].id}' AND name='${name}' AND site_id='${siteId}'`);assert.equal((await sql(`SELECT COUNT(*) AS n FROM niche_leads WHERE name='${name}' AND site_id='${siteId}'`))[0].n,0);
const counter=async()=>Number((await sql(`SELECT COALESCE(SUM(count),0) AS n FROM niche_interest_daily WHERE site_id='${siteId}' AND page_path='${source}'`))[0].n);
const start=await counter(),event=JSON.stringify({event:'pageview',path:source}),json={'content-type':'application/json'};
for(const [key,extra] of [['dnt',{dnt:'1'}],['gpc',{'sec-gpc':'1'}],['bot',{'user-agent':'Lighthouse bot'}]]){checks[key]=(await post('/ivykius',event,{...json,...extra})).status;assert.equal(checks[key],204);}
assert.equal(await counter(),start);
checks.eventAccepted=(await post('/ivykius',event,json)).status;assert.equal(checks.eventAccepted,204);assert.equal(await counter(),start+1);
checks.eventOrigin=(await post('/ivykius',event,{...json,origin:'https://outside.invalid'})).status;assert.equal(checks.eventOrigin,403);
checks.privateEvent=(await post('/ivykius',JSON.stringify({event:'pageview',path:'/laiptu-tureklu-planavimas'}),json)).status;assert.equal(checks.privateEvent,404);
checks.eventSize=(await post('/ivykius','x'.repeat(600),json)).status;assert.equal(checks.eventSize,413);
const result={at:new Date().toISOString(),siteId,synthetic:true,checks,durableStored:true,storedStatus:'new',sourcePath:source,smtpDisabled:true,noVoiceDependency:true,syntheticLeadRemoved:true,countersAreSyntheticLocalOnly:true,privacySignalsDidNotIncrement:true};
await writeFile(new URL('./qa/local-form-interest.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
