import {ApiError,randomId,reject} from './primitives.mjs';
import {createPlatform} from './platform.mjs';
import {organizationTransferProof as proof,sameTransferProof as equal,organizationCollections} from './organization-handoff.mjs';
import {invokePlatform,publicRpcMethods} from './rpc-contract.mjs';
import {groupSearchRows} from './search-results.mjs';
import {createDirectoryCacheIssuer,createDirectoryCacheReceiver,createDirectoryIdentityEffects} from './organization-directory-cache.mjs';

const json=JSON.stringify,clone=v=>JSON.parse(json(v)),maxTargets=32,maxResultBytes=1024*1024;
const unavailable=()=>reject('ORGANIZATION_UNAVAILABLE','Organizacijos duomenys laikinai nepasiekiami. Bandykite dar kartą.',503);
const signed=(store,type,body)=>({...body,proof:proof(store,type,body)});
function verify(store,type,packet){const {proof:signature,...body}=packet||{};if(!equal(signature,proof(store,type,body)))reject('FORBIDDEN','Organizacijos užklausa nepatvirtinta.',403);return body;}
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const entityTables=new Set(organizationCollections);
const direct=new Set(['createStaff','createResource','createService','createBusyBlock','selectProcedures','requestProcedure','assessQualification','saveGallery','saveBookingRules','saveClientCard','bulkOfferPrices','createClient','grantMembership','organizationReport','reportCsv','exportOfferCsv']);
const byId={profile:['organizations'],option:['services'],saveOffer:['offers'],submitOffer:['offers'],moderateOffer:['offers'],archiveOffer:['offers'],submitLocation:['locations'],moderateLocation:['locations'],setLocationActive:['locations'],assignStaffLocations:['practitioners'],revokeMembership:['memberships'],moderateProcedure:['procedureRequests'],releaseBusyBlock:['busyBlocks'],releaseHold:['holds'],cancelBooking:['bookings'],changeBooking:['bookings'],changeVisit:['bookings'],completeBooking:['bookings'],rebooking:['bookings'],acceptWaitlist:['waitlist'],closeWaitlist:['waitlist'],moderate:['revisions'],moderateReview:['reviews'],reviewReport:['reports'],retryOutbox:['mail_outbox']};
const targetMethods=new Set([...direct,...Object.keys(byId),'catalog','search','searchResults','availability','visitAvailability','hold','holdVisit','confirm','confirmVisit','manualVisit','message','review','report','saveMenuGroup','saveLocation','submitRevision','edit','createInquiry','createWaitlist','session','customerFragment','customerExportFragment','erasureBookings','publicProfiles','resolveReference']);
// These need central identity admission before the organization can execute them.
const identityMethods=new Set(['createClient','grantMembership']);
const readMethods=new Set([...publicRpcMethods,'session','customerFragment','customerExportFragment','erasureBookings','publicProfiles','resolveReference','workspace','rebooking','organizationReport','reportCsv','exportOfferCsv']);
targetMethods.add('workspace');
const fields=['bookings','messages','reviews','inquiries','waitlist','reports'];
const exportFields=[...fields,'organizationCards'];
function reference(method,input){
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
export function createOrganizationCommand(store,{targetName}){
 indexSchema(store);
 const cache=createDirectoryCacheReceiver(store),effects=createDirectoryIdentityEffects(store);
 store.db.exec('CREATE TABLE IF NOT EXISTS organization_directory_commands(site_id TEXT NOT NULL,nonce TEXT NOT NULL,expires_at INTEGER NOT NULL,request_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(site_id,nonce)); CREATE INDEX IF NOT EXISTS directory_commands_expiry ON organization_directory_commands(site_id,expires_at);');
 function execute(packet){return store.transaction(()=>{
  const body=verify(store,'directory-command',packet),a=store.db.prepare('SELECT * FROM organization_target_authority WHERE site_id=?').get(store.siteId);
  if(!a||a.state!=='active'||body.schemaVersion!==1||body.siteId!==store.siteId||body.organizationId!==a.organization_id||body.epoch!==a.epoch||body.targetName!==targetName||targetName!=='madbeauty:organization:v1:'+a.organization_id)unavailable();
  if(!validId(body.nonce)||!Number.isSafeInteger(body.expiresAt)||body.expiresAt<=store.clock()||body.expiresAt>store.clock()+30000||Buffer.byteLength(json(packet))>maxResultBytes+32768||Buffer.byteLength(json(body.input||{}))>32768)reject('INVALID_INPUT','Organizacijos užklausa paseno arba yra per didelė.');
  if(!targetMethods.has(body.method)||identityMethods.has(body.method))reject('GLOBAL_IDENTITY_REQUIRED','Šiam veiksmui reikia centrinės paskyros patvirtinimo.',503);
  const actor=body.actor;if(actor&&(Object.keys(actor).some(k=>!['id','email','name','operator','verifiedAt'].includes(k))||!validId(actor.id)||typeof actor.email!=='string'||typeof actor.name!=='string'||typeof actor.operator!=='boolean'))reject('FORBIDDEN','Netinkama paskyros tapatybė.',403);
  if(!readMethods.has(body.method)&&!actor)reject('UNAUTHENTICATED','Prisijunkite.',401);
  const ref=reference(body.method,body.input||{}),organizationId=a.organization_id;
  if(ref&&owner(store,ref)!==organizationId)reject('FORBIDDEN','Įrašas nepriklauso šiai organizacijai.',403);
  if(body.input?.organizationId&&body.input.organizationId!==organizationId||body.input?.scope?.role==='professional'&&body.input.scope.organizationId!==organizationId)reject('FORBIDDEN','Kita organizacija.',403);
  const requestHash=proof(store,'directory-request',body),old=store.db.prepare('SELECT request_hash,response FROM organization_directory_commands WHERE site_id=? AND nonce=?').get(store.siteId,body.nonce);
  if(old){if(old.request_hash!==requestHash)reject('IDEMPOTENCY_CONFLICT','Užklausos tapatybė jau panaudota.',409);return JSON.parse(old.response);}
  cache.apply(body.cache,actor,a.epoch);
  const identityBefore=actor&&['confirm','confirmVisit'].includes(body.method)?store.recordById('clients',actor.id):null;
  const api=createPlatform(store);let result;
  if(body.method==='resolveReference'){const input=body.input;if(!validId(input?.id)||!Array.isArray(input.tables)||input.tables.length>3||input.tables.some(t=>!entityTables.has(t)&&t!=='mail_outbox'))reject('INVALID_INPUT','Netinkama įrašo tapatybė.');const collections=input.tables.filter(t=>owner(store,{tables:[t],id:input.id})===organizationId);result={organizationId:collections.length?organizationId:null,collections};}
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
  const response=signed(store,'directory-result',{schemaVersion:1,siteId:store.siteId,organizationId,epoch:a.epoch,targetName,nonce:body.nonce,result:clone(result),identityEffect,references:readMethods.has(body.method)?[]:resultReferences(store,result,organizationId)});
  if(Buffer.byteLength(json(response))>maxResultBytes)reject('CAPACITY','Per didelis organizacijos atsakymas.',503);
  if(!readMethods.has(body.method)){
   store.db.prepare('DELETE FROM organization_directory_commands WHERE site_id=? AND expires_at<=?').run(store.siteId,store.clock());
   const size=store.db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(length(CAST(response AS BLOB))),0) AS bytes FROM organization_directory_commands WHERE site_id=?').get(store.siteId);
   if(size.n>=1024||size.bytes+Buffer.byteLength(json(response))>4*1024*1024)reject('CAPACITY','Per daug vienu metu vykdomų organizacijos užklausų.',503);
   store.db.prepare('INSERT INTO organization_directory_commands VALUES(?,?,?,?,?)').run(store.siteId,body.nonce,body.expiresAt,requestHash,json(response));
  }return response;
 });}
 return {execute:packet=>{try{return execute(packet);}catch(e){const known=e instanceof ApiError;return {error:{code:known?e.code:'SERVER_ERROR',message:known?e.message:'Užklausos įvykdyti nepavyko. Bandykite dar kartą.',status:known?e.status:500}};}}};
}

