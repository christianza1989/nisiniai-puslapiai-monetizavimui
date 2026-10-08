import {ApiError,randomId,reject} from './primitives.mjs';
import {membershipScope,requireCapability,canManageProfile} from './permissions.mjs';
import {createPlatform} from './platform.mjs';
import {organizationTransferProof as proof,sameTransferProof as equal,organizationCollections} from './organization-handoff.mjs';
import {invokePlatform,publicRpcMethods} from './rpc-contract.mjs';
import {groupSearchRows} from './search-results.mjs';
import {createDirectoryCacheIssuer,createDirectoryCacheReceiver,createDirectoryIdentityEffects} from './organization-directory-cache.mjs';
import {createCustomerControlQueue,createCustomerControlReceiver} from './organization-customer-controls.mjs';
import {createClientAdmissionQueue,createClientAdmissionReceipts,clientAdmissionInput} from './organization-client-admission.mjs';
import {createOrganizationMailbox,createOrganizationMailReceipts,validateOrganizationMailClaim} from './organization-mail.mjs';
import {validateOrganizationMediaBytes} from './organization-media.mjs';
import {createOrganizationUploadQueue,createOrganizationUploadReceiver,validateUploadObjects} from './organization-upload.mjs';

const json=JSON.stringify,clone=v=>JSON.parse(json(v)),maxTargets=32,maxResultBytes=1024*1024;
const unavailable=()=>reject('ORGANIZATION_UNAVAILABLE','Organizacijos duomenys laikinai nepasiekiami. Bandykite dar kartą.',503);
const signed=(store,type,body)=>({...body,proof:proof(store,type,body)});
function verify(store,type,packet){const {proof:signature,...body}=packet||{};if(!equal(signature,proof(store,type,body)))reject('FORBIDDEN','Organizacijos užklausa nepatvirtinta.',403);return body;}
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const entityTables=new Set(organizationCollections);
const direct=new Set(['migrateOrganizationCatalogue','createStaff','createResource','createService','createBusyBlock','selectProcedures','requestProcedure','assessQualification','saveGallery','saveBookingRules','saveClientCard','bulkOfferPrices','createClient','grantMembership','organizationReport','reportCsv','exportOfferCsv']);
const byId={profile:['organizations'],option:['services'],saveOffer:['offers'],submitOffer:['offers'],moderateOffer:['offers'],archiveOffer:['offers'],submitLocation:['locations'],moderateLocation:['locations'],setLocationActive:['locations'],assignStaffLocations:['practitioners'],revokeMembership:['memberships'],moderateProcedure:['procedureRequests'],releaseBusyBlock:['busyBlocks'],releaseHold:['holds'],cancelBooking:['bookings'],changeBooking:['bookings'],changeVisit:['bookings'],completeBooking:['bookings'],rebooking:['bookings'],acceptWaitlist:['waitlist'],closeWaitlist:['waitlist'],moderate:['revisions'],moderateReview:['reviews'],reviewReport:['reports'],retryOutbox:['mail_outbox']};
const targetMethods=new Set([...direct,...Object.keys(byId),'catalog','search','searchResults','availability','visitAvailability','hold','holdVisit','confirm','confirmVisit','manualVisit','message','review','report','saveMenuGroup','saveLocation','submitRevision','edit','createInquiry','createWaitlist','session','customerFragment','customerExportFragment','erasureBookings','publicProfiles','resolveReference']);
// Only the directory selects a second identity from its central account registry.
const identityMethods=new Set(['createClient','grantMembership']);
const systemMethods=new Set(['organizationMailCandidates','organizationMailDueAt','ackOrganizationMail']);
const readMethods=new Set([...publicRpcMethods,'session','customerFragment','customerExportFragment','erasureBookings','publicProfiles','resolveReference','workspace','rebooking','organizationReport','reportCsv','exportOfferCsv']);
targetMethods.add('workspace');
targetMethods.add('metrics');readMethods.add('metrics');
targetMethods.add('mediaReadAccess');readMethods.add('mediaReadAccess');
targetMethods.add('mediaUploadAccess');readMethods.add('mediaUploadAccess');
targetMethods.add('attachUploadedMedia');
for(const method of [...systemMethods,'claimOrganizationMail'])targetMethods.add(method);
// Candidate refresh runs deterministic alarm reconciliation; it is repeatable
// without storing a transport nonce for every idle background poll.
for(const method of ['organizationMailCandidates','organizationMailDueAt'])readMethods.add(method);
targetMethods.add('applyCustomerControls');
targetMethods.add('identityActionScope');readMethods.add('identityActionScope');
const fields=['bookings','messages','reviews','inquiries','waitlist','reports'];
const exportFields=[...fields,'organizationCards'];
function reference(method,input){
 if(['mediaUploadAccess','attachUploadedMedia'].includes(method))return {organizationId:input.organizationId};
 if(method==='mediaReadAccess')return {tables:['media'],id:input.id};
 if(['claimOrganizationMail','ackOrganizationMail'].includes(method))return {tables:['mail_outbox'],id:input.id};
 if(method==='identityActionScope')return {organizationId:input.organizationId};
 if(direct.has(method))return {organizationId:input.organizationId};
 if(byId[method])return {tables:byId[method],id:input.id};
 if(['hold','availability','createInquiry','createWaitlist'].includes(method))return {tables:['services'],id:input.providerServiceId};
 if(['holdVisit','visitAvailability'].includes(method))return {tables:['services'],id:input.items?.[0]?.providerServiceId};
 if(['confirm','confirmVisit'].includes(method))return {tables:['holds'],id:input.holdId};
 if(method==='manualVisit')return {tables:['services'],id:input.candidate?.providerServiceId};
 if(['message','review'].includes(method))return {tables:['bookings'],id:input.bookingId};
 if(method==='report')return {tables:['organizations','reviews','media'],id:input.target};
 if(method==='saveMenuGroup'||method==='saveLocation')return input.id?{tables:[method==='saveMenuGroup'?'menuGroups':'locations'],id:input.id}:{organizationId:input.organizationId};
 if(method==='submitRevision')return {organizationId:input.scope?.organizationId};
 if(method==='workspace'&&input.role==='professional')return {organizationId:input.organizationId};
 if(method==='edit'&&entityTables.has(input.table))return {tables:[input.table],id:input.id};
 return null;
}
function owner(store,ref){
 if(ref.organizationId)return ref.organizationId;
 for(const table of ref.tables||[]){if(table==='mail_outbox'){const r=store.db.prepare('SELECT organization_id FROM mail_outbox WHERE site_id=? AND id=?').get(store.siteId,ref.id);if(r)return r.organization_id;}
  else {const r=store.recordById(table,ref.id);if(r)return r.organizationId||r.id;}}
 return null;
}
function indexSchema(store){store.db.exec('CREATE INDEX IF NOT EXISTS directory_entity_owner ON state_rows(site_id,record_key,organization_id);');}
function resultReferences(store,result,organizationId){
 const ids=new Set(),visit=v=>{if(Array.isArray(v)){for(const x of v)visit(x);}else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if((k==='id'||k.endsWith('Id'))&&validId(x))ids.add(x);else if(typeof x==='object')visit(x);}};visit(result);
 if(ids.size>1024)reject('CAPACITY','Per didelis organizacijos atsakymas.',503);
 const references=[];for(const id of ids)for(const row of store.db.prepare('SELECT collection FROM state_rows WHERE site_id=? AND record_key=? AND organization_id=?').all(store.siteId,'id:'+id,organizationId))if(entityTables.has(row.collection))references.push({collection:row.collection,id});
 return references;
}

