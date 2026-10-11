// Actual maintained native lifecycle against a caller-owned normal loopback API.
// Seeded synthetic keys, session state and immutable request/ACK bytes stay private.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [sourceArg,laneArg,artifactsArg,phase]=process.argv.slice(2);
assert.ok(['prepare','withdraw','replay'].includes(phase));
const source=resolve(sourceArg),folder=resolve(artifactsArg),lane=JSON.parse(readFileSync(laneArg,'utf8'));
assert.equal(lane.fixture_only,true);assert.equal(lane.scope.site_id,'madbeauty');assert.equal(lane.scope.environment_class,'test');
assert.match(lane.source_release,/^[a-f0-9]{40}$/);assert.equal(lane.base_url,'http://127.0.0.1:18868');assert.ok([403,409].includes(lane.expected_block_status));
const load=file=>import(pathToFileURL(join(source,'sites/madbeauty',file)).href);
const {openStore}=await load('backend/store.mjs'),{RETENTION_POLICY}=await load('backend/retention-policy.mjs');
const {createNativeRecipientCapture}=await load('acquisition-native-20261010/native-recipient-adapter.mjs');
const {signRequest}=await load('acquisition-native-20261010/contracts/server-auth.mjs');
mkdirSync(folder,{recursive:true});const statePath=join(folder,'recovery.private.json');
if(phase==='prepare')assert.equal(existsSync(statePath),false,'Do not overwrite a consumed lane');
const state=phase==='prepare'?{secret:randomBytes(32).toString('hex'),source_release:lane.source_release,events:[]}:JSON.parse(readFileSync(statePath,'utf8'));
assert.equal(state.source_release,lane.source_release);
const store=openStore({filename:join(folder,'native.sqlite'),secret:state.secret,clock:Date.now});store.retentionPolicyVersion=RETENTION_POLICY.version;
const adapter=await createNativeRecipientCapture({store,scope:lane.scope,adapterId:lane.adapter_id,sourceRelease:lane.source_release,
 recipientKeyId:lane.recipient_key_id,recipientSecret:Uint8Array.from(Buffer.from(lane.recipient_secret_hex,'hex')),
 transportKeyId:lane.transport_key_id,transportSecret:Uint8Array.from(Buffer.from(lane.transport_secret_hex,'hex')),
 transportPermissions:['recipient-challenge','verify-recipient','retire-recipient','resolve','events'],captureOnly:true});