export function createOrganizationDirectory(store,{getTarget}={}){
 const api=createPlatform(store),db=store.db,siteId=store.siteId;
 const cache=createDirectoryCacheIssuer(store),effects=createDirectoryIdentityEffects(store);
 db.exec('CREATE TABLE IF NOT EXISTS organization_directory_refs(site_id TEXT NOT NULL,collection TEXT NOT NULL,entity_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,PRIMARY KEY(site_id,collection,entity_id));');
 const transfers=()=>{const rows=db.prepare("SELECT organization_id,epoch,state,target_name FROM organization_handoffs WHERE site_id=? AND state!='aborted' ORDER BY organization_id LIMIT 33").all(siteId);if(rows.length>maxTargets)reject('CAPACITY','Organizacijų paieškos apimtis viršija šio piloto ribą.',503);return rows;};
 const actor=user=>{if(!user)return null;const a=db.prepare('SELECT id,email,name,operator FROM accounts WHERE site_id=? AND id=?').get(siteId,user.id);if(!a)reject('UNAUTHENTICATED','Prisijunkite.',401);return {...a,operator:!!a.operator,...(Number.isFinite(user.verifiedAt)?{verifiedAt:user.verifiedAt}:{})};};
 const saveReferences=(t,references)=>store.transaction(()=>{for(const r of references){if(!entityTables.has(r.collection)||!validId(r.id))unavailable();const old=db.prepare('SELECT organization_id FROM organization_directory_refs WHERE site_id=? AND collection=? AND entity_id=?').get(siteId,r.collection,r.id);if(old&&old.organization_id!==t.organization_id)reject('IDEMPOTENCY_CONFLICT','Įrašo tapatybė priklauso kitai organizacijai.',409);db.prepare('INSERT INTO organization_directory_refs VALUES(?,?,?,?,?) ON CONFLICT(site_id,collection,entity_id) DO UPDATE SET epoch=excluded.epoch').run(siteId,r.collection,r.id,t.organization_id,t.epoch);}});
 async function targetCall(t,method,user,input={}){
  if(t.state!=='sealed'||!getTarget)unavailable();
  let response,nonce,account;
  for(let attempt=0;attempt<2;attempt++){
   const packet=store.transaction(()=>{account=actor(user);nonce=randomId('command');return signed(store,'directory-command',{schemaVersion:1,siteId,organizationId:t.organization_id,epoch:t.epoch,targetName:t.target_name,nonce,expiresAt:store.clock()+20000,method,actor:account,input:clone(input),cache:cache.issue(account?.id)});});
   try{response=await getTarget(t.target_name).executeDirectoryCommand(packet);}catch{unavailable();}
   // An overtaken cache is rejected before the business operation. Refresh once;
   // transport failures and uncertain writes are never automatically replayed.
   if(response?.error?.code!=='STALE_DIRECTORY_CONTEXT')break;
  }
  if(response?.error)throw new ApiError(response.error.code,response.error.message,response.error.status);
  const body=verify(store,'directory-result',response);
  if(body.schemaVersion!==1||body.siteId!==siteId||body.organizationId!==t.organization_id||body.epoch!==t.epoch||body.targetName!==t.target_name||body.nonce!==nonce||!Array.isArray(body.references)||body.references.length>1024)unavailable();
  store.transaction(()=>{saveReferences(t,body.references);effects.accept(t,body.identityEffect,account,body.result);});return body.result;
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
 async function dispatch(method,user,input={}){
  const rows=transfers();if(!rows.length)return method==='publicProfiles'?store.readCollections(['organizations']).organizations.filter(o=>o.approved).map(o=>api.profile(o.id)):invokePlatform(api,method,user,input);
  const excluded=new Set(rows.map(t=>t.organization_id));
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
  const ref=reference(method,input);if(ref){const organizationId=await resolve(ref,rows),t=rows.find(r=>r.organization_id===organizationId);if(t){if(input.organizationId&&input.organizationId!==organizationId||input.scope?.role==='professional'&&input.scope.organizationId!==organizationId)reject('FORBIDDEN','Kita organizacija.',403);return targetCall(t,method,user,input);}}
  // Central identity/preferences/export remain on their existing guarded writer.
  // Unsupported cross-object mutations fail closed instead of weakening its contract.
  if(['metrics','migrateCatalogue','changeTaxonomy'].includes(method))unavailable();
  return invokePlatform(api,method,actor(user),input);
 }
 return {dispatch};
}
