import {createHash} from 'node:crypto';
import {randomId,reject} from './primitives.mjs';
import {membershipScope,requireCapability} from './permissions.mjs';
import {organizationMediaObjects} from './organization-media.mjs';
import {SQL_MEDIA_POLICY as policy} from './media-policy.mjs';
const json=JSON.stringify,hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const invalid=()=>reject('INVALID_INPUT','Patikrinkite vaizdo įkėlimo duomenis.');
const conflict=()=>reject('IDEMPOTENCY_CONFLICT','Šis įkėlimo raktas jau panaudotas kitam vaizdui.',409);
const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)invalid();return value.trim();};

// Source records contain the admission metadata, never the original image bytes.
// A lost target acknowledgement leaves the same asset ID available for retry.
export function createOrganizationUploadQueue(store){
 store.db.exec('CREATE TABLE IF NOT EXISTS directory_media_uploads(site_id TEXT NOT NULL,actor_id TEXT NOT NULL,operation_key TEXT NOT NULL,fingerprint TEXT NOT NULL,metadata TEXT NOT NULL,result TEXT,PRIMARY KEY(site_id,actor_id,operation_key));');
 return {
  reserve(actor,input){return store.transaction(()=>{
   const key=input.idempotencyKey||randomId('upload');if(!/^[a-zA-Z0-9_-]{8,160}$/.test(key))invalid();
   const bytes=input.bytes;if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>policy.objectBytes||!['image/png','image/jpeg','image/webp'].includes(input.mime))invalid();
   if(!['gallery','portrait'].includes(input.usage))invalid();
   const base={organizationId:text(input.organizationId,160),usage:input.usage,alt:text(input.alt,250),rights:text(input.rights,600),mime:input.mime,originalBytes:bytes.length,originalSha256:hash(bytes)},fingerprint=hash(json(base));
   const old=store.db.prepare('SELECT fingerprint,metadata FROM directory_media_uploads WHERE site_id=? AND actor_id=? AND operation_key=?').get(store.siteId,actor.id,key);
   if(old){if(old.fingerprint!==fingerprint)conflict();return {key,fingerprint,metadata:JSON.parse(old.metadata)};}
   if(store.db.prepare('SELECT COUNT(*) AS n FROM directory_media_uploads WHERE site_id=?').get(store.siteId).n>=4096)reject('CAPACITY','Vaizdų įkėlimo eilė užpildyta.',503);
   const metadata={...base,id:randomId('asset'),rightsConfirmedAt:new Date(store.clock()).toISOString(),rightsConfirmedBy:actor.id};
   store.db.prepare('INSERT INTO directory_media_uploads VALUES(?,?,?,?,?,NULL)').run(store.siteId,actor.id,key,fingerprint,json(metadata));return {key,fingerprint,metadata};
  });},
  complete(actor,record,result){store.db.prepare('UPDATE directory_media_uploads SET result=? WHERE site_id=? AND actor_id=? AND operation_key=? AND fingerprint=?').run(json(result),store.siteId,actor.id,record.key,record.fingerprint);}
 };
}

export function validateUploadObjects(asset,objects){
 if(!asset||!['gallery','portrait'].includes(asset.usage)||typeof asset.rightsConfirmedAt!=='string'||!Number.isFinite(Date.parse(asset.rightsConfirmedAt)))invalid();
 text(asset.alt,250);text(asset.rights,600);
 const expected=organizationMediaObjects([{collection:'media',raw:json(asset)}],asset.organizationId);
 if(!Array.isArray(objects)||objects.length!==expected.length)invalid();
 const seen=new Set(),entries=objects.map(object=>{
  const descriptor=expected.find(d=>d.key===object?.key);let value;
  if(object?.value instanceof ArrayBuffer)value=new Uint8Array(object.value);else if(object?.value instanceof Uint8Array)value=object.value;else invalid();
  if(!descriptor||seen.has(object.key)||value.length!==descriptor.bytes||hash(value)!==descriptor.sha256||object.httpMetadata?.contentType!==descriptor.mime)reject('MEDIA_INTEGRITY','Vaizdo duomenys nesutampa.',409);
  seen.add(object.key);return {key:object.key,value,httpMetadata:{contentType:descriptor.mime}};
 });
 return entries;
}

export function createOrganizationUploadReceiver(store,{writeObjects}={}){
 store.db.exec('CREATE TABLE IF NOT EXISTS organization_media_uploads(site_id TEXT NOT NULL,asset_id TEXT NOT NULL,organization_id TEXT NOT NULL,actor_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(site_id,asset_id));');
 function access(actor,input){
  if(!actor)reject('UNAUTHENTICATED','Prisijunkite.',401);
  requireCapability(membershipScope(store.readOrganization(input.organizationId),actor,input.organizationId),'profile');
  if(input.id){
   if(!/^asset_[a-f0-9-]+$/.test(input.id)||!(/^[a-f0-9]{64}$/).test(input.requestHash))invalid();
   const old=store.db.prepare('SELECT * FROM organization_media_uploads WHERE site_id=? AND asset_id=?').get(store.siteId,input.id);
   if(old){if(old.organization_id!==input.organizationId||old.actor_id!==actor.id||old.fingerprint!==input.requestHash)conflict();return {organizationId:input.organizationId,id:input.id,result:JSON.parse(old.result)};}
  }
  if(store.organizationRecords('media',input.organizationId).length>=24)reject('LIMIT','Profilio vaizdų limitas pasiektas.');
  return {organizationId:input.organizationId,id:input.id||null,result:null};
 }
 return {access,commit(actor,input,objects,attach){
  const current=access(actor,input);if(current.result)return current.result;
  const asset=input.asset;if(asset?.id!==input.id||asset?.organizationId!==input.organizationId||asset?.rightsConfirmedBy!==actor.id)invalid();
  if(store.recordById('media',input.id))conflict();
  const entries=validateUploadObjects(asset,objects);
  if(!writeObjects)reject('MEDIA_UNAVAILABLE','Vaizdo išsaugoti nepavyko.',503);
  const written=writeObjects(entries);if(written?.then)throw Error('Media commit must be synchronous');
  const result=attach(actor,asset);
  store.db.prepare('INSERT INTO organization_media_uploads VALUES(?,?,?,?,?,?)').run(store.siteId,asset.id,asset.organizationId,actor.id,input.requestHash,json(result));return result;
 }};
}
