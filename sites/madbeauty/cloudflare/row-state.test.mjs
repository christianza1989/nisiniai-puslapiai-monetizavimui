import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const core=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
test('Actual Workers SQLite migration keeps IDs across restart, stores >1 MiB as bounded rows and isolates object identities',async()=>{
 const bundle=await build({stdin:{resolveDir:import.meta.dirname,sourcefile:'isolated-row-fixture.mjs',contents:`
  import {DurableObject} from 'cloudflare:workers';
  import {openDurableStore} from './store.mjs';
  import {initialState} from '../backend/primitives.mjs';
  export class RowFixture extends DurableObject {
   constructor(ctx,env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS platform_state(site_id TEXT PRIMARY KEY,version INTEGER NOT NULL,data TEXT NOT NULL)');
    if(!ctx.storage.sql.exec('SELECT site_id FROM platform_state').toArray().length){const d=initialState();d.clients.push({id:'retained-client',name:'Fixture client',email:'fixture@example.com'});d.organizations.push({id:'retained-org',name:'Fixture org'});d.bookings.push({id:'retained-booking',organizationId:'retained-org',serviceSnapshot:{label:'Retained snapshot',priceMinor:3000}});ctx.storage.sql.exec('INSERT INTO platform_state(site_id,version,data) VALUES(?,9,?)','madbeauty',JSON.stringify(d));}
    this.store=openDurableStore(ctx,env.SESSION_SECRET);
   }
   async fetch(request){const url=new URL(request.url);try{if(url.pathname==='/grow')this.store.transaction(()=>{const d=this.store.read();for(let i=0;i<2600;i++)d.bookings.push({id:'scale-'+i,organizationId:'retained-org',status:'completed',serviceSnapshot:{label:'Fixture '+i,description:'x'.repeat(500),priceMinor:3000}});this.store.write(d);});
    if(url.pathname==='/oversized')this.store.transaction(()=>{this.store.mail({recipient:'fixture@example.com',type:'confirmation',payload:{bookingId:'retained-booking'}});const d=this.store.read();d.bookings[0].serviceSnapshot.label='x'.repeat(129*1024);this.store.write(d);});
    const d=this.store.read();return Response.json({stats:this.store.rowStats(),retained:d.bookings[0],bookings:d.bookings.length,checkpoint:this.store.db.prepare('SELECT source_version FROM state_migration_checkpoints').get().source_version,outbox:this.store.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n});
   }catch(e){return Response.json({code:e.code||'FAILED'},{status:e.status||500});}}
  }
  export default {fetch(request,env){const url=new URL(request.url);return env.ROWS.get(env.ROWS.idFromName(url.searchParams.get('id')||'a')).fetch(request);}};
 `},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'}});
 const dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-row-workers-'));
 const start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{ROWS:{className:'RowFixture',useSQLite:true}},durableObjectsPersist:dir,bindings:{SESSION_SECRET:'isolated-row-workers-fixture-'.repeat(3)}});let mf=start();
 try{
  const get=async path=>{const r=await mf.dispatchFetch('https://rows-fixture.test'+path);assert.equal(r.status,200);return r.json();};
  const before=await get('/?id=a');assert.equal(before.checkpoint,9);assert.equal(before.retained.id,'retained-booking');assert.equal(before.stats.legacyMirrored,true);
  const grown=await get('/grow?id=a');assert.equal(grown.bookings,2601);assert.ok(grown.stats.bytes>1024*1024);assert.ok(grown.stats.maxRecordBytes<128*1024);assert.equal(grown.stats.legacyMirrored,false);assert.deepEqual(grown.retained,before.retained);assert.equal((await get('/?id=b')).bookings,1);
  const failed=await mf.dispatchFetch('https://rows-fixture.test/oversized?id=a');assert.equal(failed.status,503);assert.equal((await failed.json()).code,'CAPACITY');const after=await get('/?id=a');assert.equal(after.stats.version,grown.stats.version);assert.equal(after.outbox,0);
  await mf.dispose();mf=start();assert.deepEqual((await get('/?id=a')).retained,before.retained);assert.equal((await get('/?id=a')).bookings,2601);assert.equal((await get('/?id=b')).bookings,1);
 }finally{await mf.dispose();if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-row-workers-'))await rm(dir,{recursive:true,force:true});}
});
