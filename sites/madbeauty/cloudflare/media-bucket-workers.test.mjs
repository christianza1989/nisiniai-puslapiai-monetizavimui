import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const {build}=await import(pathToFileURL(path.join(runtime,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(runtime,'node_modules/miniflare/dist/src/index.js')));
test('Actual Workers media migration, batch rollback, integrity and mixed 4000-booking/24-image load survive SQLite restart',async()=>{
 const bundle=await build({stdin:{resolveDir:import.meta.dirname,sourcefile:'isolated-media-capacity.mjs',contents:`
  import {DurableObject} from 'cloudflare:workers';
  import {openDurableStore} from './store.mjs';
  import {createSqlMediaBucket} from './media-bucket.mjs';
  export class MediaFixture extends DurableObject {
   constructor(ctx,env){super(ctx,env);this.store=openDurableStore(ctx,env.SESSION_SECRET);const db=this.store.db;if(!db.prepare("SELECT name FROM sqlite_master WHERE name='media_objects'").get()){db.exec('CREATE TABLE media_objects(key TEXT PRIMARY KEY,bytes INTEGER NOT NULL,mime TEXT NOT NULL,created_at INTEGER NOT NULL); CREATE TABLE media_chunks(key TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(key,part));');db.prepare('INSERT INTO media_objects VALUES(?,?,?,?)').run('originals/asset_00000000-0000-0000-0000-000000000000',3,'image/webp',0);db.prepare('INSERT INTO media_chunks VALUES(?,?,?)').run('originals/asset_00000000-0000-0000-0000-000000000000',0,new Uint8Array([1,2,3]));}this.bucket=createSqlMediaBucket(this.store,{capacityBytes:16*1024*1024});}
   async fetch(request){const url=new URL(request.url),key=n=>'originals/asset_'+String(n).padStart(8,'0')+'-0000-0000-0000-000000000000',start=performance.now();try{
    if(url.pathname==='/load'){
     this.store.transaction(()=>{const d=this.store.read();d.bookings=Array.from({length:4000},(_,n)=>({id:'fixture-booking-'+n,organizationId:'fixture-org-'+n%20,status:'completed',startAt:'2026-10-01T07:00:00Z',endAt:'2026-10-01T08:00:00Z',serviceSnapshot:{label:'Isolated synthetic visit',description:'x'.repeat(300),priceMinor:3000}}));this.store.write(d);});
     for(let n=1;n<=24;n++)await this.bucket.putMany([{key:key(n),value:new Uint8Array(256*1024).fill(n)},{key:'variants/'+key(n).slice(10)+'-360.webp',value:new Uint8Array(128*1024).fill(n)}]);
    }
    if(url.pathname==='/capacity')await this.bucket.putMany([{key:key(91),value:new Uint8Array(12*1024*1024)},{key:key(92),value:new Uint8Array(12*1024*1024)}]);
    if(url.pathname==='/duplicate')await this.bucket.putMany([{key:key(90),value:new Uint8Array(100)},{key:key(1),value:new Uint8Array(1)}]);
    if(url.pathname==='/corrupt')this.store.db.prepare('UPDATE media_chunks SET data=? WHERE key=? AND part=0').run(new Uint8Array(256*1024).fill(88),key(1));
    if(url.pathname==='/read')return new Response(await (await this.bucket.get(key(1))).arrayBuffer());
    const raw=await (await this.bucket.get(key(0))).arrayBuffer(),catalogueStart=performance.now();this.store.readCollections(['organizations','services','locations','practitioners','resources','media']);const catalogueMs=performance.now()-catalogueStart;
    return Response.json({media:this.bucket.stats(),state:this.store.rowStats(),databaseBytes:this.ctx.storage.sql.databaseSize,legacy:Array.from(new Uint8Array(raw)),originals:this.store.db.prepare('SELECT COUNT(*) AS n FROM media_objects WHERE key LIKE ?').get('originals/%').n,catalogueMs,elapsedMs:performance.now()-start});
   }catch(e){return Response.json({code:e.message},{status:503});}}
  }
  export default {fetch(request,env){return env.MEDIA_FIXTURE.get(env.MEDIA_FIXTURE.idFromName('isolated-only')).fetch(request);}};
 `},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'}});
 const dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-media-workers-')),start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{MEDIA_FIXTURE:{className:'MediaFixture',useSQLite:true}},durableObjectsPersist:dir,bindings:{SESSION_SECRET:'isolated-media-workers-'.repeat(3)}});let mf=start();
 try{
  const get=async route=>{const r=await mf.dispatchFetch('https://media-fixture.test'+route);assert.equal(r.status,200);return r.json();};const before=await get('/');assert.deepEqual(before.legacy,[1,2,3]);
  const loaded=await get('/load');assert.equal(loaded.media.objects,49);assert.equal(loaded.media.bytes,24*384*1024+3);assert.equal(loaded.state.legacyMirrored,false);assert.ok(loaded.state.bytes>1024*1024);
  for(const route of ['/capacity','/duplicate']){assert.equal((await mf.dispatchFetch('https://media-fixture.test'+route)).status,503);assert.deepEqual((await get('/')).media,loaded.media);}
  assert.equal((await mf.dispatchFetch('https://media-fixture.test/read')).status,200);await get('/corrupt');assert.equal((await mf.dispatchFetch('https://media-fixture.test/read')).status,503);
  await mf.dispose();mf=start();const reopened=await get('/');assert.deepEqual(reopened.media,loaded.media);assert.deepEqual(reopened.legacy,[1,2,3]);assert.equal(reopened.state.records,loaded.state.records);assert.equal((await mf.dispatchFetch('https://media-fixture.test/read')).status,503);
  await writeFile(new URL('../platform-upgrade-20261007/evidence/media-workers-load.json',import.meta.url),JSON.stringify({environment:'isolated-miniflare-sqlite',scenario:{bookings:4000,organizationsInRecords:20,images:24,originalBytes:256*1024,derivativeBytes:128*1024,variants:1},loaded,reopened,limitations:'Synthetic storage/timing diagnostic, not production latency, real JPEG transform throughput, or customer-capacity promise.'},null,2));
 }finally{await mf.dispose();if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-media-workers-'))await rm(dir,{recursive:true,force:true});}
});
