import {createHash} from 'node:crypto';
import {SQL_MEDIA_POLICY} from '../backend/media-policy.mjs';
export {SQL_MEDIA_POLICY} from '../backend/media-policy.mjs';
// Bounded existing pilot storage. No R2/account/payment activation is performed.
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function createSqlMediaBucket(store,{capacityBytes=SQL_MEDIA_POLICY.capacityBytes}={}){
 const {db}=store,p=SQL_MEDIA_POLICY;
 if(!Number.isSafeInteger(capacityBytes)||capacityBytes<1||capacityBytes>p.capacityBytes)throw Error('Invalid media capacity');
 store.transaction(()=>{
  const exists=!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_objects'").get();
  db.exec('CREATE TABLE IF NOT EXISTS media_objects(key TEXT PRIMARY KEY,bytes INTEGER NOT NULL,mime TEXT NOT NULL,created_at INTEGER NOT NULL,sha256 TEXT); CREATE TABLE IF NOT EXISTS media_chunks(key TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(key,part)); CREATE TABLE IF NOT EXISTS media_capacity(id INTEGER PRIMARY KEY CHECK(id=1),bytes INTEGER NOT NULL,objects INTEGER NOT NULL);');
  if(exists&&!db.prepare('SELECT id FROM media_capacity WHERE id=1').get())db.exec('ALTER TABLE media_objects ADD COLUMN sha256 TEXT');
  // Reconcile old adapter writes on reopen; do not rewrite or delete legacy bytes.
  const current=db.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes,COUNT(*) AS objects FROM media_objects').get();
  db.prepare('INSERT INTO media_capacity(id,bytes,objects) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET bytes=excluded.bytes,objects=excluded.objects').run(current.bytes,current.objects);
  // These fences also cover direct SQL and older adapters during transfer.
  for(const table of ['media_objects','media_chunks'])for(const event of ['INSERT','UPDATE','DELETE']){
   const aliases=event==='UPDATE'?['OLD','NEW']:[event==='DELETE'?'OLD':'NEW'];
   const frozen=aliases.map(row=>`EXISTS(SELECT 1 FROM state_rows AS asset JOIN organization_handoffs AS h ON h.site_id=asset.site_id AND h.organization_id=asset.organization_id AND h.state!='aborted' WHERE asset.site_id='${store.siteId}' AND asset.collection='media' AND (json_extract(asset.data,'$.source.original')=${row}.key OR EXISTS(SELECT 1 FROM json_each(asset.data,'$.variants') AS variant WHERE 'variants/'||json_extract(variant.value,'$.storageFile')=${row}.key)))`).join(' OR ');
   db.exec(`CREATE TRIGGER IF NOT EXISTS source_${table}_${event.toLowerCase()} BEFORE ${event} ON ${table} WHEN ${frozen} BEGIN SELECT RAISE(ABORT,'ORGANIZATION_MIGRATING'); END;
CREATE TRIGGER IF NOT EXISTS target_${table}_${event.toLowerCase()} BEFORE ${event} ON ${table} WHEN EXISTS(SELECT 1 FROM organization_target_authority WHERE state!='active') BEGIN SELECT RAISE(ABORT,'ORGANIZATION_TARGET_FENCED'); END;`);
  }
 });
 const stats=()=>({...db.prepare('SELECT bytes,objects FROM media_capacity WHERE id=1').get(),capacityBytes,model:'sql-media-v2'});
 const putMany=async entries=>{
  if(!Array.isArray(entries)||entries.length<1||entries.length>p.maxObjectsPerAsset)throw Error('Invalid media batch');
  const seen=new Set(),prepared=entries.map(({key,value,httpMetadata={}})=>{
   if(!/^(?:originals\/asset_[a-f0-9-]+|variants\/asset_[a-f0-9-]+-\d+\.webp)$/.test(key)||seen.has(key))throw Error('Invalid media object key');seen.add(key);
   const bytes=new Uint8Array(value);if(!bytes.length||bytes.length>p.objectBytes)throw Error('Media object capacity reached');
   return {key,bytes,mime:httpMetadata.contentType||'application/octet-stream',sha256:digest(bytes)};
  }),total=prepared.reduce((sum,x)=>sum+x.bytes.length,0);
  if(total>p.assetBytes)throw Error('Media asset capacity reached');
  store.transaction(()=>{
   if(stats().bytes+total>capacityBytes)throw Error('Media capacity reached');
   for(const x of prepared){
    db.prepare('INSERT INTO media_objects(key,bytes,mime,created_at,sha256) VALUES(?,?,?,?,?)').run(x.key,x.bytes.length,x.mime,store.clock(),x.sha256);
    for(let offset=0,part=0;offset<x.bytes.length;offset+=p.chunkBytes,part++)db.prepare('INSERT INTO media_chunks(key,part,data) VALUES(?,?,?)').run(x.key,part,x.bytes.slice(offset,offset+p.chunkBytes));
   }
   db.prepare('UPDATE media_capacity SET bytes=bytes+?,objects=objects+? WHERE id=1').run(total,prepared.length);
  });
 };
 return {
  stats,putMany,put:(key,value,{httpMetadata={}}={})=>putMany([{key,value,httpMetadata}]),
  async get(key){
   const metadata=db.prepare('SELECT bytes,sha256 FROM media_objects WHERE key=?').get(key);if(!metadata)return null;
   if(!Number.isSafeInteger(metadata.bytes)||metadata.bytes<1||metadata.bytes>p.objectBytes)throw Error('Media integrity unavailable');
   const parts=db.prepare('SELECT part,data FROM media_chunks WHERE key=? ORDER BY part LIMIT 49').all(key);
   if(parts.length!==Math.ceil(metadata.bytes/p.chunkBytes))throw Error('Media integrity unavailable');
   const bytes=new Uint8Array(metadata.bytes);let offset=0;
   for(let n=0;n<parts.length;n++){
    const value=new Uint8Array(parts[n].data),expected=Math.min(p.chunkBytes,metadata.bytes-offset);
    if(parts[n].part!==n||value.length!==expected)throw Error('Media integrity unavailable');bytes.set(value,offset);offset+=value.length;
   }
   if(metadata.sha256&&digest(bytes)!==metadata.sha256)throw Error('Media integrity unavailable');
   return {arrayBuffer:async()=>bytes.buffer};
  },
  async delete(keys){
   store.transaction(()=>{for(const key of new Set(Array.isArray(keys)?keys:[keys])){
    const row=db.prepare('SELECT bytes FROM media_objects WHERE key=?').get(key);
    db.prepare('DELETE FROM media_chunks WHERE key=?').run(key);db.prepare('DELETE FROM media_objects WHERE key=?').run(key);
    if(row)db.prepare('UPDATE media_capacity SET bytes=bytes-?,objects=objects-1 WHERE id=1').run(row.bytes);
   }});
  },
 };
}
