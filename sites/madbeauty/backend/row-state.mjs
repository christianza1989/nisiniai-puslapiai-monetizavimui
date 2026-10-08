import {createHash} from 'node:crypto';
import {reject} from './primitives.mjs';
import {organizationRows} from './organization-rows.mjs';
import {organizationFence} from './organization-handoff.mjs';
const rowLimit=128*1024,legacyLimit=1024*1024;
const byteLength=s=>Buffer.byteLength(s,'utf8');
export function encode(data){
 const fields=[],rows=[];
 for(const [collection,value] of Object.entries(data)){
  const kind=Array.isArray(value)?'array':value&&typeof value==='object'?'object':'scalar';fields.push({collection,kind});
  const entries=kind==='array'?value.map((x,i)=>[typeof x?.id==='string'?'id:'+x.id:'at:'+i,x]):kind==='object'?Object.entries(value):[['value',value]];
  const seen=new Set();for(let position=0;position<entries.length;position++){
   const [key,record]=entries[position],raw=JSON.stringify(record);
   if(seen.has(key)||raw===undefined)throw Error('Invalid persisted record identity');seen.add(key);
   if(byteLength(raw)>rowLimit)reject('CAPACITY','Vienas įrašas per didelis. Sumažinkite jo apimtį.',503);
   const x=record&&typeof record==='object'?record:{};
   rows.push({collection,key,position,raw,organizationId:collection==='organizations'?x.id:x.organizationId||null,practitionerId:x.practitionerId||null,resourceId:x.resourceId||null,clientId:x.clientId||x.accountId||null,startAt:x.startAt||null,endAt:x.endAt||null,status:x.status||x.state||null});
  }
 }
 if(byteLength(JSON.stringify(fields))>64*1024)throw Error('Invalid state collection manifest');
 return {fields,rows};
}
export function decode(fields,rows){
 const data={};for(const f of fields)Object.defineProperty(data,f.collection,{value:f.kind==='array'?[]:f.kind==='object'?{}:undefined,enumerable:true,writable:true,configurable:true});
 const kinds=new Map(fields.map(f=>[f.collection,f.kind]));
 for(const r of rows){const kind=kinds.get(r.collection),value=JSON.parse(r.data);if(kind==='array')data[r.collection].push(value);else if(kind==='object')Object.defineProperty(data[r.collection],r.record_key,{value,enumerable:true,writable:true,configurable:true});else if(kind==='scalar')data[r.collection]=value;else throw Error('Invalid state collection');}
 return data;
}
// Shared Node/Workers codec. All related state/outbox mutations remain in one synchronous transaction.
// SQL API: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
export function openRowState({db,siteId,transaction,clock}){
 const fence=organizationFence({db,siteId});
 const metadata=()=>db.prepare('SELECT * FROM state_row_metadata WHERE site_id=?').get(siteId);
 const currentMetadata=()=>{let meta=metadata();const legacy=db.prepare('SELECT version FROM platform_state WHERE site_id=?').get(siteId);if(meta&&legacy.version!==meta.legacy_version){if(!meta.legacy_mirrored)throw Error('Legacy writer changed a state exceeding its rollback capacity');write(JSON.parse(db.prepare('SELECT data FROM platform_state WHERE site_id=?').get(siteId).data));meta=metadata();}return meta;};
 const read=()=>{const meta=currentMetadata();if(!meta)return JSON.parse(db.prepare('SELECT data FROM platform_state WHERE site_id=?').get(siteId).data);return decode(JSON.parse(meta.fields),db.prepare('SELECT collection,record_key,data FROM state_rows WHERE site_id=? ORDER BY collection,position').all(siteId));};
 const collections=names=>{const meta=currentMetadata(),fields=JSON.parse(meta.fields).filter(f=>names.includes(f.collection)),rows=[];for(const f of fields)rows.push(...db.prepare('SELECT collection,record_key,data FROM state_rows WHERE site_id=? AND collection=? ORDER BY position').all(siteId,f.collection));return decode(fields,rows);};
 const write=data=>transaction(()=>{
  const encoded=encode(data),raw=JSON.stringify(data),mirrored=byteLength(raw)<=legacyLimit;
  const old=new Map(db.prepare('SELECT collection,record_key,position,data FROM state_rows WHERE site_id=?').all(siteId).map(r=>[JSON.stringify([r.collection,r.record_key]),r]));
  const differences=new Map(old),changes=[];for(const r of encoded.rows){const key=JSON.stringify([r.collection,r.key]),prior=differences.get(key);differences.delete(key);if(prior?.data!==r.raw||prior.position!==r.position)changes.push({...r,prior});}fence.assertRows(changes,[...differences.values()]);
  const upsert=db.prepare('INSERT INTO state_rows(site_id,collection,record_key,position,organization_id,practitioner_id,resource_id,client_id,start_at,end_at,status,data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(site_id,collection,record_key) DO UPDATE SET position=excluded.position,organization_id=excluded.organization_id,practitioner_id=excluded.practitioner_id,resource_id=excluded.resource_id,client_id=excluded.client_id,start_at=excluded.start_at,end_at=excluded.end_at,status=excluded.status,data=excluded.data');
  for(const r of encoded.rows){const key=JSON.stringify([r.collection,r.key]),prior=old.get(key);old.delete(key);if(prior?.data===r.raw&&prior.position===r.position)continue;upsert.run(siteId,r.collection,r.key,r.position,r.organizationId,r.practitionerId,r.resourceId,r.clientId,r.startAt,r.endAt,r.status,r.raw);}
  const remove=db.prepare('DELETE FROM state_rows WHERE site_id=? AND collection=? AND record_key=?');for(const r of old.values())remove.run(siteId,r.collection,r.record_key);
  // Legacy rollback is current only while the entire envelope fits its original limit.
  // Once it stops fitting, recovery must use this row-capable runtime or a current normalized export.
  if(mirrored)fence.mirrorWrite(()=>db.prepare('UPDATE platform_state SET data=?,version=version+1 WHERE site_id=?').run(raw,siteId));
  const legacyVersion=db.prepare('SELECT version FROM platform_state WHERE site_id=?').get(siteId).version;
  db.prepare('INSERT INTO state_row_metadata(site_id,version,fields,records,bytes,legacy_mirrored,legacy_version) VALUES(?,1,?,?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET version=version+1,fields=excluded.fields,records=excluded.records,bytes=excluded.bytes,legacy_mirrored=excluded.legacy_mirrored,legacy_version=excluded.legacy_version').run(siteId,JSON.stringify(encoded.fields),encoded.rows.length,byteLength(raw),mirrored?1:0,legacyVersion);
 });
 transaction(()=>{
  if(metadata())return;
  const source=db.prepare('SELECT version,data FROM platform_state WHERE site_id=?').get(siteId),data=JSON.parse(source.data);
  db.prepare('INSERT OR IGNORE INTO state_migration_checkpoints(site_id,source_version,sha256,data,migrated_at) VALUES(?,?,?,?,?)').run(siteId,source.version,createHash('sha256').update(source.data).digest('hex'),source.data,clock());
  write(data);
  if(JSON.stringify(read())!==JSON.stringify(data))throw Error('State migration verification failed');
 });
 return {...organizationRows({db,siteId,transaction,clock,currentMetadata,fullRead:read,encode,decode,fence}),assertOrganizationWritable:fence.assertWritable,organizationWritable:fence.isWritable,read,write,collections,stats:()=>{const m=currentMetadata();return {model:'rows-v2',version:m.version,records:m.records,bytes:m.bytes,maxRecordBytes:db.prepare('SELECT COALESCE(MAX(LENGTH(CAST(data AS BLOB))),0) AS bytes FROM state_rows WHERE site_id=?').get(siteId).bytes,legacyMirrored:!!m.legacy_mirrored};},rows:(collection,organizationId)=>{currentMetadata();return db.prepare('SELECT data FROM state_rows WHERE site_id=? AND collection=? AND organization_id=? ORDER BY position').all(siteId,collection,organizationId).map(r=>JSON.parse(r.data));}};
}