// Only the directory signs this envelope after its usual HTTP session/origin/CSRF
// checks. Targets have no HTTP dispatcher, session cookies or auth challenges.
export function createOrganizationCommand(store,{targetName,writeMediaObjects}={}){
 indexSchema(store);
 const cache=createDirectoryCacheReceiver(store),effects=createDirectoryIdentityEffects(store),controls=createCustomerControlReceiver(store),admissions=createClientAdmissionReceipts(store),mailbox=createOrganizationMailbox(store),uploads=createOrganizationUploadReceiver(store,{writeObjects:writeMediaObjects});
 store.db.exec('CREATE TABLE IF NOT EXISTS organization_directory_commands(site_id TEXT NOT NULL,nonce TEXT NOT NULL,expires_at INTEGER NOT NULL,request_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(site_id,nonce)); CREATE INDEX IF NOT EXISTS directory_commands_expiry ON organization_directory_commands(site_id,expires_at);');
 function execute(packet,mediaObjects){return store.transaction(()=>{
  const body=verify(store,'directory-command',packet),a=store.db.prepare('SELECT * FROM organization_target_authority WHERE site_id=?').get(store.siteId);
  if(!a||a.state!=='active'||body.schemaVersion!==1||body.siteId!==store.siteId||body.organizationId!==a.organization_id||body.epoch!==a.epoch||body.targetName!==targetName||targetName!=='madbeauty:organization:v1:'+a.organization_id)unavailable();
  if(!validId(body.nonce)||!Number.isSafeInteger(body.expiresAt)||body.expiresAt<=store.clock()||body.expiresAt>store.clock()+30000||Buffer.byteLength(json(packet))>maxResultBytes+32768||Buffer.byteLength(json(body.input||{}))>32768)reject('INVALID_INPUT','Organizacijos užklausa paseno arba yra per didelė.');
  if(!targetMethods.has(body.method))reject('GLOBAL_IDENTITY_REQUIRED','Šiam veiksmui reikia centrinės paskyros patvirtinimo.',503);
  const actor=body.actor;if(actor&&(Object.keys(actor).some(k=>!['id','email','name','operator','verifiedAt'].includes(k))||!validId(actor.id)||typeof actor.email!=='string'||typeof actor.name!=='string'||typeof actor.operator!=='boolean'))reject('FORBIDDEN','Netinkama paskyros tapatybė.',403);
  if(!readMethods.has(body.method)&&!actor&&!systemMethods.has(body.method))reject('UNAUTHENTICATED','Prisijunkite.',401);
  if(systemMethods.has(body.method)&&actor)reject('FORBIDDEN','Netinkama vidinės užduoties tapatybė.',403);
  const ref=reference(body.method,body.input||{}),organizationId=a.organization_id;
  if(ref&&owner(store,ref)!==organizationId)reject('FORBIDDEN','Įrašas nepriklauso šiai organizacijai.',403);
  if(body.input?.organizationId&&body.input.organizationId!==organizationId||body.input?.scope?.role==='professional'&&body.input.scope.organizationId!==organizationId)reject('FORBIDDEN','Kita organizacija.',403);
  const requestHash=proof(store,'directory-request',body),old=store.db.prepare('SELECT request_hash,response FROM organization_directory_commands WHERE site_id=? AND nonce=?').get(store.siteId,body.nonce);
  if(old){if(old.request_hash!==requestHash)reject('IDEMPOTENCY_CONFLICT','Užklausos tapatybė jau panaudota.',409);return JSON.parse(old.response);}
  const recovered=admissions.check(body.method,actor,body.input,body.clientAdmission,body.cache);
  if(recovered)return signed(store,'directory-result',{schemaVersion:1,siteId:store.siteId,organizationId,epoch:a.epoch,targetName,nonce:body.nonce,result:recovered,identityEffect:null,references:resultReferences(store,recovered,organizationId)});
  let identityCapacity=true;
  if(identityMethods.has(body.method)||body.method==='identityActionScope'){
   if(!actor)reject('UNAUTHENTICATED','Prisijunkite.',401);
   const operation=body.method==='identityActionScope'?body.input?.operation:body.method;
   if(!identityMethods.has(operation))reject('INVALID_INPUT','Netinkamas paskyros veiksmas.');
   const view=store.readOrganization(organizationId,[actor.id]);
   requireCapability(membershipScope(view,actor,organizationId),operation==='createClient'?'clients':'access');
   identityCapacity=(view.clientLinks||[]).length<1000;
  }
  cache.apply(body.cache,actor,a.epoch,{method:body.method,input:body.input});
  const identityBefore=actor&&['confirm','confirmVisit'].includes(body.method)?store.recordById('clients',actor.id):null;
  const api=createPlatform(store);let result;
  if(body.method==='organizationMailCandidates'){api.runAutomation();result=mailbox.candidates();}
  else if(body.method==='organizationMailDueAt')result=mailbox.nextAt();
  else if(body.method==='claimOrganizationMail')result=mailbox.claim(actor,body.input);
  else if(body.method==='ackOrganizationMail')result=mailbox.acknowledge(body.input);
  else if(body.method==='mediaUploadAccess')result=uploads.access(actor,body.input);
  else if(body.method==='attachUploadedMedia')result=uploads.commit(actor,body.input,mediaObjects,(user,asset)=>api.attachMedia(user,asset));
  else if(body.method==='mediaReadAccess'){
   const asset=store.recordById('media',body.input.id),file=body.input.file,variant=asset?.variants?.find(v=>v.storageFile===file);
   if(!variant||!/^asset_[a-f0-9-]+-\d+\.webp$/.test(file))reject('NOT_FOUND','Vaizdas nerastas.',404);
   const owned=actor&&canManageProfile(store.readOrganization(organizationId),actor,organizationId),published=api.profile(organizationId)?.media?.some(m=>m.id===asset.id);
   if(!published&&!owned&&!actor?.operator)reject('NOT_FOUND','Vaizdas nerastas.',404);
   result={id:asset.id,file,key:'variants/'+file,bytes:variant.bytes,sha256:variant.sha256};
  }
  else if(body.method==='identityActionScope')result={organizationId,operation:body.input.operation,clientCapacity:identityCapacity};
  else if(body.method==='applyCustomerControls')result=controls.apply(actor,body.input?.revision,()=>api.runAutomation());
  else if(body.method==='resolveReference'){const input=body.input;if(!validId(input?.id)||!Array.isArray(input.tables)||input.tables.length>3||input.tables.some(t=>!entityTables.has(t)&&t!=='mail_outbox'))reject('INVALID_INPUT','Netinkama įrašo tapatybė.');const collections=input.tables.filter(t=>owner(store,{tables:[t],id:input.id})===organizationId);result={organizationId:collections.length?organizationId:null,collections};}
  else if(body.method==='publicProfiles')result=store.organizationRecords('organizations',organizationId).filter(o=>o.approved).map(o=>api.profile(o.id));
  else if(body.method==='customerFragment'){
   if(!actor)reject('UNAUTHENTICATED','Prisijunkite.',401);
   const workspace=store.recordById('clients',actor.id)?api.workspace(actor,{role:'customer'}):{};
   result=Object.fromEntries(fields.map(f=>[f,workspace[f]||[]]));
  }else if(body.method==='customerExportFragment'){
   if(!actor)reject('UNAUTHENTICATED','Prisijunkite.',401);
   const data=store.recordById('clients',actor.id)?api.exportCustomer(actor):{};
   result=Object.fromEntries(exportFields.map(f=>[f,data[f]||[]]));
  }else if(body.method==='erasureBookings'){
   if(!actor?.operator)reject('FORBIDDEN','Prieiga neleidžiama.',403);
   if(!validId(body.input?.clientId))reject('INVALID_INPUT','Netinkama kliento tapatybė.');
   result=store.clientRecords('bookings',body.input.clientId).filter(b=>b.status==='confirmed'&&Date.parse(b.endAt)>store.clock()).map(({id,organizationId,startAt,endAt})=>({id,organizationId,startAt,endAt}));
  }else {
   // New identities cannot accidentally create an orphan hold without a cache.
   if(['hold','holdVisit','confirm','confirmVisit','createInquiry','createWaitlist','report'].includes(body.method)&&!store.recordById('clients',actor?.id))reject('GLOBAL_IDENTITY_REQUIRED','Ši paskyra dar neprijungta prie organizacijos saugyklos.',503);
   result=invokePlatform(api,body.method,actor,body.input||{});
  }
  const identityEffect=identityBefore?effects.capture(result.id,identityBefore,store.recordById('clients',actor.id)):null;
  admissions.capture(body.clientAdmission,result);
  const response=signed(store,'directory-result',{schemaVersion:1,siteId:store.siteId,organizationId,epoch:a.epoch,targetName,nonce:body.nonce,result:clone(result),identityEffect,references:readMethods.has(body.method)?[]:resultReferences(store,result,organizationId)});
  if(Buffer.byteLength(json(response))>maxResultBytes)reject('CAPACITY','Per didelis organizacijos atsakymas.',503);
  if(!readMethods.has(body.method)){
   store.db.prepare('DELETE FROM organization_directory_commands WHERE site_id=? AND expires_at<=?').run(store.siteId,store.clock());
   const size=store.db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(length(CAST(response AS BLOB))),0) AS bytes FROM organization_directory_commands WHERE site_id=?').get(store.siteId);
   if(size.n>=1024||size.bytes+Buffer.byteLength(json(response))>4*1024*1024)reject('CAPACITY','Per daug vienu metu vykdomų organizacijos užklausų.',503);
   store.db.prepare('INSERT INTO organization_directory_commands VALUES(?,?,?,?,?)').run(store.siteId,body.nonce,body.expiresAt,requestHash,json(response));
  }return response;
 });}
 return {execute:(packet,objects)=>{try{return execute(packet,objects);}catch(e){const known=e instanceof ApiError;return {error:{code:known?e.code:'SERVER_ERROR',message:known?e.message:'Užklausos įvykdyti nepavyko. Bandykite dar kartą.',status:known?e.status:500}};}}};
}

