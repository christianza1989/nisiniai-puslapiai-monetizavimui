'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {createAccounts}=require('./accounts.cjs');

test('loopback email/password accounts enforce boundaries and persist only hashes',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'phonebridger-account-test-'));
 const store=path.join(directory,'accounts.json');let handler;
 const server=http.createServer(async(req,res)=>{if(!await handler(req,res,new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 handler=createAccounts({origin,prefix:'/p/',storePath:store});
 const send=(action,payload,extra={})=>fetch(origin+'/p/api/account/'+action,{method:payload===undefined?'GET':'POST',headers:{Origin:origin,...(payload===undefined?{}:{'Content-Type':'application/json'}),...extra},body:payload===undefined?undefined:JSON.stringify(payload)});
 const password='Disposable fixture password 2026!';let cookie;
 try{
  await t.test('non-loopback configuration rejected',()=>assert.throws(()=>createAccounts({origin:'https://example.com',prefix:'/',storePath:store}),/loopback/));
  await t.test('guest session has no user',async()=>{const r=await send('session');assert.equal(r.status,200);assert.deepEqual((await r.json()).user,null);assert.equal(r.headers.get('cache-control'),'no-store');});
  await t.test('register rejects cross-origin, invalid shape and weak password',async()=>{assert.equal((await send('register',{email:'fixture@example.invalid',password},{Origin:'https://example.com'})).status,403);assert.equal((await send('register',null)).status,400);assert.equal((await send('register',[])).status,400);assert.equal((await send('register',{email:'fixture@example.invalid',password:'short'})).status,400);});
  await t.test('registration normalizes email and issues protected session',async()=>{const r=await send('register',{email:' Fixture@Example.Invalid ',password});assert.equal(r.status,201);assert.equal((await r.json()).user.email,'fixture@example.invalid');cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict; Path=\/p\/; Max-Age=28800/);cookie=cookie.split(';')[0];});
  await t.test('stored secret is salted scrypt; session contains digest only',async()=>{const text=await fs.readFile(store,'utf8');const db=JSON.parse(text);assert.equal(db.users.length,1);assert.match(db.users[0].salt,/^[a-f0-9]{32}$/);assert.match(db.users[0].passwordHash,/^[a-f0-9]{128}$/);assert.ok(!text.includes(password));assert.ok(!text.includes(cookie.split('=')[1]));assert.equal(db.sessions[0].digest,createHash('sha256').update(cookie.split('=')[1]).digest('hex'));});
  await t.test('session restores account and duplicate email is rejected',async()=>{assert.equal((await (await send('session',undefined,{Cookie:cookie})).json()).user.email,'fixture@example.invalid');assert.equal((await send('register',{email:'FIXTURE@example.invalid',password})).status,409);});
  await t.test('wrong password and unknown email have same public failure',async()=>{const a=await send('login',{email:'fixture@example.invalid',password:'Wrong fixture password'}),b=await send('login',{email:'unknown@example.invalid',password});assert.equal(a.status,401);assert.equal(b.status,401);assert.deepEqual(await a.json(),await b.json());});
  await t.test('logout invalidates session; login creates a fresh session',async()=>{const r=await send('logout',{}, {Cookie:cookie});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await (await send('session',undefined,{Cookie:cookie})).json()).user,null);const login=await send('login',{email:'fixture@example.invalid',password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];});
  await t.test('expired session is rejected',async()=>{const db=JSON.parse(await fs.readFile(store,'utf8'));for(const s of db.sessions)s.expires=Date.now()-1;await fs.writeFile(store,JSON.stringify(db));assert.equal((await (await send('session',undefined,{Cookie:cookie})).json()).user,null);});
  await t.test('methods, host, content type and body size are constrained',async()=>{assert.equal((await send('login')).status,405);assert.equal(await new Promise((resolve,reject)=>{const req=http.request(origin+'/p/api/account/session',{headers:{Host:'attacker.invalid'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();}),403);assert.equal((await send('login',{}, {'Content-Type':'text/plain'})).status,403);assert.equal((await send('login',{email:'fixture@example.invalid',password:'x'.repeat(5000)})).status,413);});
  await t.test('failed attempts are throttled',async()=>{let status;for(let i=0;i<22;i++)status=(await send('login',{})).status;assert.equal(status,429);});
 }finally{
  await new Promise(resolve=>server.close(resolve));
  const resolved=path.resolve(directory),temporary=path.resolve(os.tmpdir())+path.sep;
  assert.ok(resolved.startsWith(temporary)&&path.basename(resolved).startsWith('phonebridger-account-test-'));
  await fs.rm(resolved,{recursive:true,force:true});
 }
});