const exchange=packet=>fetch(lane.base_url+packet.path,{method:'POST',headers:packet.headers,body:packet.body,signal:packet.signal||AbortSignal.timeout(5000),redirect:'error'});
const login=(email,invitation=true)=>{const session=adapter.auth.session(null),start=invitation?adapter.startInvitation(session,{invitationRef:lane.invitation_ref,email,ip:'synthetic-normal'}):adapter.auth.start(session,email,'synthetic-normal');const code=store.capture(start.challengeId).code;return invitation?adapter.verifyInvitation(session,{challengeId:start.challengeId,code,ip:'synthetic-normal'}).user:adapter.auth.verify(session,start.challengeId,code,'synthetic-normal').user;};
async function acceptRequest(id){const response=await exchange(await adapter.packet(id));assert.equal(response.status,200);adapter.acceptReceipt(id,await response.json());}
async function capture(row){const packet=await adapter.lifecycle.packet(row.event_id);assert.ok(packet);let raw;
 const ack=await adapter.lifecycle.dispatch(row.event_id,async p=>{assert.equal(p.body,packet.body);const response=await exchange(p);assert.equal(response.status,200);raw=await response.clone().text();return response;});
 assert.ok(ack);assert.equal(ack.external_sent,false);state.events.push({body:packet.body,receipt:raw});return ack;
}
try{
 const l=adapter.lifecycle;
 if(phase==='prepare'){
  const user=login('owner@example.test');await acceptRequest(await adapter.prepare(lane.invitation_ref,user.id));await acceptRequest(await adapter.prepare(lane.invitation_ref,user.id));
  const response=await exchange(await l.resolvePacket(lane.invitation_ref));assert.equal(response.status,200);l.acceptResolution(lane.invitation_ref,await response.json());
  const org=l.createOrganization(user,{name:'Blocked withdrawal fixture',bio:'Synthetic actual normal lifecycle',kind:'salon',city:'Vilnius'},lane.invitation_ref),professional={role:'professional',organizationId:org.id},w=l.workspace(user,professional),op=login('operator@example.test',false);
  store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(op.id);
  const [offer]=l.execute('selectProcedures',user,{organizationId:org.id,procedureIds:['kirpimai-vyru-kirpimas'],version:0,idempotencyKey:'normal-withdrawal'}),saved=l.execute('saveOffer',user,{id:offer.id,version:offer.version,label:'Native withdrawal service',variants:[{id:'withdrawal-variant',label:'Variant',priceMinor:2200,durationMin:30,staffOptions:[{practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id}]}]}),pending=l.execute('submitOffer',user,{id:saved.id,version:saved.version});
  l.execute('moderateOffer',op,{id:pending.id,version:pending.version,state:'approved'});const revision=l.execute('submitRevision',user,{scope:professional,name:org.name,bio:org.bio});l.execute('moderate',op,{id:revision.id,state:'approved'});
  const active=[];for(const row of l.status())active.push((await capture(row)).profile_active);assert.deepEqual(active,[false,false,false,true]);
  state.user=user;state.provider=org.id;state.professional=professional;state.org=org;
 }else if(phase==='withdraw'){
  assert.equal(l.current(state.provider).profile_active,true);
  l.execute('submitRevision',state.user,{scope:state.professional,name:'Pending after normal module admission ended',bio:state.org.bio});const blocked=l.status().at(-1);
  let attempted=0;assert.equal(await l.dispatch(blocked.event_id,async p=>{attempted++;const response=await exchange(p);assert.equal(response.status,lane.expected_block_status);return response;}),null);assert.equal(attempted,1);
  const before={...store.db.prepare('SELECT * FROM native_acquisition_events WHERE event_id=?').get(blocked.event_id)};assert.equal(before.state,'permanent');state.blocked=before;
  const offer=l.workspace(state.user,state.professional).offers[0];l.execute('archiveOffer',state.user,{id:offer.id,version:offer.version});const withdrawal=l.status().at(-1);assert.equal(JSON.parse((await l.packet(withdrawal.event_id)).body).kind,'profile_deactivated');
  assert.equal((await capture(withdrawal)).profile_active,false);assert.equal(l.current(state.provider).profile_active,false);
  assert.deepEqual({...store.db.prepare('SELECT * FROM native_acquisition_events WHERE event_id=?').get(blocked.event_id)},before);
 }else{
  assert.equal(l.current(state.provider).profile_active,false);assert.deepEqual({...store.db.prepare('SELECT * FROM native_acquisition_events WHERE event_id=?').get(state.blocked.event_id)},state.blocked);
  for(const event of state.events){const path='/integrations/acquisition/v1/sites/madbeauty/events',headers=await signRequest({keyId:lane.transport_key_id,secret:Uint8Array.from(Buffer.from(lane.transport_secret_hex,'hex')),path,body:event.body,timestamp:Math.floor(Date.now()/1000)});const response=await exchange({path,headers,body:event.body});assert.equal(response.status,200);assert.equal(await response.text(),event.receipt);}
  for(const row of l.status().filter(x=>x.state==='accepted'))assert.equal(await l.dispatch(row.event_id,async()=>{throw Error('No accepted resend');}),null);
 }
 writeFileSync(statePath,JSON.stringify(state));console.log(JSON.stringify({status:'PASS',phase,source_release:lane.source_release,actual_tcp:true,native_restart:phase!=='prepare',external_sent:false}));
}finally{store.close();}