export function createOrganizationDirectory(store,{getTarget}={}){
 const db=store.db,siteId=store.siteId,controls=createCustomerControlQueue(store),admissions=createClientAdmissionQueue(store),mailReceipts=createOrganizationMailReceipts(store),uploads=createOrganizationUploadQueue(store);
 const api=createPlatform(store,{deferOrganizationPreferences:id=>!!db.prepare("SELECT organization_id FROM organization_handoffs WHERE site_id=? AND organization_id=? AND state='sealed'").get(siteId,id)});
 const cache=createDirectoryCacheIssuer(store),effects=createDirectoryIdentityEffects(store);
 db.exec('CREATE TABLE IF NOT EXISTS organization_directory_refs(site_id TEXT NOT NULL,collection TEXT NOT NULL,entity_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,PRIMARY KEY(site_id,collection,entity_id));');
 const transfers=()=>{const rows=db.prepare("SELECT organization_id,epoch,state,target_name FROM organization_handoffs WHERE site_id=? AND state!='aborted' ORDER BY organization_id LIMIT 33").all(siteId);if(rows.length>maxTargets)reject('CAPACITY','Organizacijų paieškos apimtis viršija šio piloto ribą.',503);return rows;};
 const actor=user=>{if(!user)return null;const a=db.prepare('SELECT id,email,name,operator FROM accounts WHERE site_id=? AND id=?').get(siteId,user.id);if(!a)reject('UNAUTHENTICATED','Prisijunkite.',401);return {...a,operator:!!a.operator,...(Number.isFinite(user.verifiedAt)?{verifiedAt:user.verifiedAt}:{})};};
 const saveReferences=(t,references)=>store.transaction(()=>{for(const r of references){if(!entityTables.has(r.collection)||!validId(r.id))unavailable();const old=db.prepare('SELECT organization_id FROM organization_directory_refs WHERE site_id=? AND collection=? AND entity_id=?').get(siteId,r.collection,r.id);if(old&&old.organization_id!==t.organization_id)reject('IDEMPOTENCY_CONFLICT','Įrašo tapatybė priklauso kitai organizacijai.',409);db.prepare('INSERT INTO organization_directory_refs VALUES(?,?,?,?,?) ON CONFLICT(site_id,collection,entity_id) DO UPDATE SET epoch=excluded.epoch').run(siteId,r.collection,r.id,t.organization_id,t.epoch);}});
 async function targetCall(t,method,user,input={},recipientId=null,clientAdmission=null,mediaObjects=null){
  if(t.state!=='sealed'||!getTarget)unavailable();
  let response,nonce,account,binary;
  for(let attempt=0;attempt<2;attempt++){
   const packet=store.transaction(()=>{account=actor(user);nonce=randomId('command');return signed(store,'directory-command',{schemaVersion:1,siteId,organizationId:t.organization_id,epoch:t.epoch,targetName:t.target_name,nonce,expiresAt:store.clock()+20000,method,actor:account,input:clone(input),cache:cache.issue(account?.id,recipientId),...(clientAdmission?{clientAdmission}: {})});});
   if(method==='attachUploadedMedia'){
    const objects=validateUploadObjects(input.asset,mediaObjects),bytes=objects.reduce((n,o)=>n+o.value.byteLength,0);
    // Stay below the documented serialized RPC ceiling including the signed cache.
    if(bytes+Buffer.byteLength(json(packet))+65536>32*1024*1024)reject('PAYLOAD_TOO_LARGE','Paruoštas vaizdas per didelis.',413);
   }
   try{const target=getTarget(t.target_name);if(method==='mediaReadAccess'){const reply=await target.readOrganizationMedia(packet);response=reply.response;binary=reply.bytes;}else if(method==='attachUploadedMedia')response=await target.storeOrganizationMedia(packet,mediaObjects);else response=await target.executeDirectoryCommand(packet);}catch{unavailable();}
   // An overtaken cache is rejected before the business operation. Refresh once;
   // transport failures and uncertain writes are never automatically replayed.
   if(response?.error?.code!=='STALE_DIRECTORY_CONTEXT')break;
  }
  if(response?.error)throw new ApiError(response.error.code,response.error.message,response.error.status);
  const body=verify(store,'directory-result',response);
  if(body.schemaVersion!==1||body.siteId!==siteId||body.organizationId!==t.organization_id||body.epoch!==t.epoch||body.targetName!==t.target_name||body.nonce!==nonce||!Array.isArray(body.references)||body.references.length>1024)unavailable();
  store.transaction(()=>{saveReferences(t,body.references);effects.accept(t,body.identityEffect,account,body.result);});
  return method==='mediaReadAccess'?validateOrganizationMediaBytes(body.result,input.file,binary):body.result;
 }
 async function resolve(ref,rows){
  if(ref.organizationId)return ref.organizationId;
  if(!validId(ref.id))return null;
  const legacy=owner(store,ref);if(legacy)return legacy;
  for(const table of ref.tables||[]){const known=db.prepare('SELECT organization_id,epoch FROM organization_directory_refs WHERE site_id=? AND collection=? AND entity_id=?').get(siteId,table,ref.id);if(known){const t=rows.find(r=>r.organization_id===known.organization_id);if(t?.epoch===known.epoch)return known.organization_id;}}
  let found=null;
  // Recovery of a lost response/registry write queries only signed active targets.
  // The pilot is explicitly bounded; no silent stale-source fallback or all-site scan.
  for(const t of rows){const result=await targetCall(t,'resolveReference',null,ref);if(result.organizationId){if(found&&found!==result.organizationId)reject('IDEMPOTENCY_CONFLICT','Įrašo tapatybė nėra vienareikšmė.',409);found=result.organizationId;saveReferences(t,result.collections.filter(x=>entityTables.has(x)).map(collection=>({collection,id:ref.id})));}}
  return found;
 }
 const sort=(rows,filters)=>rows.sort(filters.sort==='distance'?(a,b)=>(a.distanceKm??Infinity)-(b.distanceKm??Infinity)||a.id.localeCompare(b.id):filters.sort==='price'?(a,b)=>a.priceMinor-b.priceMinor||a.id.localeCompare(b.id):filters.sort==='name'?(a,b)=>a.organizationName.localeCompare(b.organizationName,'lt')||a.id.localeCompare(b.id):(a,b)=>(a.nextAt||'z').localeCompare(b.nextAt||'z')||a.id.localeCompare(b.id));
 async function flushCustomerControls(clientId){
  const rows=transfers();for(const control of controls.pending(clientId)){
   const target=rows.find(t=>t.organization_id===control.organization_id),user={id:control.client_id};
   try{if(!target)unavailable();const result=await targetCall(target,'applyCustomerControls',user,{revision:control.revision});if(result.revision!==control.revision)unavailable();controls.acknowledge(control);}catch{controls.retry(control);}
  }
  return clientId?controls.remaining(clientId):null;
 }
 async function deliverClientAdmission(row,rows){
  if(row.state==='applied'||row.state==='failed')return row;
  try{
   const target=rows.find(t=>t.organization_id===row.organization_id&&t.epoch===row.epoch);if(!target)unavailable();
   const result=await targetCall(target,'createClient',{id:row.actor_id},row.input,row.account_id,admissions.envelope(row));
   return store.transaction(()=>admissions.applied(row,result));
  }catch(error){return store.transaction(()=>admissions.failed(row,error));}
 }
 async function flushClientAdmissions(){const rows=transfers();for(const row of admissions.pending())await deliverClientAdmission(row,rows);}
 async function acknowledgeMail(row,rows){
  try{const target=rows.find(t=>t.organization_id===row.organization_id&&t.epoch===row.epoch);if(!target)unavailable();const result=await targetCall(target,'ackOrganizationMail',null,{id:row.mail_id,leaseToken:row.lease_token,messageHash:row.message_hash,outcome:row.outcome});if(result.id!==row.mail_id||row.outcome==='accepted'&&result.state!=='accepted'||row.outcome==='expired'&&result.state!=='expired'||row.outcome==='rejected'&&!['pending','failed'].includes(result.state))unavailable();store.transaction(()=>mailReceipts.acknowledged(row));}
  catch{store.transaction(()=>mailReceipts.retry(row));}
 }
 async function drainOrganizationMail(send){
  const rows=transfers();for(const row of mailReceipts.pending())await acknowledgeMail(row,rows);
  let remaining=10,firstError;
  for(const target of mailReceipts.order(rows.filter(t=>t.state==='sealed'))){
   if(!remaining)break;
   try{
   // Rotate even when this namespace is unavailable. One failed salon must not
   // starve another, and ten admissions bound external I/O for one alarm cycle.
   store.transaction(()=>mailReceipts.advance(target));
   const candidates=await targetCall(target,'organizationMailCandidates',null,{});if(!Array.isArray(candidates)||candidates.length>10)unavailable();
   for(const candidate of candidates){
    if(!remaining)break;remaining--;
    if(!validId(candidate.id)||!validId(candidate.accountId))unavailable();const previous=mailReceipts.get(target.organization_id,candidate.id);
    if(previous?.outcome==='accepted'){await acknowledgeMail(previous,rows);continue;}
    if(!previous&&!mailReceipts.capacity())reject('CAPACITY','Pranešimų pristatymo žurnalo talpa pasiekta.',503);
    const claim=await targetCall(target,'claimOrganizationMail',{id:candidate.accountId},{id:candidate.id});if(!claim)continue;
    validateOrganizationMailClaim(store,target,candidate,claim);
    const receipt=store.transaction(()=>mailReceipts.reserve(target,claim));let accepted=false,outcome;
    const account=actor({id:claim.accountId}),pref=store.clientRecords('preferences',claim.accountId)[0];
    if(account.email!==claim.recipient||['reminder','waitlist-offer'].includes(claim.type)&&(pref?.service===false||claim.type==='reminder'&&(pref?.reminderLeadMin??1440)!==claim.payload.leadMin))outcome='expired';
    else try{await send(claim);accepted=true;outcome='accepted';}catch{outcome='rejected';}
    // Receipt failure after external acceptance retains an uncertain lease.
    // A later stable message ID replay has the documented at-least-once boundary.
    const settled=store.transaction(()=>mailReceipts.settle(receipt,outcome));
    if(accepted&&settled?.outcome!=='accepted')unavailable();await acknowledgeMail(settled,rows);
   }
   }catch(error){firstError??=error;}
  }
  if(firstError)throw firstError;
 }
 async function nextOrganizationMailAt(){
  let due=mailReceipts.nextAt()??Infinity;for(const target of transfers().filter(t=>t.state==='sealed'))try{const value=await targetCall(target,'organizationMailDueAt',null,{});if(value!==null&&(!Number.isSafeInteger(value)||value<0))unavailable();due=Math.min(due,value??Infinity);}catch{due=Math.min(due,store.clock()+30000);}return Number.isFinite(due)?due:null;
 }
 async function readMedia(file,user,readSource){
  const match=/^(asset_[a-f0-9-]+)-\d+\.webp$/.exec(file);if(!match)reject('NOT_FOUND','Vaizdas nerastas.',404);
  const rows=transfers(),organizationId=await resolve({tables:['media'],id:match[1]},rows),target=rows.find(t=>t.organization_id===organizationId);
  return target?targetCall(target,'mediaReadAccess',user,{id:match[1],file}):readSource();
 }
 async function uploadMedia(user,input,{transformMedia,uploadSource}){
  const rows=transfers(),target=rows.find(t=>t.organization_id===input.organizationId);
  const account=actor(user);if(!account)reject('UNAUTHENTICATED','Prisijunkite.',401);
  if(!target)return uploadSource(account);
  await targetCall(target,'mediaUploadAccess',account,{organizationId:input.organizationId});
  const record=uploads.reserve(account,input),descriptor={organizationId:input.organizationId,id:record.metadata.id,requestHash:record.fingerprint};
  const recovered=await targetCall(target,'mediaUploadAccess',account,descriptor);let result=recovered.result;
  if(!result){
   const prepared=await transformMedia(store,{...record.metadata,bytes:input.bytes});
   if(prepared.asset.source.bytes!==record.metadata.originalBytes||prepared.asset.source.sha256!==record.metadata.originalSha256)reject('MEDIA_INTEGRITY','Vaizdo duomenys nesutampa.',409);
   result=await targetCall(target,'attachUploadedMedia',account,{...descriptor,asset:prepared.asset},null,null,prepared.objects);
  }
  if(result?.id!==descriptor.id)unavailable();
  return store.transaction(()=>{saveReferences(target,[{collection:'media',id:result.id}]);uploads.complete(account,record,result);return result;});
 }
 async function dispatch(method,user,input={}){
  const rows=transfers();if(!rows.length)return method==='publicProfiles'?store.readCollections(['organizations']).organizations.filter(o=>o.approved).map(o=>api.profile(o.id)):invokePlatform(api,method,user,input);
  const excluded=new Set(rows.map(t=>t.organization_id));
  if(method==='favorite'){
   const account=actor(user);if(!account)reject('UNAUTHENTICATED','Prisijunkite.',401);
   if(!validId(input.organizationId)||typeof input.saved!=='boolean')reject('INVALID_INPUT','Netinkamas pasirinkimas.');
   const target=rows.find(t=>t.organization_id===input.organizationId);if(!target)return api.favorite(account,input);
   let eligible=false;
   try{const profile=await targetCall(target,'profile',null,{id:input.organizationId});eligible=profile?.id===input.organizationId;}catch(error){if(input.saved||error.code!=='NOT_FOUND')throw error;}
   return createPlatform(store,{favoriteOrganization:()=>({id:input.organizationId,approved:eligible})}).favorite(account,input);
  }
  if(['metrics','migrateCatalogue'].includes(method)){
   const account=actor(user);if(!account)reject('UNAUTHENTICATED','Prisijunkite.',401);if(!account.operator)reject('FORBIDDEN','Operatoriaus prieiga neleidžiama.',403);
   if(method==='metrics'){
    const result=api.metrics(account,{excludeOrganizationIds:[...excluded]}),parts=await Promise.all(rows.map(t=>targetCall(t,'metrics',account,{})));
    for(const part of parts)for(const key of ['events','realVisits','realInquiries']){if(!Number.isSafeInteger(part[key])||part[key]<0)unavailable();result[key]+=part[key];}return result;
   }
   // Every organization commits separately. Deterministic legacy offer IDs and
   // the existing service.offerId make retries resume after a lost target reply.
   const parts=[];for(const org of store.readCollections(['organizations']).organizations.filter(o=>!excluded.has(o.id)))parts.push(api.migrateOrganizationCatalogue(account,{organizationId:org.id}));
   for(const target of rows)parts.push(await targetCall(target,'migrateOrganizationCatalogue',account,{organizationId:target.organization_id}));
   return {added:parts.reduce((n,p)=>n+p.added,0),services:parts.reduce((n,p)=>n+p.services,0),bookings:parts.reduce((n,p)=>n+p.bookings,0),version:api.taxonomy().version};
  }
  if(method==='changeTaxonomy')return api.changeTaxonomy(actor(user),input);
  if(method==='preferences'){
   const account=actor(user);if(!account)reject('UNAUTHENTICATED','Prisijunkite.',401);
   const {result,revision}=store.transaction(()=>({result:api.preferences(account,input),revision:controls.enqueue(account.id,rows.filter(t=>t.state==='sealed'))}));
   const pending=await flushCustomerControls(account.id);
   if(controls.revision(account.id)!==revision)return {...store.clientRecords('preferences',account.id)[0],synchronization:'superseded'};
   return {...result,synchronization:pending?'pending':'applied'};
  }
  if(['catalog','search','searchResults'].includes(method)){
   const operation=method==='searchResults'?'search':method,source=invokePlatform(api,operation,null,input).filter(s=>!excluded.has(s.organizationId)),parts=await Promise.all(rows.map(t=>targetCall(t,operation,null,input))),result=[...source,...parts.flat()];
   if(method==='catalog')return result;sort(result,input);return method==='searchResults'?groupSearchRows(result,input):result;
  }
  if(method==='publicProfiles'){const source=store.readCollections(['organizations']).organizations.filter(o=>o.approved&&!excluded.has(o.id)).map(o=>api.profile(o.id));return [...source,...(await Promise.all(rows.map(t=>targetCall(t,method,null,{})))).flat()];}
  if(method==='session'){
   const result=api.session(actor(user));if(!user)return result;const parts=await Promise.all(rows.map(t=>targetCall(t,'session',user,{})));return {...result,organizations:[...result.organizations.filter(o=>!excluded.has(o.id)),...parts.flatMap(p=>p.organizations)]};
  }
  if(method==='workspace'&&!['professional','operator'].includes(input.role)){
   const result=api.workspace(actor(user),input),parts=await Promise.all(rows.map(t=>targetCall(t,'customerFragment',user,{})));
   for(const field of fields)result[field]=[...result[field].filter(r=>!excluded.has(r.organizationId)),...parts.flatMap(p=>p[field])];return result;
  }
  if(method==='workspace'&&input.role==='operator'){
   const result=api.workspace(actor(user),input),parts=await Promise.all(rows.map(t=>targetCall(t,'workspace',user,input)));
   for(const field of [...organizationCollections,'events','outbox'])if(Array.isArray(result[field]))result[field]=[...result[field].filter(r=>!excluded.has(field==='organizations'?r.id:r.organizationId)),...parts.flatMap(p=>p[field]||[])];return result;
  }
  if(method==='exportCustomer'){
   const result=api.exportCustomer(actor(user)),parts=await Promise.all(rows.map(t=>targetCall(t,'customerExportFragment',user,{})));
   for(const field of exportFields)result[field]=[...result[field].filter(r=>!excluded.has(r.organizationId)),...parts.flatMap(p=>p[field])];return result;
  }
  if(method==='erasureCase'){
   const result=api.erasureCase(actor(user),input),parts=await Promise.all(rows.map(t=>targetCall(t,'erasureBookings',user,{clientId:result.client.id})));
   result.futureBookings=[...result.futureBookings.filter(r=>!excluded.has(r.organizationId)),...parts.flat()];return result;
  }
  const ref=reference(method,input);if(ref){const organizationId=await resolve(ref,rows),t=rows.find(r=>r.organization_id===organizationId);if(t){
   if(input.organizationId&&input.organizationId!==organizationId||input.scope?.role==='professional'&&input.scope.organizationId!==organizationId)reject('FORBIDDEN','Kita organizacija.',403);
   if(identityMethods.has(method)){
    const permission=await targetCall(t,'identityActionScope',user,{organizationId,operation:method});
    if(method==='createClient'&&input.idempotencyKey!==undefined){
     const row=admissions.prepare(t,actor(user),input,input.idempotencyKey,permission.clientCapacity);
     return admissions.result(await deliverClientAdmission(row,rows));
    }
    if(method==='createClient'&&!permission.clientCapacity)reject('LIMIT','Klientų sąrašo limitas pasiektas.');
    if(typeof input.email!=='string'||!input.email.trim()||input.email.trim().length>254)reject('INVALID_INPUT','Įrašykite teisingą el. paštą.');
    if(method==='createClient')clientAdmissionInput(input);
    const email=input.email.trim().toLowerCase(),recipient=store.transaction(()=>{
     const account=db.prepare('SELECT id FROM accounts WHERE site_id=? AND email=?').get(siteId,email);
     if(!account)reject(method==='grantMembership'?'NOT_FOUND':'GLOBAL_IDENTITY_REQUIRED',method==='grantMembership'?'Ši paskyra dar neprisijungė. Pakvieskite žmogų susikurti paskyrą savarankiškai.':'Šiam klientui dar reikia centrinės paskyros sukūrimo.',method==='grantMembership'?404:503);
     store.ensureClient(account.id);return account.id;
    });
    return targetCall(t,method,user,input,recipient);
   }
   return targetCall(t,method,user,input);
  }}
  // Central identity/preferences/export remain on their existing guarded writer.
  return invokePlatform(api,method,actor(user),input);
 }
 return {dispatch,readMedia,uploadMedia,flushCustomerControls,nextControlAt:controls.nextAt,flushClientAdmissions,nextClientAdmissionAt:admissions.nextAt,drainOrganizationMail,nextOrganizationMailAt};
}
