import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core,pinCore} from '../release-20261010/pinned-core.mjs';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
// Provider replacement exists only in this test bundle. Live source has no test binding.
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore,{name:'isolated-facebook-provider',setup(b){b.onLoad({filter:/cloudflare[\\/]platform-object\.mjs$/},async a=>({contents:(await readFile(a.path,'utf8')).replace("facebook:{enabled:","facebook:{fetchImpl:(url,init)=>this.env.TEST_GRAPH.fetch(new Request(url,init)),enabled:"),loader:'js'}));}}]});
test('Native Facebook OAuth survives SQL restart, rotates linked sessions and authenticates deletion without weakening callback headers',async()=>{
 const origin='https://madbeauty.test',appId='123456789',secret='fixture-facebook-secret-no-live-access',storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-facebook-native-')),mails=[];
 let graphCalls=0,wrongApp=false;
 const start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true}},durableObjectsPersist:storage,bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',SESSION_SECRET:'local-test-only-secret-no-production-access',FACEBOOK_LOGIN_ENABLED:'true',FACEBOOK_APP_ID:appId,FACEBOOK_APP_SECRET:secret},serviceBindings:{ASSETS:()=>new Response('Not found',{status:404}),MAIL_TRANSPORT:async r=>{mails.push(await r.json());return new Response('Accepted');},TEST_GRAPH:async r=>{graphCalls++;const p=new URL(r.url).pathname;return p.endsWith('/oauth/access_token')?Response.json({access_token:'isolated-token'}):p.endsWith('/debug_token')?Response.json({data:{is_valid:true,app_id:wrongApp?'987654321':appId,user_id:'234567890',expires_at:Math.floor(Date.now()/1000)+3600,scopes:['public_profile','email']}}):Response.json({id:'234567890',email:'suggested@example.com'});}}});
 let mf=start(),cookie='',csrf='';
 const call=async(p,body,headers={})=>{const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+p,{redirect:'manual',method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...body===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf},...headers},...body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 const session=async()=>{const d=await (await call('session')).json();csrf=d.csrf;return d;};
 const oauth=async()=>{const r=await call('auth/facebook/start',{returnPath:'/bendruomene'});assert.equal(r.status,200);const d=await r.json();return new URL(d.url).searchParams.get('state');};
 try{
  assert.equal((await session()).facebook.enabled,true);assert.equal((await call('auth/facebook/start',{}, {'X-CSRF-Token':'forged'})).status,403);
  const state=await oauth();await mf.dispose();mf=start();
  const callback=await call('auth/facebook/callback?state='+state+'&code=fixture-code');assert.equal(callback.status,303);assert.match(callback.headers.get('location'),/facebook=verify/);assert.equal(callback.headers.get('referrer-policy'),'no-referrer');assert.equal((await session()).facebook.pending,true);
  const challenge=await (await call('auth/start',{email:'native-facebook@example.com'})).json(),code=mails.at(-1).text.match(/\b\d{6}\b/)[0];
  const verified=await (await call('auth/verify',{challengeId:challenge.challengeId,code})).json();csrf=verified.csrf;assert.equal(verified.facebook.linked,true);const account=verified.user.id;
  assert.equal((await call('auth/facebook/callback?state='+state+'&code=replay')).headers.get('location'),'/paskyra?facebook=failed');assert.equal(graphCalls,3);
  await call('logout',{});await session();const prior=cookie,s2=await oauth();const linked=await call('auth/facebook/callback?state='+s2+'&code=fixture-linked');assert.equal(linked.headers.get('location'),'/bendruomene');assert.notEqual(cookie,prior);assert.equal((await session()).user.id,account);
  await mf.dispose();mf=start();assert.equal((await session()).user.id,account);
  const payload=Buffer.from(JSON.stringify({algorithm:'HMAC-SHA256',user_id:'234567890'})).toString('base64url'),signed=createHmac('sha256',secret).update(payload).digest('base64url')+'.'+payload;
  const deletion=await call('auth/facebook/deletion',new URLSearchParams({signed_request:signed}).toString(),{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://www.facebook.com','X-CSRF-Token':''});assert.equal(deletion.status,200);assert.equal((await session()).user,null);
  const receipt=await deletion.json();assert.equal((await mf.dispatchFetch(receipt.url)).status,200);wrongApp=true;const bad=await oauth();assert.equal((await call('auth/facebook/callback?state='+bad+'&code=bad-app')).headers.get('location'),'/paskyra?facebook=failed');assert.equal((await session()).facebook.pending,false);
 }finally{await mf.dispose();}
});
