import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateWire} from './wire.mjs';
import {verifySignature} from './contracts/server-auth.mjs';
const core=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'capture-worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'}}),script=bundle.outputFiles[0].text;
const epoch=Date.parse('2026-10-10T01:00:00Z'),ref='I'.repeat(32),scope={business_id:'business-test',site_id:'madbeauty',environment_id:'capture-native',environment_class:'test'};
const receipt=(id,state='issued')=>({recipient_contract_version:'0.1.0',scope,adapter_id:'madbeauty-native',invitation_ref:ref,request_id:id,state,external_sent:false,challenge:state==='issued'?{challenge_nonce:'C'.repeat(32),recipient_key_id:'recipient-test-v1',address_rule:'madbeauty-email-v1-js-trim-lower',issued_at:new Date(epoch).toISOString(),expires_at:new Date(epoch+300000).toISOString()}:null});
const create=persist=>new Miniflare({modules:true,script,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],bindings:{CAPTURE_CLOCK:epoch},durableObjects:{CAPTURE:{className:'RecipientCapture',useSQLite:true}},durableObjectsPersist:persist});
async function stub(mf,name){const ns=await mf.getDurableObjectNamespace('CAPTURE');return ns.get(ns.idFromName(name));}
test('Compiled isolated Workers recipient packets and receipts survive SQL restart without external mail',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'madbeauty-recipient-workers-'));let mf=create(directory);
 try{
  assert.equal((await mf.dispatchFetch('https://capture.test/')).status,404);
  let object=await stub(mf,'proof'),user=JSON.parse(await object.login(ref)).user,id=String(await object.prepare(ref));
  const challengePacket=JSON.parse(await object.packet(id));validateWire('RecipientChallengeRequest',JSON.parse(challengePacket.body));
  await object.accept(id,JSON.stringify(receipt(id)));const proofId=String(await object.prepare(ref)),first=JSON.parse(await object.packet(proofId)),proof=JSON.parse(first.body);
  validateWire('RecipientProofRequest',proof);assert.equal(proof.native_account_ref,user.id);assert.equal(proof.recipient_digest,'v1=a39e849704152919e268adec4d97256611429ed7ed9f0eae2ac678615476bdf4');
  assert.equal(await verifySignature({keyId:'transport-test-v1',secret:Uint8Array.from({length:32},(_,i)=>i+41),method:'POST',path:first.path,body:first.body,headers:first.headers,now:epoch/1000}),true);
  await mf.dispose();mf=create(directory);object=await stub(mf,'proof');await object.advance(1000);
  assert.equal(String(await object.prepare(ref)),proofId);const retry=JSON.parse(await object.packet(proofId));assert.equal(retry.body,first.body);assert.notEqual(retry.headers['X-Acq-Signature'],first.headers['X-Acq-Signature']);
  const bound={recipient_contract_version:'0.1.0',scope,adapter_id:'madbeauty-native',invitation_ref:ref,request_id:proofId,state:'recipient_bound',bound_at:new Date(epoch+1000).toISOString(),external_sent:false};
  await object.accept(proofId,JSON.stringify(bound));await object.accept(proofId,JSON.stringify(bound));await assert.rejects(object.accept(proofId,JSON.stringify({...bound,bound_at:new Date(epoch+2000).toISOString()})));
  assert.equal(await object.state(ref),'recipient_bound');const summary=JSON.parse(await object.summary());assert.equal(summary.requests,2);assert.equal(summary.external_sent,false);assert.ok(summary.mail.every(m=>m.type==='login-code'&&m.state==='pending'));
  console.log(JSON.stringify({compiledCaptureSha256:createHash('sha256').update(script).digest('hex'),sourceContract:'682cb28abf7eff888c3c27177c265ca383c6c5aa',external_sent:false,actualCoreHTTP:false}));
 }finally{await mf.dispose();await rm(directory,{recursive:true,force:true});}
});
test('Native Workers expiry/stop allow ordinary provider; actual erasure blocks proof',async()=>{
 const mf=create(false);try{
  for(const state of ['expired','stopped','erased']){
   const object=await stub(mf,state),user=JSON.parse(await object.login(ref)).user,id=String(await object.prepare(ref));
   await object.accept(id,JSON.stringify(receipt(id,state==='stopped'?'stopped':'issued')));
   if(state==='erased'){assert.equal(JSON.parse(await object.erase(user.id)).state,'completed');assert.equal(await object.prepare(ref),null);}
   else{if(state==='expired')await object.advance(300001);assert.equal(await object.prepare(ref),null);assert.match(JSON.parse(await object.ordinaryProvider(user.id)).id,/^provider_/);}
  }
 }finally{await mf.dispose();}
});

