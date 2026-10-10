// Isolated native acquisition capture. Native platform mutations remain authoritative.
import {randomUUID,createHash} from 'node:crypto';
import {createPlatform} from '../backend/platform.mjs';
import {cityName} from '../prototype/cities.mjs';
import {signRequest} from './contracts/server-auth.mjs';
import {validateWire} from './wire.mjs';
const json=JSON.stringify,iso=ms=>new Date(ms).toISOString(),hash=raw=>createHash('sha256').update(raw).digest('hex');
const methods=new Set(['selectProcedures','saveOffer','submitOffer','moderateOffer','archiveOffer','createService','createStaff','createResource','submitRevision','moderate','edit','assessQualification','changeTaxonomy','saveLocation','submitLocation','moderateLocation','setLocationActive','assignStaffLocations','migrateOrganizationCatalogue','bulkOfferPrices']);
export function createNativeLifecycleCapture({store,scopeKey,scope,adapterId,sourceRelease,transportKeyId,transportKey,permissions}){
 const {db}=store,platform=createPlatform(store);
 store.transaction(()=>db.exec(`CREATE TABLE IF NOT EXISTS native_acquisition_resolutions(scope_key TEXT NOT NULL,invitation_ref TEXT NOT NULL,receipt TEXT NOT NULL,expires_at INTEGER NOT NULL,state TEXT NOT NULL,PRIMARY KEY(scope_key,invitation_ref));
CREATE TABLE IF NOT EXISTS native_acquisition_providers(scope_key TEXT NOT NULL,provider_ref TEXT NOT NULL,invitation_ref TEXT NOT NULL,account_ref TEXT,counter INTEGER NOT NULL DEFAULT 0,published_revision TEXT,current_active INTEGER NOT NULL DEFAULT 0,eligibility_revision TEXT,terminal INTEGER NOT NULL DEFAULT 0,bound_at INTEGER NOT NULL,PRIMARY KEY(scope_key,provider_ref),UNIQUE(scope_key,invitation_ref));
CREATE TABLE IF NOT EXISTS native_acquisition_events(scope_key TEXT NOT NULL,event_id TEXT NOT NULL,provider_ref TEXT NOT NULL,source_revision INTEGER NOT NULL,body TEXT NOT NULL,body_sha256 TEXT NOT NULL,state TEXT NOT NULL,receipt TEXT,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,lease_token TEXT,error_code TEXT,PRIMARY KEY(scope_key,event_id),UNIQUE(scope_key,provider_ref,source_revision));`));
 const binding=id=>db.prepare('SELECT * FROM native_acquisition_providers WHERE scope_key=? AND provider_ref=?').get(scopeKey,id);
 const event=id=>db.prepare('SELECT * FROM native_acquisition_events WHERE scope_key=? AND event_id=?').get(scopeKey,id);
 function actualUser(user){const row=db.prepare('SELECT id,email,name,operator FROM accounts WHERE site_id=? AND id=?').get(store.siteId,user?.id);if(!row||!Number.isFinite(user?.verifiedAt))throw Error('native_verified_session_required');return {...row,verifiedAt:user.verifiedAt};}
 function queue(id,kind,occurredAt=store.clock(),eligibility=null){
  const b=binding(id);if(!b||b.terminal)throw Error('native_provider_terminal_or_unbound');
  const revision=b.counter+1,body={contract_version:'0.1.1',event_id:randomUUID(),scope,adapter_id:adapterId,invitation_ref:b.invitation_ref,provider_ref:id,source_revision:revision,source_release:sourceRelease,occurred_at:iso(occurredAt),kind,profile_ref:['profile_submitted','profile_active','profile_deactivated'].includes(kind)?id:null,eligibility_revision:kind==='profile_active'?eligibility:null,operator_approved:kind==='profile_active'};
  validateWire('LifecycleEvent',body);const raw=json(body);
  db.prepare('INSERT INTO native_acquisition_events(scope_key,event_id,provider_ref,source_revision,body,body_sha256,state) VALUES(?,?,?,?,?,?,?)').run(scopeKey,body.event_id,id,revision,raw,hash(raw),'ready');
  db.prepare('UPDATE native_acquisition_providers SET counter=? WHERE scope_key=? AND provider_ref=?').run(revision,scopeKey,id);return body.event_id;
 }
 function reconcileOne(id){
  const b=binding(id);if(!b||b.terminal)return;
  // Locally frozen/delegated aggregates require their destination-owned adapter.
  store.assertOrganizationWritable?.(id);
  const profile=platform.profile(id),active=!!b.published_revision&&!!profile?.services.length;
  const qualifications=active?store.readCollections(['qualifications']).qualifications.filter(q=>q.organizationId===id&&q.state==='approved'&&Date.parse(q.expiresAt)>store.clock()&&profile.services.some(s=>s.locationId===q.locationId&&s.taxonomyServiceId===q.taxonomyNodeId)).map(q=>({id:q.id,version:q.version||0,locationId:q.locationId,taxonomyNodeId:q.taxonomyNodeId,expiresAt:q.expiresAt})).sort((a,b)=>a.id.localeCompare(b.id)):[];
  const eligibility=active?'eligibility_'+hash(json({publishedRevision:b.published_revision,qualifications,services:profile.services.map(s=>({id:s.id,version:s.version,locationId:s.locationId,practitionerId:s.practitionerId,resourceId:s.resourceId,staffOptions:s.staffOptions||null})).sort((a,b)=>a.id.localeCompare(b.id))})):null;
  if(active&&(!b.current_active||eligibility!==b.eligibility_revision))queue(id,'profile_active',store.clock(),eligibility);
  else if(!active&&b.current_active)queue(id,'profile_deactivated');
  db.prepare('UPDATE native_acquisition_providers SET current_active=?,eligibility_revision=? WHERE scope_key=? AND provider_ref=?').run(active?1:0,eligibility,scopeKey,id);
 }
 function reconcile(){return store.transaction(()=>{for(const b of db.prepare('SELECT provider_ref FROM native_acquisition_providers WHERE scope_key=? AND terminal=0').all(scopeKey)){if(store.organizationWritable?.(b.provider_ref)===false)continue;reconcileOne(b.provider_ref);}});}
 const erasureHooks=store.nativeRecipientErasureHooks;if(!erasureHooks)throw Error('native_privacy_hook_required');
 erasureHooks.lifecycleHandlers||=new Map();erasureHooks.lifecycleHandlers.set(scopeKey,({clientId,occurredAt})=>{
  for(const b of db.prepare('SELECT * FROM native_acquisition_providers WHERE scope_key=? AND account_ref=? AND terminal=0').all(scopeKey,clientId)){
   queue(b.provider_ref,'account_deleted',occurredAt);db.prepare('UPDATE native_acquisition_providers SET account_ref=NULL,terminal=1,current_active=0,eligibility_revision=NULL WHERE scope_key=? AND provider_ref=?').run(scopeKey,b.provider_ref);
  }
 });
 async function resolvePacket(ref){if(!permissions.has('resolve'))throw Error('resolve_permission_required');const body=json(validateWire('ResolveRequest',{contract_version:'0.1.1',scope,adapter_id:adapterId,invitation_ref:ref,request_id:randomUUID()})),path='/integrations/acquisition/v1/sites/madbeauty/resolve-invitation';return {method:'POST',path,body,headers:await signRequest({keyId:transportKeyId,secret:transportKey,path,body,timestamp:Math.floor(store.clock()/1000)})};}
 function acceptResolution(ref,receipt){return store.transaction(()=>{
  validateWire('Resolution',receipt);if(receipt.contract_version!=='0.1.1'||receipt.objective!=='provider_signup'||receipt.invitation_ref!==ref||Object.entries(scope).some(([k,v])=>receipt.scope[k]!==v))throw Error('resolution_scope_mismatch');
  const existing=db.prepare('SELECT * FROM native_acquisition_resolutions WHERE scope_key=? AND invitation_ref=?').get(scopeKey,ref),expiry=Date.parse(receipt.expires_at);
  if(existing&&existing.expires_at!==expiry)throw Error('original_invitation_expiry_changed');
  if(existing&&['stopped','expired'].includes(existing.state)&&receipt.state==='available')throw Error('invitation_state_cannot_reactivate');
  db.prepare('INSERT INTO native_acquisition_resolutions VALUES(?,?,?,?,?) ON CONFLICT(scope_key,invitation_ref) DO UPDATE SET receipt=excluded.receipt,state=excluded.state').run(scopeKey,ref,json(receipt),expiry,receipt.state);return receipt;
 });}
 function createOrganization(user,input,ref=null){return store.transaction(()=>{
  const actual=actualUser(user),resolution=ref&&db.prepare('SELECT * FROM native_acquisition_resolutions WHERE scope_key=? AND invitation_ref=?').get(scopeKey,ref),candidate=ref&&db.prepare("SELECT * FROM native_recipient_pending WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND state='recipient_bound'").get(scopeKey,ref,actual.id);
  const org=platform.createOrganization(actual,{...input,city:cityName(input.city)||input.city});
  if(!resolution||resolution.state!=='available'||resolution.expires_at<=store.clock()||!candidate||db.prepare('SELECT provider_ref FROM native_acquisition_providers WHERE scope_key=? AND invitation_ref=?').get(scopeKey,ref))return org;
  db.prepare('INSERT INTO native_acquisition_providers(scope_key,provider_ref,invitation_ref,account_ref,bound_at) VALUES(?,?,?,?,?)').run(scopeKey,org.id,ref,actual.id,store.clock());
  queue(org.id,'signup_started',Date.parse(org.createdAt));queue(org.id,'account_verified',Date.parse(candidate.verified_at));return org;
 });}
 function execute(method,user,input){if(!methods.has(method)||typeof platform[method]!=='function')throw Error('unsupported_native_capture_mutation');return store.transaction(()=>{
  const result=platform[method](actualUser(user),input);
  if(method==='submitRevision'&&binding(result.organizationId))queue(result.organizationId,'profile_submitted',Date.parse(result.createdAt));
  if(method==='moderate'&&result.state==='approved'&&binding(result.organizationId))db.prepare('UPDATE native_acquisition_providers SET published_revision=? WHERE scope_key=? AND provider_ref=? AND terminal=0').run(result.id,scopeKey,result.organizationId);
  reconcile();return result;
 });}
 async function packet(id){
  if(!permissions.has('events'))throw Error('events_permission_required');const row=event(id);if(!row||['accepted','permanent'].includes(row.state))return null;if(hash(row.body)!==row.body_sha256)throw Error('immutable_lifecycle_event_corrupt');
  const b=binding(row.provider_ref);if(!b)throw Error('native_provider_unbound');store.assertOrganizationWritable?.(row.provider_ref);const path='/integrations/acquisition/v1/sites/madbeauty/events',headers=await signRequest({keyId:transportKeyId,secret:transportKey,path,body:row.body,timestamp:Math.floor(store.clock()/1000)});
  store.assertOrganizationWritable?.(row.provider_ref);
  return event(id)?.state==='accepted'?null:{method:'POST',path,body:row.body,headers};
 }
 function accept(id,receipt,lease){return store.transaction(()=>{
  const row=event(id);if(!row)throw Error('unknown_lifecycle_event');const raw=json(receipt);if(row.state==='accepted'){if(row.receipt!==raw)throw Error('changed_lifecycle_receipt');return JSON.parse(row.receipt);}
  if(row.state!=='sending'||row.lease_token!==lease||row.lease_until<=store.clock())throw Error('stale_lifecycle_lease');
  validateWire('EventReceipt',receipt);if(receipt.contract_version!=='0.1.1'||receipt.external_sent!==false||receipt.event_id!==id||receipt.source_revision!==row.source_revision)throw Error('lifecycle_receipt_mismatch');
  db.prepare("UPDATE native_acquisition_events SET state='accepted',receipt=?,lease_until=0,lease_token=NULL,error_code=NULL WHERE scope_key=? AND event_id=?").run(raw,scopeKey,id);return receipt;
 });}
 function fail(id,lease,code,permanent=false){store.transaction(()=>{const row=event(id);if(row?.lease_token!==lease||row.state!=='sending')return;db.prepare('UPDATE native_acquisition_events SET state=?,error_code=?,next_at=?,lease_until=0,lease_token=NULL WHERE scope_key=? AND event_id=?').run(permanent||row.attempts>=10?'permanent':'retry',code,store.clock()+Math.min(3600000,1000*2**row.attempts),scopeKey,id);});}
 async function dispatch(id,exchange){
  if(typeof exchange!=='function')throw Error('registered_lifecycle_exchange_required');
  const lease=store.transaction(()=>{const row=event(id);if(!row||['accepted','permanent'].includes(row.state)||row.next_at>store.clock()||row.state==='sending'&&row.lease_until>store.clock())return null;
   if(db.prepare("SELECT event_id FROM native_acquisition_events WHERE scope_key=? AND provider_ref=? AND source_revision<? AND state!='accepted'").get(scopeKey,row.provider_ref,row.source_revision))return null;
   if(row.attempts>=10){fail(id,row.lease_token,'RETRY_EXHAUSTED',true);return null;}const token=randomUUID();db.prepare("UPDATE native_acquisition_events SET state='sending',attempts=attempts+1,lease_until=?,lease_token=? WHERE scope_key=? AND event_id=?").run(store.clock()+30000,token,scopeKey,id);return token;});
  if(!lease)return null;const controller=new AbortController();let timer;
  try{return await Promise.race([(async()=>{const p=await packet(id);if(!p||controller.signal.aborted)throw Error('lifecycle_packet_unavailable');const response=await exchange({...p,signal:controller.signal});if(!(response instanceof Response))throw Error('invalid_lifecycle_response');if(response.status!==200){fail(id,lease,'HTTP_'+response.status,[400,401,403,404,409,410,422].includes(response.status));return null;}
   if(!response.body)throw Error('missing_lifecycle_receipt');const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const n=await reader.read();if(n.done)break;size+=n.value.byteLength;if(size>65536){await reader.cancel();throw Error('lifecycle_response_too_large');}chunks.push(Buffer.from(n.value));}}finally{reader.releaseLock();}return accept(id,JSON.parse(Buffer.concat(chunks).toString('utf8')),lease);
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('lifecycle_timeout'));},15000);})]);}catch{fail(id,lease,'TRANSPORT_OR_RECEIPT');return null;}finally{clearTimeout(timer);}
 }
 const status=()=>db.prepare('SELECT event_id,provider_ref,source_revision,state,attempts,error_code,next_at,lease_until FROM native_acquisition_events WHERE scope_key=? ORDER BY provider_ref,source_revision').all(scopeKey);
 const current=id=>{const b=binding(id);return b?{provider_ref:id,source_revision:b.counter,profile_active:!!b.current_active,terminal:!!b.terminal,published_revision:b.published_revision,eligibility_revision:b.eligibility_revision}:null;};
 return Object.freeze({resolvePacket,acceptResolution,createOrganization,execute,reconcile,packet,dispatch,status,current,taxonomy:()=>platform.taxonomy(),profile:id=>platform.profile(id),workspace:(user,requested)=>platform.workspace(actualUser(user),requested)});
}
