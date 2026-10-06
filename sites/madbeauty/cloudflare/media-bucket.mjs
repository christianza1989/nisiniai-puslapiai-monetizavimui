// Bounded pilot blob store over the already-required SQLite Durable Object.
// R2 is not enabled on the account. This adapter does not activate paid storage.
const maxBytes=512*1024*1024,chunkSize=256*1024;
export function createSqlMediaBucket(store){
 const {db}=store;
 db.exec('CREATE TABLE IF NOT EXISTS media_objects(key TEXT PRIMARY KEY,bytes INTEGER NOT NULL,mime TEXT NOT NULL,created_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS media_chunks(key TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(key,part));');
 return {
  async put(key,value,{httpMetadata={}}={}){
   const bytes=new Uint8Array(value);
   store.transaction(()=>{
    const used=db.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes FROM media_objects').get().bytes;
    if(used+bytes.length>maxBytes)throw Error('Media capacity reached');
    db.prepare('INSERT INTO media_objects(key,bytes,mime,created_at) VALUES(?,?,?,?)').run(key,bytes.length,httpMetadata.contentType||'application/octet-stream',store.clock());
    for(let offset=0,part=0;offset<bytes.length;offset+=chunkSize,part++)db.prepare('INSERT INTO media_chunks(key,part,data) VALUES(?,?,?)').run(key,part,bytes.slice(offset,offset+chunkSize));
   });
  },
  async get(key){
   const metadata=db.prepare('SELECT bytes FROM media_objects WHERE key=?').get(key);if(!metadata)return null;
   const parts=db.prepare('SELECT data FROM media_chunks WHERE key=? ORDER BY part').all(key),bytes=new Uint8Array(metadata.bytes);let offset=0;
   for(const part of parts){const value=new Uint8Array(part.data);bytes.set(value,offset);offset+=value.length;}
   return {arrayBuffer:async()=>bytes.buffer};
  },
  async delete(keys){store.transaction(()=>{for(const key of Array.isArray(keys)?keys:[keys]){db.prepare('DELETE FROM media_chunks WHERE key=?').run(key);db.prepare('DELETE FROM media_objects WHERE key=?').run(key);}});},
 };
}
