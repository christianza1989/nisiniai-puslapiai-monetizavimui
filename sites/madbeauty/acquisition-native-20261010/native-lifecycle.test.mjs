import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {captureFixture,login,proof,boundReceipt,ref,scope,eraseInput} from './capture-fixture.mjs';
import {CITIES} from '../prototype/cities.mjs';
import {createRetention} from '../backend/retention.mjs';
const resolution=f=>({contract_version:'0.1.1',scope,invitation_ref:ref,objective:'provider_signup',offer_revision:'offer-test',expires_at:new Date(f.clock()+3600000).toISOString(),state:'available'});
const orgInput={name:'Native lifecycle fixture',bio:'Isolated actual native mutation',kind:'salon',city:'vilnius'};
async function attributed(f){const user=login(f).user,p=await proof(f,user);f.adapter.acceptReceipt(p.id,boundReceipt(f,p.id));f.adapter.lifecycle.acceptResolution(ref,resolution(f));const org=f.adapter.lifecycle.createOrganization(user,orgInput,ref);return {user,org,l:f.adapter.lifecycle,scope:{role:'professional',organizationId:org.id}};}
function operator(f){const user=login(f,'operator@example.test','O'.repeat(32)).user;f.store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(user.id);return user;}
function published(f,a,op){const w=a.l.workspace(a.user,a.scope),[offer]=a.l.execute('selectProcedures',a.user,{organizationId:a.org.id,procedureIds:['kirpimai-vyru-kirpimas'],version:0,idempotencyKey:'selection'}),saved=a.l.execute('saveOffer',a.user,{id:offer.id,version:offer.version,label:'Native service',variants:[{id:'native-variant',label:'Native variant',priceMinor:2200,durationMin:30,staffOptions:[{practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id}]}]}),pending=a.l.execute('submitOffer',a.user,{id:saved.id,version:saved.version});a.l.execute('moderateOffer',op,{id:pending.id,version:pending.version,state:'approved'});return {w,offer:pending};}
const receipt=(row,active=false)=>({contract_version:'0.1.1',event_id:row.event_id,state:'applied',source_revision:row.source_revision,profile_active:active,external_sent:false});
test('Actual native provider has stable identity, all-city mapping, atomic monotonic counter and one-ref binding',async()=>{const f=await captureFixture();try{
 const a=await attributed(f);assert.match(a.org.id,/^provider_/);assert.equal(a.org.city,'Vilnius');assert.deepEqual(a.l.status().map(x=>x.source_revision),[1,2]);
 for(const row of a.l.status()){const body=JSON.parse((await a.l.packet(row.event_id)).body);assert.equal(body.provider_ref,a.org.id);assert.ok(!JSON.stringify(body).includes(a.user.email));}
 assert.equal(a.l.createOrganization(a.user,orgInput,ref).city,'Vilnius');assert.equal(a.l.status().length,2);
 const [slug,name]=CITIES.find(([slug])=>slug==='zarasai');assert.equal(a.l.createOrganization(a.user,{...orgInput,city:slug}).city,name);
 const before=f.store.read();f.store.db.exec("CREATE TRIGGER reject_lifecycle_event BEFORE INSERT ON native_acquisition_events BEGIN SELECT RAISE(ABORT,'injected_outbox_failure'); END;");
 const secondRef='S'.repeat(32),second=login(f,'second@example.test',secondRef).user,pr=await proof(f,second,secondRef);f.adapter.acceptReceipt(pr.id,boundReceipt(f,pr.id,secondRef));a.l.acceptResolution(secondRef,{...resolution(f),invitation_ref:secondRef});
 assert.throws(()=>a.l.createOrganization(second,orgInput,secondRef),/injected_outbox_failure/);assert.equal(f.store.read().organizations.length,before.organizations.length);assert.equal(a.l.status().length,2);
}finally{f.close();}});
test('Native approval, pending revision, offer withdrawal and restored staff follow current eligibility',async()=>{const f=await captureFixture();try{
 const a=await attributed(f),op=operator(f),p=published(f,a,op),r=a.l.execute('submitRevision',a.user,{scope:a.scope,name:a.org.name,bio:a.org.bio});assert.equal(a.l.current(a.org.id).profile_active,false);
 assert.throws(()=>a.l.execute('moderate',{...a.user,operator:true},{id:r.id,state:'approved'}),e=>e.code==='FORBIDDEN');assert.equal(a.l.status().length,3);
 a.l.execute('moderate',op,{id:r.id,state:'approved'});assert.equal(a.l.current(a.org.id).profile_active,true);assert.equal(a.l.current(a.org.id).published_revision,r.id);
 const next=a.l.execute('submitRevision',a.user,{scope:a.scope,name:'Private pending title',bio:a.org.bio});assert.equal(next.state,'pending');assert.equal(a.l.current(a.org.id).profile_active,true);assert.equal(a.l.profile(a.org.id).name,a.org.name);
 a.l.execute('moderate',op,{id:next.id,state:'returned',reason:'Fixture review'});assert.equal(a.l.current(a.org.id).profile_active,true);
 const staff=p.w.practitioners[0];a.l.execute('edit',a.user,{scope:a.scope,table:'practitioners',id:staff.id,version:staff.version,values:{active:false}});assert.equal(a.l.current(a.org.id).profile_active,false);
 a.l.execute('edit',a.user,{scope:a.scope,table:'practitioners',id:staff.id,version:staff.version+1,values:{active:true}});assert.equal(a.l.current(a.org.id).profile_active,true);
 const offer=a.l.workspace(a.user,a.scope).offers[0];a.l.execute('archiveOffer',a.user,{id:offer.id,version:offer.version});assert.equal(a.l.current(a.org.id).profile_active,false);
 const kinds=[];for(const row of a.l.status())kinds.push(JSON.parse((await a.l.packet(row.event_id)).body).kind);
 assert.deepEqual(kinds,['signup_started','account_verified','profile_submitted','profile_active','profile_submitted','profile_deactivated','profile_active','profile_deactivated']);assert.deepEqual(a.l.status().map(x=>x.source_revision),[1,2,3,4,5,6,7,8]);
 assert.throws(()=>f.adapter.eraseAccount(a.user,eraseInput(a.user)),e=>e.code==='PROFESSIONAL_ACCOUNT');assert.equal(a.l.current(a.org.id).terminal,false);
}finally{f.close();}});
test('Native lifecycle retries immutable bytes after restart; historic ACK never changes current native eligibility',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'madbeauty-lifecycle-'));let f=await captureFixture(path.join(dir,'native.sqlite'));try{
  const a=await attributed(f),op=operator(f);published(f,a,op);const r=a.l.execute('submitRevision',a.user,{scope:a.scope,name:a.org.name,bio:a.org.bio});a.l.execute('moderate',op,{id:r.id,state:'approved'});
  let rows=a.l.status();assert.equal(await a.l.dispatch(rows[1].event_id,async()=>{throw Error('out_of_order');}),null);
  const first=await a.l.packet(rows[0].event_id);await a.l.dispatch(rows[0].event_id,async()=>{throw Error('lost_ack');});f.close();f=await captureFixture(path.join(dir,'native.sqlite'));f.advance(3000);
  assert.equal((await f.adapter.lifecycle.packet(rows[0].event_id)).body,first.body);assert.notEqual((await f.adapter.lifecycle.packet(rows[0].event_id)).headers['X-Acq-Signature'],first.headers['X-Acq-Signature']);
  for(const row of rows)assert.ok(await f.adapter.lifecycle.dispatch(row.event_id,async()=>new Response(JSON.stringify(receipt(row,row.source_revision===4)))));
  const offer=f.adapter.lifecycle.workspace(a.user,a.scope).offers[0];f.adapter.lifecycle.execute('archiveOffer',a.user,{id:offer.id,version:offer.version});assert.equal(f.adapter.lifecycle.current(a.org.id).profile_active,false);
  assert.equal(await f.adapter.lifecycle.dispatch(rows[3].event_id,async()=>{throw Error('must_not_repeat_accepted');}),null);assert.equal(f.adapter.lifecycle.current(a.org.id).profile_active,false);
 }finally{f.close();await rm(dir,{recursive:true,force:true});}
});
test('Original expiry, stop and unproved recipient preserve ordinary native signup without attribution revival',async()=>{for(const state of ['expired','stopped','unproved']){const f=await captureFixture();try{
 const user=login(f).user;if(state!=='unproved'){const p=await proof(f,user);f.adapter.acceptReceipt(p.id,boundReceipt(f,p.id));}
 f.adapter.lifecycle.acceptResolution(ref,{...resolution(f),state:state==='stopped'?'stopped':'available'});if(state==='expired')f.advance(3600001);
 if(state==='stopped')assert.throws(()=>f.adapter.lifecycle.acceptResolution(ref,resolution(f)),/cannot_reactivate/);
 assert.match(f.adapter.lifecycle.createOrganization(user,orgInput,ref).id,/^provider_/);assert.equal(f.adapter.lifecycle.status().length,0);
 assert.throws(()=>f.adapter.lifecycle.acceptResolution(ref,{...resolution(f),expires_at:new Date(f.clock()+7200000).toISOString()}),/original_invitation_expiry_changed/);
}finally{f.close();}}});
test('Canonical qualification expiry and location disable withdraw actual active profile after invitation expiry',async()=>{const f=await captureFixture();try{
 const a=await attributed(f),op=operator(f);a.l.execute('changeTaxonomy',op,{version:a.l.taxonomy().version,operation:'add',kind:'treatment',nodeId:'kirpimai-capture-qualified',parentId:'kirpimai',label:'Native qualified fixture',aliases:[]});
 const w=a.l.workspace(a.user,a.scope),[offer]=a.l.execute('selectProcedures',a.user,{organizationId:a.org.id,procedureIds:['kirpimai-capture-qualified'],version:0,idempotencyKey:'qualified-selection'}),saved=a.l.execute('saveOffer',a.user,{id:offer.id,version:offer.version,label:'Qualified native service',variants:[{id:'qualified-variant',label:'Variant',priceMinor:2200,durationMin:30,staffOptions:[{practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id}]}]});
 a.l.execute('assessQualification',op,{organizationId:a.org.id,locationId:a.org.locationId,taxonomyNodeId:'kirpimai-capture-qualified',evidenceReference:'Public synthetic fixture',expiresAt:new Date(f.clock()+7200000).toISOString()});
 const pending=a.l.execute('submitOffer',a.user,{id:saved.id,version:saved.version});a.l.execute('moderateOffer',op,{id:pending.id,version:pending.version,state:'approved'});const r=a.l.execute('submitRevision',a.user,{scope:a.scope,name:a.org.name,bio:a.org.bio});a.l.execute('moderate',op,{id:r.id,state:'approved'});
 assert.equal(a.l.current(a.org.id).profile_active,true);f.advance(7200001);a.l.reconcile();assert.equal(a.l.current(a.org.id).profile_active,false);assert.equal(a.l.current(a.org.id).source_revision,5);
 a.l.execute('assessQualification',op,{organizationId:a.org.id,locationId:a.org.locationId,taxonomyNodeId:'kirpimai-capture-qualified',evidenceReference:'Renewed fixture',expiresAt:new Date(f.clock()+7200000).toISOString()});assert.equal(a.l.current(a.org.id).profile_active,true);
 const location=a.l.workspace(a.user,a.scope).locations[0];a.l.execute('setLocationActive',a.user,{id:location.id,version:location.version||0,active:false});assert.equal(a.l.current(a.org.id).profile_active,false);
 a.l.execute('setLocationActive',a.user,{id:location.id,version:(location.version||0)+1,active:true});assert.equal(a.l.current(a.org.id).profile_active,true);assert.equal(a.l.current(a.org.id).source_revision,8);
}finally{f.close();}});

