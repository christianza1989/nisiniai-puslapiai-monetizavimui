import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
import {prepareReview,origin,expiresAt,output} from './review-build.mjs';
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));

test('Isolated review candidate preserves trial boundaries, OTP, restart and original expiry',async()=>{
 const {config,proof,script}=await prepareReview();
 const persistence=await mkdtemp(path.join(os.tmpdir(),'madbeauty-meta-review-'));
 let mf;
 const start=expiry=>new Miniflare({modules:true,script,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,
  durableObjects:{PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true},COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true}},durableObjectsPersist:persistence,
  images:{binding:'IMAGES'},bindings:{...config.vars,TRIAL_EXPIRES_AT:expiry,SESSION_SECRET:'isolated-local-review-session-key-only-thirty-two-chars'},
  serviceBindings:{ASSETS:async request=>{try{return new Response(await readFile(path.join(output,'assets',new URL(request.url).pathname.slice(1))));}catch{return new Response('Not found',{status:404});}}}});
 try{
  mf=start(expiresAt);
  const accounts=await mf.dispatchFetch(origin+'/bandymo-paskyros');assert.equal(accounts.status,200);
  assert.match(accounts.headers.get('x-robots-tag'),/noindex/);assert.match(await accounts.text(),/2027/);
  assert.equal((await mf.dispatchFetch('https://bandymas.madbeauty.lt/')).status,404);
  assert.equal((await mf.dispatchFetch('https://madbeauty.lt/')).status,404);
  assert.equal((await mf.dispatchFetch(origin+'/sitemap.xml')).status,404);
  const providers=await (await mf.dispatchFetch(origin+'/providers.json')).json();assert.equal(providers.profiles.length,45);
  assert.ok(providers.profiles.every(p=>p.id.startsWith('demo-org-')));
  let cookie='',csrf='';
  async function request(url,body){
   const r=await mf.dispatchFetch(origin+url,{method:body?'POST':'GET',headers:{cookie,origin,...(body?{'Content-Type':'application/json','x-csrf-token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
   if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
   const value=await r.json();if(value.csrf)csrf=value.csrf;return {status:r.status,value};
  }
  await request('/api/madbeauty/session');
  assert.equal((await request('/api/madbeauty/auth/start',{email:'person@real-domain.lt'})).status,400);
  const challenge=await request('/api/madbeauty/auth/start',{email:'demo-client-2@example.com'});assert.equal(challenge.status,200);
  assert.match(challenge.value.testCode,/^\d{6}$/);
  assert.equal((await request('/api/madbeauty/auth/verify',{challengeId:challenge.value.challengeId,code:challenge.value.testCode})).status,200);
  const before=await request('/api/madbeauty/session');assert.equal(before.value.user.email,'demo-client-2@example.com');
  const member=await request('/api/madbeauty/community',{method:'session',input:{},organizationId:null});
  assert.equal(member.status,200);assert.equal(member.value.result.isDemo,true);
  const settings=await request('/api/madbeauty/community',{method:'settings',input:{version:0,name:'Peržiūros bandymo paskyra',city:'Vilnius',discoverable:true,messagePolicy:'requests'},organizationId:null});
  assert.equal(settings.status,200,JSON.stringify(settings));
  const post=await request('/api/madbeauty/community',{method:'publish',input:{text:'Synthetic isolated review acceptance',audience:'public',operation:'review-local-once'},organizationId:null});
  assert.equal(post.status,200,JSON.stringify(post));
  await mf.dispose();mf=start(expiresAt);
  assert.equal((await request('/api/madbeauty/session')).value.user.email,'demo-client-2@example.com');
  const feed=await request('/api/madbeauty/community',{method:'feed',input:{},organizationId:null});
  assert.equal(feed.status,200);assert.ok(feed.value.result.posts.some(p=>p.id===post.value.result.id));
  // Both the public handler and direct Durable Object refuse service after expiry.
  await mf.dispose();mf=start('2020-01-01T00:00:00.000Z');
  assert.equal((await mf.dispatchFetch(origin+'/')).status,410);
  const ns=await mf.getDurableObjectNamespace('PLATFORM');
  assert.equal((await ns.get(ns.idFromName('madbeauty-pilot-v1')).fetch(origin+'/api/madbeauty/session')).status,410);
  const trial=JSON.parse(await readFile(path.join(output,'../trial/wrangler.json'),'utf8'));
  assert.equal(trial.vars.TRIAL_EXPIRES_AT,'2026-10-16T21:10:47.982Z');
  await writeFile(path.join(output,'native.json'),JSON.stringify({state:'PASS',artifactSha256:proof.artifactSha256,at:new Date().toISOString(),scope:'Local isolated review candidate only; no live deployment, provider credentials or actual Facebook OAuth',scenarios:['new origin only','45 synthetic profiles','noindex/no sitemap','real email denied','OTP session','community post','persisted session and community restart','handler and DO expiry','existing trial expiry preserved']},null,2));
 }finally{await mf?.dispose();}
});
