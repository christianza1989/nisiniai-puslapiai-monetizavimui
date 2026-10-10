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
  assert.equal(await object.state(ref),'recipient_bound');const summary=await object.summary();assert.equal(summary.requests,2);assert.equal(summary.external_sent,false);assert.ok(summary.mail.every(m=>m.type==='login-code'&&m.state==='pending'));
  console.log(JSON.stringify({compiledCaptureSha256:createHash('sha256').update(script).digest('hex'),sourceContract:'682cb28abf7eff888c3c27177c265ca383c6c5aa',external_sent:false,actualCoreHTTP:false}));
 }finally{await mf.dispose();await rm(directory,{recursive:true,force:true});}
});
test('Native Workers expiry/stop allow ordinary provider; actual erasure blocks proof',async()=>{
 const mf=create(false);try{
  for(const state of ['expired','stopped','erased']){
   const object=await stub(mf,state),user=JSON.parse(await object.login(ref)).user,id=String(await object.prepare(ref));
   await object.accept(id,JSON.stringify(receipt(id,state==='stopped'?'stopped':'issued')));
   if(state==='erased'){assert.equal(JSON.parse(await object.erase(user.id)).state,'completed');await assert.rejects(object.prepare(ref));}
   else{if(state==='expired')await object.advance(300001);assert.equal(await object.prepare(ref),null);assert.match(JSON.parse(await object.ordinaryProvider(user.id)).id,/^provider_/);}
  }
 }finally{await mf.dispose();}
});
