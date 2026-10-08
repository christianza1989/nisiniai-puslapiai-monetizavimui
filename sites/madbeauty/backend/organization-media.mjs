import {createHash} from 'node:crypto';
import {reject} from './primitives.mjs';
import {SQL_MEDIA_POLICY as policy} from './media-policy.mjs';
import {createOrganizationHandoff,organizationTransferProof as proof,sameTransferProof as equal} from './organization-handoff.mjs';

const json=JSON.stringify,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const integrity=()=>reject('HANDOFF_MEDIA_INTEGRITY','Perkeliamos medijos duomenys nesutampa.',409);
const dependency=()=>reject('HANDOFF_DEPENDENCY','Prieš perdavimą reikia parengti visus organizacijos medijos failus.',409);
const records=(store,table)=>store.db.prepare('SELECT data FROM '+table+' WHERE site_id=? ORDER BY ordinal').all(store.siteId).map(r=>JSON.parse(r.data));
const mediaRecords=rows=>rows.filter(r=>r.collection==='media').map(r=>JSON.parse(r.raw));
export function organizationMediaObjects(rows,organizationId){
 const assets=mediaRecords(rows),objects=[],seen=new Set();if(assets.length>24)dependency();
 for(const asset of assets){
  if(asset.organizationId!==organizationId)integrity();
  if(!/^asset_[a-f0-9-]+$/.test(asset.id)||!asset.source||!Array.isArray(asset.variants)||!asset.variants.length||asset.variants.length+1>policy.maxObjectsPerAsset)dependency();
  const list=[{key:asset.source.original,bytes:asset.source.bytes,sha256:asset.source.sha256,mime:asset.source.mime},...asset.variants.map(v=>({key:'variants/'+v.storageFile,bytes:v.bytes,sha256:v.sha256,mime:'image/webp'}))];
  if(list[0].key!=='originals/'+asset.id||!['image/jpeg','image/png','image/webp'].includes(list[0].mime))dependency();
  let assetBytes=0;for(const object of list){
   if(seen.has(object.key)||!Number.isSafeInteger(object.bytes)||object.bytes<1||object.bytes>policy.objectBytes||!(/^[a-f0-9]{64}$/).test(object.sha256)||object.key!==list[0].key&&!new RegExp('^variants/'+asset.id+'-\\d+\\.webp$').test(object.key))integrity();
   assetBytes+=object.bytes;seen.add(object.key);objects.push(object);
  }if(assetBytes>policy.assetBytes)dependency();
 }
 objects.sort((a,b)=>a.key.localeCompare(b.key));if(objects.reduce((n,o)=>n+o.bytes,0)>policy.capacityBytes)dependency();return objects;
}
function manifestFor(m,objects){return {schemaVersion:1,siteId:m.siteId,organizationId:m.organizationId,epoch:m.epoch,handoffId:m.handoffId,targetName:m.targetName,stateManifestHash:m.sha256,objects};}
// The calendar snapshot is immutable; these descriptors bind its exact asset IDs.
export function organizationMediaManifest(store,m){
 const rows=store.db.prepare('SELECT data FROM organization_handoff_rows WHERE site_id=? AND handoff_id=? ORDER BY ordinal').all(store.siteId,m.handoffId).map(r=>JSON.parse(r.data)),objects=organizationMediaObjects(rows,m.organizationId);if(!objects.length)return null;
 if(!store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_objects'").get())dependency();
 for(const o of objects){const actual=store.db.prepare('SELECT bytes,mime,sha256 FROM media_objects WHERE key=?').get(o.key);if(!actual||actual.bytes!==o.bytes||actual.mime!==o.mime||actual.sha256&&actual.sha256!==o.sha256)integrity();}
 return manifestFor(m,objects);
}
function objectDigest(store,object){
 const parts=store.db.prepare('SELECT part,data FROM media_chunks WHERE key=? ORDER BY part LIMIT 49').all(object.key),count=Math.ceil(object.bytes/policy.chunkBytes),hash=createHash('sha256');if(parts.length!==count)integrity();
 for(let n=0;n<count;n++){const data=new Uint8Array(parts[n].data);if(parts[n].part!==n||data.length!==Math.min(policy.chunkBytes,object.bytes-n*policy.chunkBytes))integrity();hash.update(data);}if(hash.digest('hex')!==object.sha256)integrity();
}
export function createOrganizationMediaSource(store){
 const handoff=createOrganizationHandoff(store);
 return {page:input=>store.transaction(()=>{
  const state=handoff.status(input);if(!['frozen','sealed'].includes(state.state)||state.epoch!==input.epoch||state.handoffId!==input.handoffId)reject('VERSION_CONFLICT','Perkėlimo versija pasikeitė.',409);
  const manifest=organizationMediaManifest(store,state.manifest),object=manifest?.objects.find(o=>o.key===input.key);if(!object||!Number.isSafeInteger(input.part)||input.part<0||input.part>=Math.ceil(object.bytes/policy.chunkBytes))reject('INVALID_INPUT','Netinkama medijos paketo dalis.');
  const part=store.db.prepare('SELECT data FROM media_chunks WHERE key=? AND part=?').get(object.key,input.part),data=part&&new Uint8Array(part.data);if(!data||data.length!==Math.min(policy.chunkBytes,object.bytes-input.part*policy.chunkBytes))integrity();
  const body={manifest,key:object.key,part:input.part,data:Buffer.from(data).toString('base64')};return {...body,proof:proof(store,'media-page',body)};
 })};
}
const stageSchema=`CREATE TABLE IF NOT EXISTS organization_media_stage(site_id TEXT PRIMARY KEY,manifest TEXT NOT NULL,state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS organization_media_stage_objects(key TEXT PRIMARY KEY,state TEXT NOT NULL);`;
export function createOrganizationMediaStage(store,{targetName}){
 const {db,siteId}=store;db.exec(stageSchema);
 const summary=()=>{const row=db.prepare('SELECT manifest,state FROM organization_media_stage WHERE site_id=?').get(siteId);if(!row)return {state:'empty',objects:0};const m=JSON.parse(row.manifest);return {state:row.state,organizationId:m.organizationId,epoch:m.epoch,handoffId:m.handoffId,objects:m.objects.length,completed:db.prepare("SELECT COUNT(*) AS n FROM organization_media_stage_objects WHERE state='complete'").get().n,bytes:m.objects.reduce((n,o)=>n+o.bytes,0)};};
 function accept(packet){return store.transaction(()=>{
  const {proof:signature,...body}=packet||{};if(!equal(signature,proof(store,'media-page',body)))reject('FORBIDDEN','Medijos paketas nepatvirtintas.',403);
  const {manifest:m,key,part,data}=body;if(Object.keys(body).some(k=>!['manifest','key','part','data'].includes(k))||!m||m.siteId!==siteId||m.targetName!==targetName||Buffer.byteLength(json(packet))>400000)integrity();
  const calendar=db.prepare('SELECT manifest,state FROM organization_stage WHERE site_id=?').get(siteId),state=calendar&&JSON.parse(calendar.manifest);if(calendar?.state!=='ready-read-only'||state.organizationId!==m.organizationId||state.epoch!==m.epoch||state.handoffId!==m.handoffId||json(manifestFor(state,organizationMediaObjects(records(store,'organization_stage_rows'),state.organizationId)))!==json(m))dependency();
  const prior=db.prepare('SELECT manifest,state FROM organization_media_stage WHERE site_id=?').get(siteId),authority=db.prepare('SELECT state FROM organization_target_authority WHERE site_id=?').get(siteId);
  if(authority){if(prior?.state==='ready'&&prior.manifest===json(m))return summary();reject('INVALID_STATE','Organizacijos saugykla jau parengta.',409);}
  if(prior&&prior.manifest!==json(m)){const old=JSON.parse(prior.manifest);if(old.epoch>=m.epoch)reject('VERSION_CONFLICT','Medijos perkėlimo versija pasikeitė.',409);discardOrganizationMediaStage(store);}
  if(!db.prepare('SELECT site_id FROM organization_media_stage WHERE site_id=?').get(siteId)){
   if(db.prepare('SELECT key FROM media_objects LIMIT 1').get())reject('INVALID_STATE','Tik tuščia medijos saugykla priima kopiją.',409);
   db.prepare('INSERT INTO organization_media_stage VALUES(?,?,?)').run(siteId,json(m),'receiving');
   for(const o of m.objects){db.prepare('INSERT INTO media_objects(key,bytes,mime,created_at,sha256) VALUES(?,?,?,?,?)').run(o.key,o.bytes,o.mime,store.clock(),o.sha256);db.prepare('INSERT INTO organization_media_stage_objects VALUES(?,?)').run(o.key,'receiving');}
   db.prepare('UPDATE media_capacity SET bytes=?,objects=? WHERE id=1').run(m.objects.reduce((n,o)=>n+o.bytes,0),m.objects.length);
  }
  const object=m.objects.find(o=>o.key===key);if(!object||!Number.isSafeInteger(part)||part<0||part>=Math.ceil(object.bytes/policy.chunkBytes)||typeof data!=='string')integrity();
  const bytes=Buffer.from(data,'base64');if(bytes.toString('base64')!==data||bytes.length!==Math.min(policy.chunkBytes,object.bytes-part*policy.chunkBytes))integrity();
  const exists=db.prepare('SELECT data FROM media_chunks WHERE key=? AND part=?').get(key,part);if(exists){if(sha(new Uint8Array(exists.data))!==sha(bytes))integrity();}else db.prepare('INSERT INTO media_chunks VALUES(?,?,?)').run(key,part,bytes);
  if(db.prepare('SELECT COUNT(*) AS n FROM media_chunks WHERE key=?').get(key).n===Math.ceil(object.bytes/policy.chunkBytes)){objectDigest(store,object);db.prepare("UPDATE organization_media_stage_objects SET state='complete' WHERE key=?").run(key);}
  if(!db.prepare("SELECT key FROM organization_media_stage_objects WHERE state!='complete' LIMIT 1").get())db.prepare("UPDATE organization_media_stage SET state='ready' WHERE site_id=?").run(siteId);return summary();
 });}
 return {accept,summary};
}
export function assertOrganizationMediaReady(store,m,rows,manifest){
 const objects=organizationMediaObjects(rows,m.organizationId);if(!objects.length){if(manifest!==null&&manifest!==undefined)integrity();return;}
 const expected=manifestFor(m,objects);if(json(manifest)!==json(expected))integrity();
 const has=store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organization_media_stage'").get(),stage=has&&store.db.prepare('SELECT manifest,state FROM organization_media_stage WHERE site_id=?').get(store.siteId);if(stage?.state!=='ready'||stage.manifest!==json(expected))dependency();
 for(const object of objects){const metadata=store.db.prepare('SELECT bytes,mime,sha256 FROM media_objects WHERE key=?').get(object.key);if(!metadata||metadata.bytes!==object.bytes||metadata.mime!==object.mime||metadata.sha256!==object.sha256)integrity();objectDigest(store,object);}
}
export function discardOrganizationMediaStage(store){
 const {db,siteId}=store,exists=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organization_media_stage'").get();if(!exists)return;
 const row=db.prepare('SELECT manifest FROM organization_media_stage WHERE site_id=?').get(siteId);if(!row)return;
 for(const o of JSON.parse(row.manifest).objects){db.prepare('DELETE FROM media_chunks WHERE key=?').run(o.key);db.prepare('DELETE FROM media_objects WHERE key=?').run(o.key);}
 db.prepare('DELETE FROM organization_media_stage_objects').run();db.prepare('DELETE FROM organization_media_stage WHERE site_id=?').run(siteId);const stats=db.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes,COUNT(*) AS objects FROM media_objects').get();db.prepare('UPDATE media_capacity SET bytes=?,objects=? WHERE id=1').run(stats.bytes,stats.objects);
}
