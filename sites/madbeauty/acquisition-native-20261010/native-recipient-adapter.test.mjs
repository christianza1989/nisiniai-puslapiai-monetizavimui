import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../backend/store.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {createRetention} from '../backend/retention.mjs';
import {RETENTION_POLICY} from '../backend/retention-policy.mjs';
import {createNativeRecipientCapture} from './native-recipient-adapter.mjs';
import {canonicalNativeEmail,createRecipientCodec} from './contracts/recipient-binding.mjs';
import {verifySignature} from './contracts/server-auth.mjs';
import {validateWire} from './wire.mjs';
import vector from './contracts/recipient-vector.json' with {type:'json'};
const scope=vector.scope,invitationRef=vector.invitation_ref;
const recipientSecret=Uint8Array.from({length:32},(_,i)=>i+1),transportSecret=Uint8Array.from({length:32},(_,i)=>i+41);
const config={scope,adapterId:vector.adapter_id,sourceRelease:'native-capture-component-v1',recipientKeyId:vector.key_id,recipientSecret,transportKeyId:'transport-test-v1',transportSecret,captureOnly:true};
const epoch=Date.parse('2026-10-10T01:00:00Z');
async function fixture(filename=':memory:'){
 let now=epoch;const store=openStore({filename,secret:'public-synthetic-native-test-secret-32',clock:()=>now});
 return {store,adapter:await createNativeRecipientCapture({store,...config}),clock:()=>now,advance:ms=>now+=ms,close:()=>store.close()};
}
function verified(f,email='Owner@example.test'){
 const session=f.adapter.auth.session(null),start=f.adapter.startInvitation(session,{invitationRef,email,ip:'isolated-fixture'});
 return f.adapter.verifyInvitation(session,{challengeId:start.challengeId,code:f.store.capture(start.challengeId).code,ip:'isolated-fixture'});
}
function challengeReceipt(f,id,overrides={}){return {recipient_contract_version:'0.1.0',scope,adapter_id:config.adapterId,invitation_ref:invitationRef,request_id:id,state:'issued',external_sent:false,challenge:{challenge_nonce:vector.challenge_nonce,recipient_key_id:vector.key_id,address_rule:vector.address_rule,issued_at:new Date(f.clock()).toISOString(),expires_at:new Date(f.clock()+300000).toISOString()},...overrides};}
function proofReceipt(f,id){return {recipient_contract_version:'0.1.0',scope,adapter_id:config.adapterId,invitation_ref:invitationRef,request_id:id,state:'recipient_bound',bound_at:new Date(f.clock()).toISOString(),external_sent:false};}
async function assertPacket(f,id,type,operation){
 const packet=await f.adapter.packet(id),body=JSON.parse(packet.body);
 assert.equal(packet.path,'/integrations/acquisition/v1/sites/madbeauty/'+operation);validateWire(type,body);
 assert.deepEqual(body.scope,scope);assert.equal(body.adapter_id,config.adapterId);
 const args={keyId:config.transportKeyId,secret:transportSecret,method:'POST',path:packet.path,body:packet.body,headers:packet.headers,now:Math.floor(f.clock()/1000)};
 assert.equal(await verifySignature(args),true);await assert.rejects(verifySignature({...args,body:packet.body+' '}));
 return {packet,body};
}
test('Three shared canonical vectors and strict schema reject coercion and old proposal_version',async()=>{
 const codec=await createRecipientCodec({secret:recipientSecret,scope,adapterId:config.adapterId,keyId:vector.key_id});
 for(const entry of vector.cases){const canonical=canonicalNativeEmail(entry.native_input),input={invitationRef,challengeNonce:vector.challenge_nonce,canonicalRecipient:canonical};assert.equal(canonical,entry.canonical_email);assert.equal(new TextDecoder().decode(codec.bytes(input)),entry.input_utf8);assert.equal(await codec.digest(input),entry.recipient_digest);}
 const receipt=proofReceipt({clock:()=>epoch},'00000000-0000-4000-8000-000000000001');
 for(const bad of [{external_sent:0},{proposal_version:'candidate'},{bound_at:'bad-date'}])assert.throws(()=>validateWire('RecipientProofReceipt',{...receipt,...bad}));
 await assert.rejects(codec.digest({invitationRef,challengeNonce:vector.challenge_nonce,canonicalRecipient:'\uD800@example.test'}));
});
test('Actual OTP gates attribution; wrong attempts commit, owner hook survives, account cannot rebind',async()=>{
 const f=await fixture();try{
  let hook=0;f.store.onVerifiedAccount=user=>{hook++;return user;};const original=f.store.onVerifiedAccount;
  const session=f.adapter.auth.session(null),start=f.adapter.startInvitation(session,{invitationRef,email:' OWNER@EXAMPLE.TEST ',ip:'capture'}),code=f.store.capture(start.challengeId).code;
  assert.equal(await f.adapter.prepare(invitationRef),null);
  assert.throws(()=>f.adapter.verifyInvitation(session,{challengeId:start.challengeId,code:code==='000000'?'111111':'000000',ip:'capture'}),e=>e.code==='INVALID_CODE');
  assert.equal(f.store.db.prepare('SELECT attempts FROM email_challenges WHERE id=?').get(start.challengeId).attempts,1);
  assert.equal(f.adapter.state(invitationRef),null);assert.equal(f.store.onVerifiedAccount,original);
  const actual=f.adapter.verifyInvitation(session,{challengeId:start.challengeId,code,ip:'capture'});
  assert.equal(hook,1);assert.equal(actual.user.email,'owner@example.test');assert.equal(f.adapter.state(invitationRef),'verified');
  const pending=f.store.db.prepare('SELECT * FROM native_recipient_pending').get();assert.equal(pending.account_ref,actual.user.id);assert.equal('email' in pending,false);
  assert.notEqual(verified(f,'other@example.test').user.id,actual.user.id);assert.equal(f.store.db.prepare('SELECT account_ref FROM native_recipient_pending ORDER BY verified_at,account_ref').all().some(r=>r.account_ref===actual.user.id),true);
  assert.equal(f.adapter.state(invitationRef,actual.user.id),'verified');await assert.rejects(f.adapter.prepare(invitationRef),/native_account_context_required/);
  assert.ok(f.store.db.prepare('SELECT recipient,state FROM mail_outbox').all().every(r=>r.recipient.endsWith('@example.test')&&r.state==='captured'));
 }finally{f.close();}
});
test('Native successful verification and attribution buffer roll back in the same transaction',async()=>{
 const f=await fixture();try{
  const session=f.adapter.auth.session(null),start=f.adapter.startInvitation(session,{invitationRef,email:'owner@example.test',ip:'atomic'}),code=f.store.capture(start.challengeId).code;
  f.store.db.exec("CREATE TRIGGER fail_native_buffer BEFORE INSERT ON native_recipient_pending BEGIN SELECT RAISE(ABORT,'synthetic_buffer_failure'); END");
  assert.throws(()=>f.adapter.verifyInvitation(session,{challengeId:start.challengeId,code,ip:'atomic'}),/synthetic_buffer_failure/);
  assert.equal(f.store.db.prepare('SELECT consumed FROM email_challenges WHERE id=?').get(start.challengeId).consumed,0);assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM accounts').get().n,0);assert.equal(f.adapter.state(invitationRef),null);
  f.store.db.exec('DROP TRIGGER fail_native_buffer');assert.ok(f.adapter.verifyInvitation(session,{challengeId:start.challengeId,code,ip:'atomic'}).user.id);
 }finally{f.close();}
});
test('Durable raw bytes survive restart/lost ACK; retry refreshes signature and receipt stays immutable',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'madbeauty-recipient-capture-')),filename=join(directory,'capture.sqlite');let f;
 try{
  f=await fixture(filename);const actual=verified(f),id=await f.adapter.prepare(invitationRef),first=await assertPacket(f,id,'RecipientChallengeRequest','recipient-challenge'),challenge=challengeReceipt(f,id);
  f.close();f=await fixture(filename);f.advance(1000);assert.equal(await f.adapter.prepare(invitationRef),id);
  const retry=await assertPacket(f,id,'RecipientChallengeRequest','recipient-challenge');assert.equal(retry.packet.body,first.packet.body);assert.notEqual(retry.packet.headers['X-Acq-Signature'],first.packet.headers['X-Acq-Signature']);
  f.adapter.acceptReceipt(id,challenge);assert.deepEqual(f.adapter.acceptReceipt(id,challenge),challenge);assert.throws(()=>f.adapter.acceptReceipt(id,{...challenge,state:'expired'}),/changed_recipient_receipt/);
  const proofId=await f.adapter.prepare(invitationRef),proof=await assertPacket(f,proofId,'RecipientProofRequest','verify-recipient');
  assert.equal(proof.body.native_account_ref,actual.user.id);assert.equal(proof.body.native_verified_at,new Date(epoch).toISOString());assert.equal(proof.body.recipient_digest,vector.cases[0].recipient_digest);assert.equal(proof.packet.body.includes('@'),false);assert.equal('provider_ref' in proof.body,false);
  const receipt=proofReceipt(f,proofId);f.close();f=await fixture(filename);f.advance(301000);
  assert.equal((await f.adapter.packet(proofId)).body,proof.packet.body,'Late retry only seeks core original receipt for possibly accepted request');
  f.adapter.acceptReceipt(proofId,receipt);assert.equal(f.adapter.state(invitationRef),'recipient_bound');assert.equal(await f.adapter.prepare(invitationRef),null);assert.equal(await f.adapter.packet(proofId),null);assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,2);
 }finally{f?.close();rmSync(directory,{recursive:true,force:true});}
});
test('Wrong scope/key/rule/lifetime/capture response cannot ACK a request',async()=>{
 const f=await fixture();try{
  verified(f);const id=await f.adapter.prepare(invitationRef),valid=challengeReceipt(f,id);
  for(const bad of [{scope:{...scope,environment_class:'production'}},{external_sent:true},{challenge:{...valid.challenge,recipient_key_id:'foreign-key'}},{challenge:{...valid.challenge,address_rule:'different-rule'}},{challenge:{...valid.challenge,expires_at:new Date(epoch+300001).toISOString()}},{challenge:{...valid.challenge,challenge_nonce:'C'.repeat(31)}}])assert.throws(()=>f.adapter.acceptReceipt(id,{...valid,...bad}));
  assert.equal(f.adapter.state(invitationRef),'verified');assert.equal(f.store.db.prepare('SELECT state FROM native_recipient_requests').get().state,'ready');f.adapter.acceptReceipt(id,valid);assert.equal(f.adapter.state(invitationRef),'challenge_issued');
 }finally{f.close();}
});
test('Expiry/stop preserve ordinary actual provider signup without attribution extension',async()=>{
 for(const stopped of [false,true]){const f=await fixture();try{
  const actual=verified(f),id=await f.adapter.prepare(invitationRef);f.adapter.acceptReceipt(id,challengeReceipt(f,id,stopped?{state:'stopped',challenge:null}:{}));if(!stopped)f.advance(300001);
  assert.equal(await f.adapter.prepare(invitationRef),null);assert.equal(f.adapter.state(invitationRef),stopped?'stopped':'expired');
  const org=createPlatform(f.store).createOrganization(actual.user,{name:'Synthetic ordinary provider',bio:'Capture only',kind:'solo',city:'Vilnius'});assert.match(org.id,/^provider_/);assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,1);
 }finally{f.close();}}
});
test('Actual native erasure removes pending proof and atomically queues retirement',async()=>{
 const f=await fixture();try{
  const actual=verified(f),id=await f.adapter.prepare(invitationRef);f.adapter.acceptReceipt(id,challengeReceipt(f,id));
  f.store.retentionPolicyVersion=RETENTION_POLICY.version;
  assert.equal(createRetention(f.store).begin(actual.user,{confirmEmail:actual.user.email,policyVersion:RETENTION_POLICY.version}).state,'completed');
  assert.equal(f.store.db.prepare('SELECT id FROM accounts WHERE id=?').get(actual.user.id),undefined);
  assert.equal(await f.adapter.prepare(invitationRef),null);assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,0);assert.equal(f.adapter.state(invitationRef),null);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_privacy').get().n,1);assert.equal(f.store.db.prepare('SELECT state FROM native_recipient_privacy').get().state,'ready');
 }finally{f.close();}
});
test('Production/cross-site/reused key configuration unavailable',async()=>{
 const f=await fixture();try{for(const change of [{captureOnly:false},{scope:{...scope,environment_class:'production'}},{scope:{...scope,site_id:'foreign'}},{transportSecret:recipientSecret}])await assert.rejects(createNativeRecipientCapture({store:f.store,...config,...change}));}finally{f.close();}
});
test('Scope key order and overlapping proof preparation preserve one immutable request',async()=>{
 const f=await fixture();try{
  verified(f);const id=await f.adapter.prepare(invitationRef);f.adapter.acceptReceipt(id,challengeReceipt(f,id));
  const reordered=Object.fromEntries(Object.entries(scope).reverse()),other=await createNativeRecipientCapture({store:f.store,...config,scope:reordered});
  const [first,second]=await Promise.all([f.adapter.prepare(invitationRef),other.prepare(invitationRef)]);
  assert.equal(first,second);assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,2);
  const packet=await f.adapter.packet(first);assert.equal((await other.packet(second)).body,packet.body);
  const foreign=await createNativeRecipientCapture({store:f.store,...config,adapterId:'other-native'});
  assert.equal(foreign.state(invitationRef),null);assert.equal(await foreign.prepare(invitationRef),null);assert.equal(await foreign.packet(first),null);
  f.store.db.prepare('UPDATE native_recipient_requests SET body=? WHERE request_id=?').run(packet.body+' ',first);
  await assert.rejects(f.adapter.packet(first),/immutable_request_corrupt/);
 }finally{f.close();}
});
test('Forwarded-link account cannot preempt intended recipient or overwrite its candidate',async()=>{
 const f=await fixture();try{
  const forwarded=verified(f,'wrong@example.test'),intended=verified(f);
  const wrongId=await f.adapter.prepare(invitationRef,forwarded.user.id),intendedId=await f.adapter.prepare(invitationRef,intended.user.id);
  assert.notEqual(wrongId,intendedId);
  f.adapter.acceptReceipt(wrongId,challengeReceipt(f,wrongId));f.adapter.acceptReceipt(intendedId,challengeReceipt(f,intendedId));
  const wrongProof=JSON.parse((await f.adapter.packet(await f.adapter.prepare(invitationRef,forwarded.user.id))).body),rightProof=JSON.parse((await f.adapter.packet(await f.adapter.prepare(invitationRef,intended.user.id))).body);
  assert.equal(wrongProof.native_account_ref,forwarded.user.id);assert.equal(rightProof.native_account_ref,intended.user.id);
  assert.notEqual(wrongProof.recipient_digest,vector.cases[0].recipient_digest);assert.equal(rightProof.recipient_digest,vector.cases[0].recipient_digest);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_pending').get().n,2);
  assert.equal(f.adapter.state(invitationRef,forwarded.user.id),'challenge_issued');assert.equal(f.adapter.state(invitationRef,intended.user.id),'challenge_issued','No actual core proof receipt is fabricated');
 }finally{f.close();}
});
