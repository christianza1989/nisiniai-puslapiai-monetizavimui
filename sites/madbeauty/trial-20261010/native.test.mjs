import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const repo=path.resolve(import.meta.dirname,'../../..'),core=path.resolve(repo,'../dovanos-memorycasting');
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const script=await readFile(new URL('output/worker.mjs',import.meta.url),'utf8');
const origin='https://bandymas.madbeauty.lt';
test('Temporary live fixtures reuse server booking, separate fictional identities, noindex and actual expiry',async()=>{
 const persist=await mkdtemp(path.join(os.tmpdir(),'madbeauty-trial-'));
 const start=expiresAt=>new Miniflare({modules:true,script,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],
  durableObjects:{PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true}},durableObjectsPersist:persist,images:{binding:'IMAGES'},
  bindings:{APP_ORIGIN:origin,RELEASE_MODE:'temporary-live-test',TRIAL_EXPIRES_AT:expiresAt,SESSION_SECRET:'isolated-native-trial-key-at-least-thirty-two-characters'},
  serviceBindings:{ASSETS:async request=>{const file=new URL(request.url).pathname;try{return new Response(await readFile(new URL('output/assets'+file,import.meta.url)),{headers:{'Content-Type':file.endsWith('.mjs')?'text/javascript':file.endsWith('.json')?'application/json':'image/webp'}});}catch{return new Response('Not found',{status:404});}}}});
 let mf=start(new Date(Date.now()+86400000).toISOString());
 function browser(){let cookie='',csrf='';return {async request(path,body){const r=await mf.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin,...(body===undefined?{}:{'Content-Type':'application/json','x-csrf-token':csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const raw=await r.text();if(!raw.startsWith("{"))throw Error(path+" "+r.status+" "+raw.slice(0,1600));const value=JSON.parse(raw);if(value.csrf)csrf=value.csrf;return {status:r.status,value};},async login(email){await this.request('/api/madbeauty/session');const start=await this.request('/api/madbeauty/auth/start',{email});assert.equal(start.status,200,JSON.stringify(start));assert.match(start.value.testCode,/^\d{6}$/);const verify=await this.request('/api/madbeauty/auth/verify',{challengeId:start.value.challengeId,code:start.value.testCode});assert.equal(verify.status,200,JSON.stringify(verify));return verify.value;},async rpc(method,input={}){const r=await this.request('/api/madbeauty/rpc',{method,input,siteId:'madbeauty'});assert.equal(r.status,200,method+JSON.stringify(r));return r.value.result;}};}
 try{
  const page=await mf.dispatchFetch(origin+'/bandymo-paskyros');assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);assert.equal((await page.text()).match(/demo-provider-/g).length,46);
  const guest=browser(),owner=browser(),client=browser(),other=browser();await guest.request('/api/madbeauty/session');
  assert.equal((await guest.request('/api/madbeauty/auth/start',{email:'person@real-domain.lt'})).status,400);
  const catalogue=await guest.rpc('catalog');assert.equal(new Set(catalogue.map(s=>s.organizationId)).size,45);assert.equal(new Set(catalogue.filter(s=>s.kind==='solo').map(s=>s.organizationId)).size,40);assert.ok(catalogue.every(s=>s.organizationId.startsWith('demo-org-')));
  assert.ok(catalogue.filter(s=>s.kind==='solo').every(s=>s.avatarImageId&&s.media.length));
  const publicProfile=await guest.rpc('profile',{id:'demo-org-0'});assert.equal(publicProfile.works.length,2);assert.ok(publicProfile.practitioners[0].avatarImageId);assert.equal((await mf.dispatchFetch(origin+'/'+publicProfile.media[0].variants[0].file)).status,200);
  await owner.login('demo-provider-0@example.com');await client.login('demo-client-0@example.com');await other.login('demo-client-1@example.com');
  const service=catalogue.find(s=>s.organizationId==='demo-org-0');let slot;
  for(let dayOffset=1;dayOffset<8&&!slot;dayOffset++)slot=(await client.rpc('availability',{providerServiceId:service.id,dayOffset,from:540,to:1200,addons:[]})).slots[0];
  assert.ok(slot);const hold=await client.rpc('hold',slot),booking=await client.rpc('confirm',{holdId:hold.id,name:'Bandymo klientas',idempotencyKey:'temporary-trial-native-one'});
  assert.equal((await owner.rpc('workspace',{role:'professional',organizationId:'demo-org-0'})).bookings.find(b=>b.id===booking.id).clientId,booking.clientId);
  assert.ok(!(await other.rpc('workspace',{role:'customer'})).bookings.some(b=>b.id===booking.id));
  const profile=await mf.dispatchFetch(origin+'/meistrai/demo-org-0');assert.equal(profile.status,200);const html=await profile.text();assert.match(html,/LAIKINAS BANDYMAS/);assert.ok(!html.includes('application/ld+json'));assert.ok(!html.includes('rel="canonical"'));
  assert.equal((await mf.dispatchFetch(origin+'/sitemap.xml')).status,404);assert.equal((await mf.dispatchFetch(origin+'/content-targets.json')).status,404);assert.equal((await mf.dispatchFetch(origin+'/private-originals/profiles-v2/profile-01-portrait.png')).status,404);
  await mf.dispose();mf=start(new Date(Date.now()+86400000).toISOString());assert.equal((await client.rpc('workspace',{role:'customer'})).bookings.filter(b=>b.id===booking.id).length,1);
  await mf.dispose();mf=start('2020-01-01T00:00:00.000Z');assert.equal((await mf.dispatchFetch(origin+'/')).status,410);assert.equal((await mf.dispatchFetch(origin+'/api/madbeauty/session')).status,410);
 }finally{await mf.dispose();}
});
