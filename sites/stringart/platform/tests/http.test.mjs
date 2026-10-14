import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync,rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const script=fileURLToPath(new URL('../server.mjs',import.meta.url));
async function start(db){const child=spawn(process.execPath,[script],{env:{...process.env,PORT:'0',MEMORYSTRING_DB:db,MEMORYSTRING_FIXTURE:'baseline'},windowsHide:true,stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',c=>stderr+=c);const url=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server did not start: '+stderr)),15000);child.stdout.on('data',c=>{const match=c.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});child.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code+': '+stderr));});});return {child,url};}
async function stop(child){if(child.exitCode!==null)return;const closed=once(child,'exit');child.kill();await closed;}
async function session(url,identity){const r=await fetch(url+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
async function call(url,cookie,type,values={}){const r=await fetch(url+'/api/commands',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({type,key:crypto.randomUUID(),...values})});return {status:r.status,...await r.json()};}
test('real HTTP sessions, foreign reads/writes, supplier private projection, host/origin and process restart',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ms-http-')),db=path.join(dir,'state.sqlite');let running=await start(db);t.after(async()=>{await stop(running.child);assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'ms-http-'));rmSync(dir,{recursive:true,force:true});});
 let {url}=running;const op=await session(url,'operator'),lt=await session(url,'partner-lt'),de=await session(url,'partner-de'),supplier=await session(url,'supplier');
 assert.equal((await fetch(url+'/api/state')).status,401);assert.equal((await fetch(url+'/api/orders/MS-LT-100',{headers:{Cookie:de}})).status,403);
 const sv=await(await fetch(url+'/api/state',{headers:{Cookie:supplier}})).json();const serialized=JSON.stringify(sv);for(const word of ['customer','project','studio@','Neris','Linden','goodsCents'])assert(!serialized.includes(word));
 assert.equal((await call(url,de,'stock.adjust',{tenant:'lt',sku:'kit42',delta:1,reason:'Forbidden'})).status,403);assert.equal((await call(url,supplier,'order.cancel',{id:'MS-LT-100',version:1})).status,403);
 const hostStatus=await new Promise((resolve,reject)=>{http.get(url+'/api/state',{headers:{Cookie:op,Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(hostStatus,403);
 assert.equal((await fetch(url+'/api/commands',{method:'POST',headers:{'Content-Type':'application/json',Cookie:op,Origin:'https://evil.example'},body:'{}'})).status,403);
 const created=await call(url,lt,'order.create',{tenant:'lt',orderType:'kit',customer:'Persistent process restart fixture'});assert.equal(created.status,200);const id=created.result.id;
 await stop(running.child);running=await start(db);url=running.url;const relogin=await session(url,'partner-lt');assert.equal((await fetch(url+'/api/state',{headers:{Cookie:lt}})).status,401);
 const persisted=await(await fetch(url+'/api/orders/'+id,{headers:{Cookie:relogin}})).json();assert.equal(persisted.order.customer,'Persistent process restart fixture');
 assert.equal((await fetch(url+'/')).headers.get('x-robots-tag'),'noindex, nofollow, noarchive');assert.equal((await fetch(url+'/assets/brand/memorystring-mark.svg')).status,200);
});
test('competing HTTP reservations on two live server processes sharing SQLite have one last-unit winner',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ms-contention-')),db=path.join(dir,'state.sqlite');const a=await start(db),b=await start(db);t.after(async()=>{await stop(a.child);await stop(b.child);assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'ms-contention-'));rmSync(dir,{recursive:true,force:true});});
 const ca=await session(a.url,'partner-lt'),cb=await session(b.url,'partner-lt');await call(a.url,ca,'stock.adjust',{tenant:'lt',sku:'kit42',delta:-79,reason:'HTTP last-unit fixture'});
 const one=(await call(a.url,ca,'order.create',{tenant:'lt',orderType:'kit',customer:'Contender one'})).result,two=(await call(b.url,cb,'order.create',{tenant:'lt',orderType:'kit',customer:'Contender two'})).result;
 const p1=(await call(a.url,ca,'order.pay',{id:one.id,version:one.version,simulated:true})).result,p2=(await call(b.url,cb,'order.pay',{id:two.id,version:two.version,simulated:true})).result;
 const results=await Promise.all([call(a.url,ca,'order.reserve',{id:p1.id,version:p1.version}),call(b.url,cb,'order.reserve',{id:p2.id,version:p2.version})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const state=await(await fetch(a.url+'/api/state',{headers:{Cookie:ca}})).json();const kit=state.data.stock.find(s=>s.sku==='kit42');assert.equal(kit.onHand,1);assert.equal(kit.reserved,1);
});
