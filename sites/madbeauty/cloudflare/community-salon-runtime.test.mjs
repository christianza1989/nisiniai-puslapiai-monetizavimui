import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core,pinCore} from '../release-20261010/pinned-core.mjs';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore]});
test('Native salon shared inbox uses actual receptionist membership and excludes practitioners, outsiders and revoked staff',async()=>{
 const origin='https://community-salon.test',storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-community-salon-')),mails=[];
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true}},durableObjectsPersist:storage,bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',COMMUNITY_ENABLED:'true',SESSION_SECRET:'local-test-salon-no-production-access'},serviceBindings:{ASSETS:()=>new Response('Not found',{status:404}),MAIL_TRANSPORT:async r=>{mails.push(await r.json());return new Response('Accepted');}}});
 const browser=()=>{let cookie='',csrf='';const send=async(route,body)=>{const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...body===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf}},...body===undefined?{}:{body:JSON.stringify(body)}});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;const v=await r.json();csrf=v.csrf||csrf;return {status:r.status,...v};};return {send,community:(method,input={},organizationId=null)=>send('community',{method,input,organizationId}),rpc:(method,input)=>send('rpc',{siteId:'madbeauty',method,input}),async login(email){await send('session');const c=await send('auth/start',{email});assert.equal((await send('auth/verify',{challengeId:c.challengeId,code:mails.at(-1).text.match(/\b\d{6}\b/)[0]})).status,200);}};};
 try{
  const owner=browser(),reception=browser(),practitioner=browser(),client=browser();for(const [user,email] of [[owner,'salon-owner@example.com'],[reception,'salon-reception@example.com'],[practitioner,'salon-practitioner@example.com'],[client,'salon-client@example.com']])await user.login(email);
  const created=await owner.rpc('createOrganization',{name:'Testinis salonas',bio:'Izoliuotas bendruomenės prieigos bandymas.',city:'Vilnius',kind:'salon'});assert.equal(created.status,200,JSON.stringify(created));const organizationId=created.result.id,O='organization:'+organizationId,C=(await client.community('session')).result.actor;
  await owner.community('settings',{version:0,name:'Testinis salonas',discoverable:true,messagePolicy:'requests'},organizationId);await client.community('settings',{version:0,name:'Testinė klientė',discoverable:true,messagePolicy:'requests'});
  const granted=await owner.rpc('grantMembership',{organizationId,email:'salon-reception@example.com',role:'reception',version:0});assert.equal(granted.status,200,JSON.stringify(granted));
  const workspace=await owner.rpc('workspace',{role:'professional',organizationId});assert.equal(workspace.status,200,JSON.stringify(workspace));const practitionerId=workspace.result.practitioners[0].id;
  assert.equal((await owner.rpc('grantMembership',{organizationId,email:'salon-practitioner@example.com',role:'practitioner',practitionerId,version:0})).status,200);
  assert.equal((await client.community('request',{target:O})).status,200);await client.community('send',{target:O,text:'Noriu aptarti manikiūrą.',operation:'salon-intro'});
  assert.equal((await reception.community('conversation',{target:C},organizationId)).result.messages[0].text,'Noriu aptarti manikiūrą.');
  assert.equal((await practitioner.community('conversation',{target:C},organizationId)).status,403);assert.equal((await client.community('relationships',{},organizationId)).status,403);
  assert.equal((await reception.community('respond',{target:C,version:1,accept:true},organizationId)).status,200);const sent=await reception.community('send',{target:C,text:'Labas! Koks laikas tiktų?',operation:'salon-reception-reply'},organizationId);assert.equal(sent.status,200,JSON.stringify(sent));assert.equal(sent.result.author,O);
  assert.equal((await client.community('conversation',{target:O})).result.messages.length,2);assert.equal((await owner.community('relationships',{},organizationId)).result[0].target,C);
  const revoked=await owner.rpc('revokeMembership',{organizationId,id:granted.result.id,version:granted.result.version});assert.equal(revoked.status,200,JSON.stringify(revoked));assert.equal((await reception.community('conversation',{target:C},organizationId)).status,403);
  assert.equal((await owner.community('conversation',{target:C},organizationId)).status,200);
 }finally{await mf.dispose();}
});
