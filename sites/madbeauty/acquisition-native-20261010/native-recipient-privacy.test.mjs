import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRetention} from '../backend/retention.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {createNativeRecipientCapture} from './native-recipient-adapter.mjs';
import {verifySignature} from './contracts/server-auth.mjs';
import {validateWire} from './wire.mjs';
import {captureFixture,configuration,epoch,scope,ref,login,proof,challengeReceipt,boundReceipt,privacyReceipt,eraseInput} from './capture-fixture.mjs';
const count=(f,name)=>f.store.db.prepare('SELECT COUNT(*) n FROM '+name).get().n;
test('Restarted privacy cleanup preserves another configured scope prepared proof without reloading its signer',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'madbeauty-privacy-context-')),filename=join(dir,'native.sqlite'),otherScope={...scope,environment_id:'capture-other'};let f=await captureFixture(filename);
 try{
  const other=await createNativeRecipientCapture({store:f.store,...configuration,scope:otherScope}),g={...f,adapter:other},user=login(g).user,id=await other.prepare(ref,user.id);other.acceptReceipt(id,{...challengeReceipt(f,id),scope:otherScope});const proofId=await other.prepare(ref,user.id),original=JSON.parse((await other.packet(proofId)).body);f.close();f=await captureFixture(filename);
  f.adapter.eraseAccount(user,eraseInput(user));assert.equal(count(f,'native_recipient_pending'),0);assert.equal(count(f,'native_recipient_requests'),0);assert.equal(f.adapter.retirementStatus().length,0);
  const restored=await createNativeRecipientCapture({store:f.store,...configuration,scope:otherScope}),[queued]=restored.retirementStatus(),body=JSON.parse((await restored.retirementPacket(queued.request_id)).body);assert.deepEqual(body.recipient_proof,original);assert.deepEqual(body.scope,otherScope);
 }finally{f.close();rmSync(dir,{recursive:true,force:true});}
});
test('Actual trusted retention.apply stages privacy before scrubbing a native customer',async()=>{const f=await captureFixture();try{
 const user=login(f).user;await proof(f,user);const result=createRetention(f.store).apply({clientId:user.id,requestId:'erasure_capture_target',aliasId:'erased_capture_target',policyVersion:f.store.retentionPolicyVersion});assert.equal(result.state,'completed');assert.equal(count(f,'native_recipient_pending'),0);const row=f.adapter.retirementStatus()[0],body=JSON.parse((await f.adapter.retirementPacket(row.request_id)).body);assert.equal(body.reason,'account_erasure');assert.equal(body.native_account_ref,user.id);
}finally{f.close();}});
test('Actual inactivity closure keeps accepted notice and original policy gates before privacy queueing',async()=>{const f=await captureFixture();try{
 const user=login(f).user;await proof(f,user);const r=createRetention(f.store);r.sweep();f.advance(733*86400000);const account=r.inactiveCandidates().find(x=>x.id===user.id);assert.ok(account);r.notifyInactive(account);assert.equal(r.closeInactive(account,[]),null);const notice=f.store.db.prepare('SELECT notice_mail_id FROM retention_activity WHERE account_id=?').get(user.id);f.store.db.prepare("UPDATE mail_outbox SET state='accepted' WHERE id=?").run(notice.notice_mail_id);assert.equal(r.closeInactive(account,[]),null);f.advance(30*86400000);assert.equal(r.closeInactive(account,[]).state,'completed');assert.equal(count(f,'native_recipient_pending'),0);const row=f.adapter.retirementStatus()[0],body=JSON.parse((await f.adapter.retirementPacket(row.request_id)).body);assert.equal(body.reason,'retention_erasure');
}finally{f.close();}});
test('Actual retention.begin atomically clears candidates and preserves exact lost-ACK proof in encrypted outbox',async()=>{
 const f=await captureFixture();try{
  const actual=login(f).user,p=await proof(f,actual);
  assert.equal(createRetention(f.store).begin(actual,eraseInput(actual)).state,'completed');
  assert.equal(count(f,'native_recipient_pending'),0);assert.equal(count(f,'native_recipient_requests'),0);assert.equal(count(f,'native_recipient_challenges'),0);assert.equal(count(f,'accounts'),0);
  const row=f.store.db.prepare('SELECT * FROM native_recipient_privacy').get();assert.equal(row.state,'ready');assert.equal(JSON.stringify(row).includes(actual.id),false);assert.equal(JSON.stringify(row).includes(actual.email),false);
  const packet=await f.adapter.retirementPacket(row.request_id),body=validateWire('RecipientRetirement',JSON.parse(packet.body));
  assert.equal(body.native_account_ref,actual.id);assert.equal(JSON.stringify(body.recipient_proof),p.packet.body);assert.equal(body.reason,'account_erasure');assert.equal('provider_ref' in body,false);assert.equal(packet.body.includes('@'),false);
  assert.equal(await verifySignature({keyId:configuration.transportKeyId,secret:configuration.transportSecret,method:'POST',path:packet.path,body:packet.body,headers:packet.headers,now:f.clock()/1000}),true);
 }finally{f.close();}
});
test('Erasure failure rolls back outbox/cleanup/identity together; professional guard stays enabled',async()=>{
 const f=await captureFixture();try{
  const actual=login(f).user;await proof(f,actual);
  f.store.db.exec("CREATE TRIGGER fail_privacy BEFORE INSERT ON native_recipient_privacy BEGIN SELECT RAISE(ABORT,'synthetic_privacy_outbox_failure'); END");
  assert.throws(()=>f.adapter.eraseAccount(actual,eraseInput(actual)),/synthetic_privacy_outbox_failure/);
  assert.equal(count(f,'accounts'),1);assert.equal(count(f,'retention_tombstones'),0);assert.equal(count(f,'native_recipient_pending'),1);assert.equal(count(f,'native_recipient_requests'),2);assert.equal(count(f,'native_recipient_privacy'),0);
  f.store.db.exec('DROP TRIGGER fail_privacy');
  const api=createPlatform(f.store);api.createOrganization(actual,{name:'Synthetic privacy guard',bio:'Offline',kind:'solo',city:'Vilnius'});
  assert.throws(()=>f.adapter.eraseAccount(actual,eraseInput(actual)),e=>e.code==='PROFESSIONAL_ACCOUNT');assert.equal(count(f,'native_recipient_privacy'),0);
 }finally{f.close();}
});
test('No prepared core proof/challenge discards private candidate with no fabricated retirement',async()=>{
 const f=await captureFixture();try{
  const actual=login(f).user;assert.equal(f.adapter.eraseAccount(actual,eraseInput(actual)).erasure.state,'completed');
  assert.equal(count(f,'native_recipient_pending'),0);assert.equal(count(f,'native_recipient_requests'),0);assert.equal(count(f,'native_recipient_privacy'),0);
 }finally{f.close();}
});
test('Challenge-only erasure synchronously prepares canonical final proof before identity scrub',async()=>{
 const f=await captureFixture();try{
  const actual=login(f).user,id=await f.adapter.prepare(ref);f.adapter.acceptReceipt(id,challengeReceipt(f,id));f.advance(300001);
  const fresh={...actual,verifiedAt:f.clock()},result=f.adapter.eraseAccount(fresh,eraseInput(actual)),packet=await f.adapter.retirementPacket(result.retirementRequestIds[0]);
  assert.equal(JSON.parse(packet.body).recipient_proof.recipient_digest,'v1=a39e849704152919e268adec4d97256611429ed7ed9f0eae2ac678615476bdf4');assert.equal(count(f,'accounts'),0);
 }finally{f.close();}
});
test('Lost retirement ACK and SQLite restart retry same bytes; accepted payload retires to minimal bounded receipt',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-privacy-retry-')),filename=join(dir,'capture.sqlite');let f;
 try{
  f=await captureFixture(filename);const actual=login(f).user;await proof(f,actual);const result=f.adapter.eraseAccount(actual,eraseInput(actual)),id=result.retirementRequestIds[0],first=await f.adapter.retirementPacket(id),receipt=privacyReceipt(f,id);
  let sent;await f.adapter.dispatchRetirement(id,async p=>{sent=p.body;throw Error('Lost ACK after core commit fixture');});assert.equal(sent,first.body);assert.equal(f.adapter.retirementStatus()[0].state,'retry');
  f.close();f=await captureFixture(filename);f.advance(2001);const retry=await f.adapter.retirementPacket(id);assert.equal(retry.body,first.body);assert.notEqual(retry.headers['X-Acq-Signature'],first.headers['X-Acq-Signature']);
  assert.deepEqual(await f.adapter.dispatchRetirement(id,async p=>{assert.equal(p.body,first.body);return Response.json(receipt);}),receipt);
  const row=f.store.db.prepare('SELECT * FROM native_recipient_privacy').get();assert.equal(row.payload,null);assert.equal(row.state,'accepted');assert.equal(row.attempts,2);assert.equal(JSON.stringify(row).includes(actual.id),false);assert.equal(await f.adapter.retirementPacket(id),null);
  assert.equal(await f.adapter.dispatchRetirement(id,()=>{throw Error('Must not send twice after ACK');}),null);
  f.advance(732*86400000);assert.equal(f.adapter.sweepRetirements(),1);assert.equal(count(f,'native_recipient_privacy'),0);
 }finally{f?.close();rmSync(dir,{recursive:true,force:true});}
});
test('Wrong candidate retirement does not delete intended candidate; original-byte commands never change UUID',async()=>{
 const f=await captureFixture();try{
  const wrong=login(f,'wrong@example.test').user,intended=login(f).user;await proof(f,wrong);await proof(f,intended);
  const id=f.adapter.eraseAccount(wrong,eraseInput(wrong)).retirementRequestIds[0];assert.equal(f.adapter.state(ref,intended.id),'challenge_issued');assert.equal(count(f,'accounts'),1);
  const receipt=privacyReceipt(f,id,'candidate_retired');assert.deepEqual(await f.adapter.dispatchRetirement(id,async()=>Response.json(receipt)),receipt);assert.equal(f.adapter.state(ref,intended.id),'challenge_issued');
 }finally{f.close();}
});
test('Explicit privacy permission, cross-scope receipt rejection and permanent errors preserve encrypted intent',async()=>{
 const f=await captureFixture();try{
  const actual=login(f).user;await proof(f,actual);const id=f.adapter.eraseAccount(actual,eraseInput(actual)).retirementRequestIds[0];
  const restricted=await createNativeRecipientCapture({store:f.store,...configuration,transportPermissions:['recipient-challenge','verify-recipient']});await assert.rejects(restricted.retirementPacket(id),/retirement_permission_required/);
  const wrong={...privacyReceipt(f,id),scope:{...scope,environment_id:'foreign'}};await f.adapter.dispatchRetirement(id,async()=>Response.json(wrong));assert.equal(f.adapter.retirementStatus()[0].state,'retry');assert.ok(f.store.db.prepare('SELECT payload FROM native_recipient_privacy').get().payload);
  f.advance(2001);await f.adapter.dispatchRetirement(id,async()=>new Response('Private error never stored',{status:409}));const row=f.adapter.retirementStatus()[0];assert.equal(row.state,'permanent');assert.equal(row.error_code,'HTTP_409');assert.equal(row.request_id,id);assert.equal(await f.adapter.dispatchRetirement(id,()=>{throw Error('No conflict bypass');}),null);
 }finally{f.close();}
});
test('Concurrent retirement send is leased and retry count is bounded',async()=>{
 const f=await captureFixture();try{
  const actual=login(f).user;await proof(f,actual);const id=f.adapter.eraseAccount(actual,eraseInput(actual)).retirementRequestIds[0];let release,entered;
  const gate=new Promise(r=>release=r),start=new Promise(r=>entered=r),first=f.adapter.dispatchRetirement(id,async()=>{entered();await gate;return Response.json(privacyReceipt(f,id));});await start;
  assert.equal(await f.adapter.dispatchRetirement(id,()=>{throw Error('Concurrent send forbidden');}),null);release();await first;assert.equal(f.adapter.retirementStatus()[0].attempts,1);
 }finally{f.close();}
 const f2=await captureFixture();try{
  const actual=login(f2).user;await proof(f2,actual);const id=f2.adapter.eraseAccount(actual,eraseInput(actual)).retirementRequestIds[0];
  for(let n=0;n<10;n++){await f2.adapter.dispatchRetirement(id,async()=>new Response('Unavailable',{status:503}));f2.advance(3600001);}
  const status=f2.adapter.retirementStatus()[0];assert.equal(status.attempts,10);assert.equal(status.state,'permanent');assert.equal(await f2.adapter.dispatchRetirement(id,()=>{throw Error('No eleventh attempt');}),null);
 }finally{f2.close();}
});
test('Abrupt sender process exit leaves a durable lease which recovers after expiry with identical bytes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-privacy-abandoned-')),filename=join(dir,'capture.sqlite');let f;
 try{
  f=await captureFixture(filename);const actual=login(f).user;await proof(f,actual);const id=f.adapter.eraseAccount(actual,eraseInput(actual)).retirementRequestIds[0],first=await f.adapter.retirementPacket(id);f.close();
  const code=`import {captureFixture} from ${JSON.stringify(new URL('./capture-fixture.mjs',import.meta.url).href)};const f=await captureFixture(${JSON.stringify(filename)});await f.adapter.dispatchRetirement(${JSON.stringify(id)},async()=>{process.exit(0);});process.exit(7);`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:10000});assert.equal(child.status,0,child.stderr);
  f=await captureFixture(filename);assert.equal(f.adapter.retirementStatus()[0].state,'sending');assert.equal(await f.adapter.dispatchRetirement(id,()=>{throw Error('Lease still held');}),null);
  f.advance(30001);const retry=await f.adapter.retirementPacket(id);assert.equal(retry.body,first.body);await f.adapter.dispatchRetirement(id,async()=>Response.json(privacyReceipt(f,id)));assert.equal(f.adapter.retirementStatus()[0].state,'accepted');assert.equal(f.adapter.retirementStatus()[0].attempts,2);
 }finally{f?.close();rmSync(dir,{recursive:true,force:true});}
});