test('Explicit lifecycle permissions, permanent failures, concurrent lease and bounded retries keep counter stable',async()=>{const f=await captureFixture();try{
 const a=await attributed(f),first=a.l.status()[0];let release,calls=0,markStarted;const started=new Promise(resolve=>markStarted=resolve),sending=a.l.dispatch(first.event_id,()=>{calls++;return new Promise(resolve=>{release=resolve;markStarted();});});
 assert.equal(await a.l.dispatch(first.event_id,async()=>{throw Error('duplicate send');}),null);await started;release(new Response('{}',{status:409}));assert.equal(await sending,null);assert.equal(calls,1);assert.equal(a.l.status()[0].state,'permanent');assert.equal(a.l.current(a.org.id).source_revision,2);
 assert.equal(await a.l.dispatch(a.l.status()[1].event_id,async()=>{throw Error('blocked behind permanent intent');}),null);
}finally{f.close();}
 const noGrant=await captureFixture(':memory:',{transportPermissions:['recipient-challenge','verify-recipient']});try{const a=await attributed(noGrant);await assert.rejects(a.l.resolvePacket(ref),/resolve_permission/);await assert.rejects(a.l.packet(a.l.status()[0].event_id),/events_permission/);}finally{noGrant.close();}
 const retry=await captureFixture();try{const a=await attributed(retry),id=a.l.status()[0].event_id;for(let i=0;i<10;i++){await a.l.dispatch(id,async()=>new Response('private body',{status:503}));retry.advance(3600001);}assert.equal(a.l.status()[0].state,'permanent');assert.equal(a.l.status()[0].attempts,10);assert.equal(a.l.current(a.org.id).source_revision,2);}finally{retry.close();}
});

