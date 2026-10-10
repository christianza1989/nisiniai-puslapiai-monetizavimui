import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../backend/store.mjs';
import {createSqlMediaBucket,SQL_MEDIA_POLICY} from './media-bucket.mjs';
const key=n=>'originals/asset_'+String(n).padStart(8,'0')+'-0000-0000-0000-000000000000';
test('SQL media batch is bounded and atomic across capacity, duplicate, deletion and byte corruption',async()=>{
 const store=openStore({filename:':memory:',secret:'isolated-media-bucket-'.repeat(3)}),bucket=createSqlMediaBucket(store,{capacityBytes:600000});
 try{
  const bytes=new Uint8Array(300000).fill(37);await bucket.put(key(1),bytes);assert.deepEqual(new Uint8Array(await (await bucket.get(key(1))).arrayBuffer()),bytes);const stats=bucket.stats();
  await assert.rejects(()=>bucket.putMany([{key:key(2),value:bytes},{key:key(3),value:bytes}]),/capacity/);assert.deepEqual(bucket.stats(),stats);assert.equal(await bucket.get(key(2)),null);
  await assert.rejects(()=>bucket.putMany([{key:key(2),value:new Uint8Array(10)},{key:key(1),value:new Uint8Array(1)}]),/UNIQUE/);assert.equal(await bucket.get(key(2)),null);assert.deepEqual(bucket.stats(),stats);
  const part=store.db.prepare('SELECT data FROM media_chunks WHERE key=? AND part=0').get(key(1)).data;const corrupt=new Uint8Array(part);corrupt[0]=38;store.db.prepare('UPDATE media_chunks SET data=? WHERE key=? AND part=0').run(corrupt,key(1));await assert.rejects(()=>bucket.get(key(1)),/integrity/);
  store.db.prepare('DELETE FROM media_chunks WHERE key=? AND part=1').run(key(1));await assert.rejects(()=>bucket.get(key(1)),/integrity/);
  await bucket.delete([key(1),key(1),key(3)]);assert.equal(bucket.stats().bytes,0);assert.equal(bucket.stats().objects,0);await bucket.put(key(2),new Uint8Array(1));
  await assert.rejects(()=>bucket.put('../public-original',new Uint8Array(1)),/key/);await assert.rejects(()=>bucket.put(key(3),new Uint8Array(SQL_MEDIA_POLICY.objectBytes+1)),/capacity/);
 }finally{store.close();}
});
test('Legacy SQL image bytes survive adapter migration and reopen without inventing a digest or rewriting the original',async()=>{
 const store=openStore({filename:':memory:',secret:'isolated-legacy-media-'.repeat(3)});
 try{
  store.db.exec('CREATE TABLE media_objects(key TEXT PRIMARY KEY,bytes INTEGER NOT NULL,mime TEXT NOT NULL,created_at INTEGER NOT NULL); CREATE TABLE media_chunks(key TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(key,part));');const value=new Uint8Array([1,2,3]);store.db.prepare('INSERT INTO media_objects VALUES(?,?,?,?)').run(key(1),value.length,'image/webp',0);store.db.prepare('INSERT INTO media_chunks VALUES(?,?,?)').run(key(1),0,value);
  let bucket=createSqlMediaBucket(store);assert.deepEqual(new Uint8Array(await (await bucket.get(key(1))).arrayBuffer()),value);assert.equal(store.db.prepare('SELECT sha256 FROM media_objects').get().sha256,null);
  await bucket.put(key(2),value);bucket=createSqlMediaBucket(store);assert.equal(bucket.stats().bytes,6);assert.equal(bucket.stats().objects,2);assert.deepEqual(new Uint8Array(await (await bucket.get(key(1))).arrayBuffer()),value);
 }finally{store.close();}
});
