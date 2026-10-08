import {reject} from './primitives.mjs';
import {organizationCollections} from './organization-handoff.mjs';
const tenant=new Set(organizationCollections);
const globalRead=new Set(['taxonomy','taxonomyChanges','taxonomyVersion','selectionVersions','isDemo','fixtureRuntime']);
const bytes=s=>Buffer.byteLength(s,'utf8'),identity=r=>JSON.stringify([r.collection,r.record_key||r.key]);
// An indexed partial view and a guarded patch, within the same authoritative SQL writer.
// This is not a distributed tenant handoff or a second calendar authority.
export function organizationRows({db,siteId,transaction,clock,currentMetadata,fullRead,encode,decode,fence}){
 db.exec('CREATE TABLE IF NOT EXISTS state_collection_stats(site_id TEXT NOT NULL,collection TEXT NOT NULL,records INTEGER NOT NULL,last_position INTEGER NOT NULL,PRIMARY KEY(site_id,collection)); CREATE TABLE IF NOT EXISTS state_collection_stats_version(site_id TEXT PRIMARY KEY,version INTEGER NOT NULL);');
 const ensureStats=meta=>{if(db.prepare('SELECT version FROM state_collection_stats_version WHERE site_id=?').get(siteId)?.version===meta.version)return;transaction(()=>{
  db.prepare('DELETE FROM state_collection_stats WHERE site_id=?').run(siteId);
  for(const value of db.prepare('SELECT collection,COUNT(*) AS records,MAX(position) AS last_position FROM state_rows WHERE site_id=? GROUP BY collection').all(siteId))db.prepare('INSERT INTO state_collection_stats VALUES(?,?,?,?)').run(siteId,value.collection,value.records,value.last_position);
  db.prepare('INSERT INTO state_collection_stats_version VALUES(?,?) ON CONFLICT(site_id) DO UPDATE SET version=excluded.version').run(siteId,meta.version);
 });};
 const views=new WeakMap(),row= (collection,id)=>{currentMetadata();const value=db.prepare('SELECT data FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').get(siteId,collection,collection==='idempotency'?id:'id:'+id);return value?JSON.parse(value.data):null;};
 const clientRows=(collection,id)=>{currentMetadata();return db.prepare('SELECT data FROM state_rows WHERE site_id=? AND collection=? AND client_id=? ORDER BY position').all(siteId,collection,id).map(x=>JSON.parse(x.data));};
 function readOrganization(organizationId,accountIds=[],{includeClientHistory=false}={}){
  const meta=currentMetadata(),fields=JSON.parse(meta.fields),rows=[],ids=new Set(accountIds.filter(x=>typeof x==='string'));ensureStats(meta);
  for(const f of fields){
   if(tenant.has(f.collection))rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND organization_id=? ORDER BY position').all(siteId,f.collection,organizationId));
   else if(globalRead.has(f.collection))rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? ORDER BY position').all(siteId,f.collection));
   else if(f.kind==='scalar')rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=?').all(siteId,f.collection));
  }
  for(const r of rows){const v=JSON.parse(r.data);if(r.collection==='bookings'&&v.status==='confirmed'&&Date.parse(v.endAt)>clock()||r.collection==='waitlist'&&v.criteria&&!['closed','expired'].includes(v.state)||r.collection==='holds'&&v.state==='held'&&Date.parse(v.expiresAt)>clock()){if(v.clientId||v.accountId)ids.add(v.clientId||v.accountId);}if(includeClientHistory&&['bookings','inquiries','waitlist','clientLinks','clientCards'].includes(r.collection)&&v.clientId)ids.add(v.clientId);}
  for(const id of ids){
   rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').all(siteId,'clients','id:'+id));
   rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND client_id=? ORDER BY position').all(siteId,'preferences',id));
   rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND record_key>=? AND record_key<? ORDER BY position').all(siteId,'idempotency',id+':',id+':\uffff'));
  }
  const unique=[...new Map(rows.map(r=>[identity(r),r])).values()].sort((a,b)=>a.collection.localeCompare(b.collection)||a.position-b.position),data=decode(fields,unique);
  Object.defineProperty(data,'organizationContext',{value:organizationId,enumerable:false});
  Object.defineProperty(data,'organizationPatchReady',{value:['media','offers','procedureRequests','taxonomyChanges','qualifications','menuGroups','selectionVersions'].every(name=>fields.some(f=>f.collection===name)),enumerable:false});
  views.set(data,{meta,fields,organizationId,ids,rows:unique});return data;
 }
 function readClient(accountId,organizationIds=[]){
  const meta=currentMetadata(),fields=JSON.parse(meta.fields),rows=[];ensureStats(meta);
  for(const f of fields){
   if(f.collection==='clients')rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').all(siteId,f.collection,'id:'+accountId));
   else if(['preferences','dataRequests'].includes(f.collection))rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND client_id=? ORDER BY position').all(siteId,f.collection,accountId));
   else if(f.collection==='organizations')for(const id of new Set(organizationIds.filter(id=>typeof id==='string')))rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').all(siteId,f.collection,'id:'+id));
   else if(f.kind==='scalar')rows.push(...db.prepare('SELECT * FROM state_rows WHERE site_id=? AND collection=?').all(siteId,f.collection));
  }
  const data=decode(fields,rows);Object.defineProperty(data,'clientPatchReady',{value:['media','offers','procedureRequests','taxonomyChanges','qualifications','menuGroups','selectionVersions'].every(name=>fields.some(f=>f.collection===name)),enumerable:false});
  views.set(data,{meta,fields,kind:'client',accountId,rows});return data;
 }
 function ensureClient(accountId,validate){return transaction(()=>{
  const account=db.prepare('SELECT id,email,name FROM accounts WHERE id=? AND site_id=?').get(accountId,siteId);if(!account)throw Error('Client identity requires an existing account');
  const existing=row('clients',account.id);if(existing)return existing;
  const data=readClient(account.id);validate(data);views.get(data).createIdentity=true;
  const client={id:account.id,accountId:account.id,name:account.name,email:account.email,version:1};data.clients.push(client);writeOrganization(data);return client;
 });}
 function writeOrganization(data){return transaction(()=>{
  const view=views.get(data);if(!view)throw Error('Unknown organization view');const meta=currentMetadata();if(meta.version!==view.meta.version)reject('VERSION_CONFLICT','Duomenys pasikeitė. Pakartokite veiksmą.',409);
  if(view.kind!=='client')fence.assertWritable(view.organizationId);
  const encoded=encode(data);if(JSON.stringify(encoded.fields)!==JSON.stringify(view.fields))throw Error('Organization write requires an unchanged collection manifest');
  const old=new Map(view.rows.map(r=>[identity(r),r])),changes=[],removed=[],kinds=new Map(view.fields.map(f=>[f.collection,f.kind]));
  const allowed=r=>view.kind==='client'?r.collection==='clients'?JSON.parse(r.raw).id===view.accountId:['preferences','dataRequests'].includes(r.collection)?JSON.parse(r.raw).clientId===view.accountId:r.collection==='events':tenant.has(r.collection)?r.organizationId===view.organizationId:r.collection==='clients'?view.ids.has(JSON.parse(r.raw).id):r.collection==='preferences'?view.ids.has(JSON.parse(r.raw).clientId):r.collection==='idempotency'?[...view.ids].some(id=>r.key.startsWith(id+':')):r.collection==='selectionVersions'?r.key===view.organizationId:r.collection==='events';
  for(const r of encoded.rows){const key=identity(r),prior=old.get(key);old.delete(key);if(prior?.data===r.raw)continue;if(!allowed(r)||r.collection==='clients'&&!prior&&!view.createIdentity)throw Error('Organization patch cannot change another scope or global metadata');if(!prior&&db.prepare('SELECT record_key FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').get(siteId,r.collection,r.key))throw Error('Organization patch cannot overwrite an unloaded record');changes.push({...r,prior});}
  for(const prior of old.values()){const shape={collection:prior.collection,organizationId:prior.organization_id,key:prior.record_key,raw:prior.data};if(!allowed(shape)||shape.collection==='events')throw Error('Organization patch cannot delete outside its loaded scope');removed.push(prior);}
  fence.assertRows(changes,removed);
  const counts=new Map(),deltas=new Map(),cost=r=>bytes(r.raw??r.data)+(kinds.get(r.collection)==='scalar'?0:1)+(kinds.get(r.collection)==='object'?bytes(JSON.stringify(r.key??r.record_key))+1:0);
  for(const r of [...changes,...removed])if(!counts.has(r.collection)){const s=db.prepare('SELECT records,last_position FROM state_collection_stats WHERE site_id=? AND collection=?').get(siteId,r.collection);counts.set(r.collection,{n:s?.records||0,last:s?.last_position??-1});}
  const upsert=db.prepare('INSERT INTO state_rows(site_id,collection,record_key,position,organization_id,practitioner_id,resource_id,client_id,start_at,end_at,status,data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(site_id,collection,record_key) DO UPDATE SET organization_id=excluded.organization_id,practitioner_id=excluded.practitioner_id,resource_id=excluded.resource_id,client_id=excluded.client_id,start_at=excluded.start_at,end_at=excluded.end_at,status=excluded.status,data=excluded.data');
  let deltaBytes=0,deltaRecords=0;
  for(const r of changes){const count=counts.get(r.collection),position=r.prior?.position??++count.last;upsert.run(siteId,r.collection,r.key,position,r.organizationId,r.practitionerId,r.resourceId,r.clientId,r.startAt,r.endAt,r.status,r.raw);deltaBytes+=cost(r)-(r.prior?cost(r.prior):0);if(!r.prior){deltaRecords++;deltas.set(r.collection,(deltas.get(r.collection)||0)+1);}}
  for(const r of removed){db.prepare('DELETE FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').run(siteId,r.collection,r.record_key);deltaBytes-=cost(r);deltaRecords--;deltas.set(r.collection,(deltas.get(r.collection)||0)-1);}
  for(const [collection,delta] of deltas)if(kinds.get(collection)!=='scalar'){const count=counts.get(collection).n;deltaBytes+=(count?1:0)-(count+delta?1:0);}
  let nextBytes=meta.bytes+deltaBytes,mirrored=!!meta.legacy_mirrored&&nextBytes<=1024*1024;
  if(mirrored){const raw=JSON.stringify(fullRead());nextBytes=bytes(raw);mirrored=nextBytes<=1024*1024;if(mirrored)fence.mirrorWrite(()=>db.prepare('UPDATE platform_state SET data=?,version=version+1 WHERE site_id=?').run(raw,siteId));}
  const legacyVersion=db.prepare('SELECT version FROM platform_state WHERE site_id=?').get(siteId).version;
  db.prepare('UPDATE state_row_metadata SET version=version+1,records=records+?,bytes=?,legacy_mirrored=?,legacy_version=? WHERE site_id=?').run(deltaRecords,nextBytes,mirrored?1:0,legacyVersion,siteId);
  for(const [collection,count] of counts)db.prepare('INSERT INTO state_collection_stats VALUES(?,?,?,?) ON CONFLICT(site_id,collection) DO UPDATE SET records=excluded.records,last_position=excluded.last_position').run(siteId,collection,count.n+(deltas.get(collection)||0),count.last);
  db.prepare('UPDATE state_collection_stats_version SET version=? WHERE site_id=?').run(meta.version+1,siteId);views.delete(data);
 });}
 return {recordById:row,clientRecords:clientRows,readOrganization,writeOrganization,readClient,ensureClient,writeClient:data=>{if(views.get(data)?.kind!=='client')throw Error('Unknown client mutation view');return writeOrganization(data);}};
}