test('Frozen native organization cannot emit lifecycle from a stale local writer',async()=>{const f=await captureFixture();try{
 const a=await attributed(f),before=a.l.status();f.store.organizationWritable=()=>false;f.store.assertOrganizationWritable=()=>{throw Error('ORGANIZATION_MIGRATING');};
 a.l.reconcile();assert.deepEqual(a.l.status(),before);await assert.rejects(a.l.packet(before[0].event_id),/ORGANIZATION_MIGRATING/);assert.throws(()=>a.l.execute('createResource',a.user,{organizationId:a.org.id,label:'Frozen fixture'}),/ORGANIZATION_MIGRATING/);assert.deepEqual(a.l.status(),before);
}finally{f.close();}});

test('Trusted native maintenance erasure records terminal only after real account removal; ordinary professional erasure stays blocked',async()=>{const f=await captureFixture();try{
 const a=await attributed(f);assert.throws(()=>f.adapter.eraseAccount(a.user,eraseInput(a.user)),e=>e.code==='PROFESSIONAL_ACCOUNT');assert.equal(a.l.status().length,2);
 // This is the existing trusted internal target/restore maintenance entry point,
 // exercised on disposable storage. It is not a new customer or professional API.
 createRetention(f.store).apply({clientId:a.user.id,requestId:'erasure_native_maintenance',aliasId:'erased_native_maintenance',policyVersion:f.store.retentionPolicyVersion});
 assert.equal(f.store.db.prepare('SELECT id FROM accounts WHERE id=?').get(a.user.id),undefined);assert.equal(a.l.current(a.org.id).terminal,true);assert.equal(a.l.current(a.org.id).profile_active,false);assert.equal(a.l.current(a.org.id).source_revision,3);
 const row=a.l.status()[2],body=JSON.parse((await a.l.packet(row.event_id)).body);assert.equal(body.kind,'account_deleted');assert.equal(body.provider_ref,a.org.id);assert.equal(body.operator_approved,false);assert.equal(body.eligibility_revision,null);assert.equal(f.store.db.prepare('SELECT account_ref FROM native_acquisition_providers').get().account_ref,null);
 a.l.reconcile();assert.equal(a.l.status().length,3);assert.throws(()=>a.l.createOrganization(a.user,orgInput,ref),/native_verified_session_required/);
}finally{f.close();}});
