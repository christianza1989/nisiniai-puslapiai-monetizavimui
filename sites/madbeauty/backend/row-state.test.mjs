import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openStore,initialState} from './store.mjs';
const secret='normalized-state-fixture-only-'.repeat(3);
test('Legacy migration preserves exact logical records and an immutable checkpoint; restart and mirrored rollback remain current',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-rows-')),filename=path.join(dir,'state.sqlite'),legacy=initialState();
 legacy.clients.push({id:'fixture-client',name:'Fixture',email:'fixture@example.com'});legacy.organizations.push({id:'fixture-org',name:'Fixture organization'});legacy.bookings.push({id:'fixture-booking',organizationId:'fixture-org',clientId:'fixture-client',status:'confirmed',serviceSnapshot:{label:'Original variant',priceMinor:3000,durationMin:60}});legacy.idempotency['fixture-confirm']={bookingId:'fixture-booking'};
 const raw=JSON.stringify(legacy),db=new DatabaseSync(filename);db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));db.prepare('INSERT INTO platform_state(site_id,version,data) VALUES(?,9,?)').run('madbeauty',raw);db.close();
 let store;try{
  store=openStore({filename,secret});assert.deepEqual(store.read(),legacy);assert.equal(store.rowStats().model,'rows-v2');const checkpoint=store.db.prepare('SELECT * FROM state_migration_checkpoints').get();assert.equal(checkpoint.source_version,9);assert.equal(checkpoint.data,raw);assert.equal(checkpoint.sha256,createHash('sha256').update(raw).digest('hex'));
  const changed=store.read();changed.clients[0].name='Updated fixture';store.write(changed);assert.equal(JSON.parse(store.db.prepare('SELECT data FROM platform_state').get().data).clients[0].name,'Updated fixture');assert.equal(store.db.prepare('SELECT data FROM state_migration_checkpoints').get().data,raw);
  store.close();store=openStore({filename,secret});assert.deepEqual(store.read(),changed);assert.equal(store.organizationRecords('bookings','fixture-org')[0].id,'fixture-booking');assert.equal(store.organizationRecords('bookings','other-org').length,0);
  const oldWriter=store.read();oldWriter.clients[0].name='Legacy writer fixture';store.db.prepare('UPDATE platform_state SET data=?,version=version+1').run(JSON.stringify(oldWriter));assert.deepEqual(store.read(),oldWriter);assert.equal(store.rowStats().legacyMirrored,true);
 }finally{store?.close();if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-rows-'))rmSync(dir,{recursive:true,force:true});}
});
test('Many small records exceed the former 1 MiB envelope; oversized single record and its outbox effects roll back atomically',()=>{
 const store=openStore({filename:':memory:',secret});try{
  const d=store.read();d.organizations.push({id:'fixture-scale-org',name:'Scale fixture'});for(let i=0;i<2600;i++)d.bookings.push({id:'fixture-booking-'+i,organizationId:'fixture-scale-org',practitionerId:'fixture-staff',resourceId:'fixture-resource',clientId:'fixture-client',startAt:'2026-10-08T07:00:00Z',endAt:'2026-10-08T08:00:00Z',status:'confirmed',serviceSnapshot:{label:'Synthetic history '+i,description:'x'.repeat(500),priceMinor:3000,durationMin:60}});
  assert.ok(Buffer.byteLength(JSON.stringify(d))>1024*1024);store.write(d);assert.deepEqual(store.read(),d);const stats=store.rowStats();assert.equal(stats.legacyMirrored,false);assert.ok(stats.maxRecordBytes<128*1024);assert.equal(store.organizationRecords('bookings','fixture-scale-org').length,2600);
  assert.throws(()=>store.transaction(()=>{store.mail({recipient:'fixture@example.com',type:'confirmation',payload:{bookingId:'fixture-booking-0'}});const invalid=store.read();invalid.bookings[0].serviceSnapshot.description='x'.repeat(129*1024);store.write(invalid);}),e=>e.code==='CAPACITY');assert.deepEqual(store.read(),d);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n,0);assert.equal(store.rowStats().version,stats.version);
  store.db.prepare('UPDATE platform_state SET version=version+1').run();assert.throws(()=>store.read(),/Legacy writer changed/);
 }finally{store.close();}
});
