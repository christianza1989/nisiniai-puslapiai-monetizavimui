import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url));
const core=path.resolve(process.env.PHONEBRIDGER_CORE_PATH||path.join(here,'../../../dovanos-memorycasting'));
const {phoneBridgerPreview}=await import(pathToFileURL(path.join(core,'scripts/phonebridger-preview.mjs')).href);

test('actual core plugin serves all attested pages/assets and isolates real local accounts',async()=>{
 const fixture=await mkdtemp(path.join(tmpdir(),'phonebridger-core-account-test-'));
 const previous=process.env.PHONEBRIDGER_CORE_ACCOUNT_STORE;
 process.env.PHONEBRIDGER_CORE_ACCOUNT_STORE=path.join(fixture,'accounts.json');
 let middleware;
 const server=http.createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}).catch(()=>{res.writeHead(500);res.end();}));
 try{
  const root=path.join(here,'prototype');
  await phoneBridgerPreview(root,{accountsModule:path.join(here,'server/accounts.cjs')}).configureServer({httpServer:server,middlewares:{use(fn){middleware=fn;}}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/__projects/phonebridger/';
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
  for(let offset=0;offset<manifest.files.length;offset+=12)await Promise.all(manifest.files.slice(offset,offset+12).map(async file=>{
   const res=await fetch(base+file.path,{method:'HEAD'});assert.equal(res.status,200,file.path);assert.equal(Number(res.headers.get('content-length')),file.bytes,file.path);assert.match(res.headers.get('x-robots-tag'),/noindex/);
  }));
  for(const route of ['shop','contact','help','downloads','about','privacy','terms','login','register','recover','account']){
   const res=await fetch(base+route+'/');assert.equal(res.status,200,route);
   assert.equal(createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex'),manifest.files.find(f=>f.path===route+'/index.html').sha256,route);
  }
  const redirect=await fetch(base+'shop?holders=3&finish=silver',{redirect:'manual'});assert.equal(redirect.status,307);assert.equal(redirect.headers.get('location'),'/__projects/phonebridger/shop/?holders=3&finish=silver');
  for(const hidden of ['manifest.json','server/accounts.cjs','api/accounts.json','tests/bridge-regression.cjs','../../PAGE_PLAN.md'])assert.equal((await fetch(base+hidden)).status,404,hidden);
  const denied=await new Promise((resolve,reject)=>{const req=http.request(base+'api/account/session',{headers:{Host:'phonebridger.com'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(denied,404);
  const register=await fetch(base+'api/account/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'integration-fixture@example.invalid',password:'Disposable integration fixture 2026!'})});assert.equal(register.status,201);assert.match(register.headers.get('x-robots-tag'),/noindex/);
  const cookie=register.headers.get('set-cookie').split(';')[0];
  assert.equal((await(await fetch(base+'api/account/session',{headers:{Cookie:cookie}})).json()).user.email,'integration-fixture@example.invalid');
  assert.equal((await fetch(base+'api/account/logout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:'{}'})).status,200);
  assert.equal((await(await fetch(base+'api/account/session',{headers:{Cookie:cookie}})).json()).user,null);
  console.log(JSON.stringify({status:'PASS',attestedAssets:manifest.files.length,nestedPages:11,privateFilesDenied:true,publicHostDenied:true,actualLocalAccountCycle:true}));
 }finally{
  await new Promise(resolve=>server.close(resolve));
  if(previous===undefined)delete process.env.PHONEBRIDGER_CORE_ACCOUNT_STORE;else process.env.PHONEBRIDGER_CORE_ACCOUNT_STORE=previous;
  const resolved=path.resolve(fixture);assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('phonebridger-core-account-test-'));await rm(resolved,{recursive:true,force:true});
 }
});