test('Compiled Workers atomic privacy cleanup survives SQL restart and retains only accepted receipt',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'madbeauty-privacy-workers-'));let mf=create(directory);
 try{
  let object=await stub(mf,'privacy'),user=JSON.parse(await object.login(ref)).user,id=String(await object.prepare(ref));
  await object.accept(id,JSON.stringify(receipt(id)));const proofId=String(await object.prepare(ref)),proof=JSON.parse(JSON.parse(await object.packet(proofId)).body);
  assert.equal(JSON.parse(await object.erase(user.id)).state,'completed');
  const [queued]=JSON.parse(await object.retirementStatus()),first=JSON.parse(await object.retirementPacket(queued.request_id)),body=JSON.parse(first.body),summary=JSON.parse(await object.privacySummary());
  validateWire('RecipientRetirement',body);assert.deepEqual(body.recipient_proof,proof);assert.equal(summary.pending,0);assert.equal(summary.requests,0);assert.equal(summary.privacy[0].state,'ready');assert.ok(!summary.privacy[0].payload.includes(user.id));
  await mf.dispose();mf=create(directory);object=await stub(mf,'privacy');await object.advance(1000);
  const retry=JSON.parse(await object.retirementPacket(queued.request_id));assert.equal(first.body,retry.body);assert.notEqual(first.headers['X-Acq-Signature'],retry.headers['X-Acq-Signature']);
  assert.equal(await verifySignature({keyId:'transport-test-v1',secret:Uint8Array.from({length:32},(_,i)=>i+41),method:'POST',path:retry.path,body:retry.body,headers:retry.headers,now:(epoch+1000)/1000}),true);
  const accepted={retirement_contract_version:'0.1.0',scope,adapter_id:'madbeauty-native',invitation_ref:ref,request_id:queued.request_id,state:'recipient_retired',retired_at:new Date(epoch+1000).toISOString(),external_sent:false};
  assert.deepEqual(JSON.parse(await object.retirementCapture(queued.request_id,JSON.stringify(accepted))),accepted);
  const final=JSON.parse(await object.privacySummary());assert.equal(final.privacy[0].payload,null);assert.equal(final.privacy[0].state,'accepted');assert.equal(JSON.parse(await object.retirementPacket(queued.request_id)),null);
 }finally{await mf.dispose();await rm(directory,{recursive:true,force:true});}
});

test('Compiled Workers real organization lifecycle keeps monotonic counter and current eligibility across restart',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'madbeauty-lifecycle-workers-'));let mf=create(directory);
 try{
  let object=await stub(mf,'lifecycle');const user=JSON.parse(await object.login(ref)).user,id=String(await object.prepare(ref));await object.accept(id,JSON.stringify(receipt(id)));const proofId=String(await object.prepare(ref));await object.accept(proofId,JSON.stringify({...receipt(proofId),state:'recipient_bound',challenge:undefined,bound_at:new Date(epoch).toISOString()}));
  await object.resolution(ref,JSON.stringify({contract_version:'0.1.1',scope,invitation_ref:ref,objective:'provider_signup',offer_revision:'offer-workers',expires_at:new Date(epoch+3600000).toISOString(),state:'available'}));
  const org=JSON.parse(await object.captureProvider(user.id,ref));assert.equal(org.city,'Zarasai');const w=JSON.parse(await object.lifecycleWorkspace(user.id,org.id)),nativeScope={role:'professional',organizationId:org.id};
  await object.lifecycleMutation('createService',user.id,JSON.stringify({organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Workers legacy fixture',durationMin:30,priceMinor:2200}));
  const revision=JSON.parse(await object.lifecycleMutation('submitRevision',user.id,JSON.stringify({scope:nativeScope,name:org.name,bio:org.bio}))),op=JSON.parse(await object.login('O'.repeat(32),'operator@example.test')).user;await object.fixtureOperator(op.id);await object.lifecycleMutation('moderate',op.id,JSON.stringify({id:revision.id,state:'approved'}));
  assert.equal(JSON.parse(await object.lifecycleCurrent(org.id)).profile_active,true);const rows=JSON.parse(await object.lifecycleStatus()),first=JSON.parse(await object.lifecyclePacket(rows[0].event_id));assert.deepEqual(rows.map(r=>r.source_revision),[1,2,3,4]);
  await mf.dispose();mf=create(directory);object=await stub(mf,'lifecycle');await object.advance(1000);assert.equal(JSON.parse(await object.lifecyclePacket(rows[0].event_id)).body,first.body);
  const newer=JSON.parse(await object.lifecycleMutation('submitRevision',user.id,JSON.stringify({scope:nativeScope,name:'Pending native revision',bio:org.bio})));assert.equal(newer.state,'pending');assert.equal(JSON.parse(await object.lifecycleCurrent(org.id)).profile_active,true);
  await object.lifecycleMutation('edit',user.id,JSON.stringify({scope:nativeScope,table:'practitioners',id:w.practitioners[0].id,version:w.practitioners[0].version,values:{active:false}}));assert.equal(JSON.parse(await object.lifecycleCurrent(org.id)).profile_active,false);
  for(const row of JSON.parse(await object.lifecycleStatus())){const body=JSON.parse(JSON.parse(await object.lifecyclePacket(row.event_id)).body);validateWire('LifecycleEvent',body);const r={contract_version:'0.1.1',event_id:row.event_id,source_revision:row.source_revision,state:'applied',profile_active:[4,5].includes(row.source_revision),external_sent:false};assert.deepEqual(JSON.parse(await object.lifecycleCapture(row.event_id,JSON.stringify(r))),r);}
  assert.equal(JSON.parse(await object.lifecycleCurrent(org.id)).source_revision,6);assert.equal(JSON.parse(await object.lifecycleCurrent(org.id)).profile_active,false);assert.equal(JSON.parse(await object.summary()).external_sent,false);
 }finally{await mf.dispose();await rm(directory,{recursive:true,force:true});}
});
