import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
const now=Date.parse('2026-10-07T06:00:00Z');
function fixture(){
 const store=openStore({filename:':memory:',clock:()=>now,secret:'isolated-organization-patch-'.repeat(3)}),auth=createAuth(store),api=createPlatform(store),login=email=>{const s=auth.session(null),c=auth.start(s,email,'127.0.0.1');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'127.0.0.1').user;},owner=login('owner@example.com'),client=login('client@example.com'),operator={...owner,operator:true};
 const make=name=>{const org=api.createOrganization(owner,{name,bio:'Isolated organization mutation fixture.',kind:'solo',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=api.workspace(owner,scope),service=api.createService(owner,{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Fixture manicure',durationMin:60,priceMinor:2500});api.moderate(operator,{id:api.submitRevision(owner,{scope,name,bio:org.bio}).id,state:'approved'});return {org,scope,service};};
 const a=make('Fixture A'),b=make('Fixture B'),candidate=f=>api.availability({providerServiceId:f.service.id,dayOffset:1,from:900,to:1200,addons:[]}).slots[0];return {store,api,owner,client,a,b,candidate};
}
test('Organization booking writes avoid global history serialization, keep unrelated rows/reminders and exact size/idempotency through mixed mutations',()=>{
 const f=fixture(),{store,api,client}=f;try{
  const h=api.hold(client,f.candidate(f.b)),other=api.confirm(client,{holdId:h.id,idempotencyKey:'other-confirm',name:'Fixture client'}),job=store.db.prepare('SELECT * FROM notification_jobs WHERE booking_id=?').get(other.id),read=store.read;
  const d=read();for(let n=0;n<5000;n++){d.bookings.push({id:'unrelated-history-'+n,organizationId:f.b.org.id,clientId:'unrelated-client-'+n,status:'completed',startAt:'2026-01-01T07:00:00Z',endAt:'2026-01-01T08:00:00Z',serviceSnapshot:{description:'x'.repeat(500)}});d.clients.push({id:'unrelated-client-'+n,email:'isolated-'+n+'@example.com',name:'Unrelated fixture',version:1});d.idempotency['unrelated-client-'+n+':fixture']={bookingId:'unrelated-history-'+n};}store.write(d);
  const unrelated=store.organizationRecords('bookings',f.b.org.id),checkpoint=store.db.prepare('SELECT sha256 FROM state_migration_checkpoints').get().sha256;store.readOrganization(f.a.org.id,[client.id]);const prepare=store.db.prepare.bind(store.db);store.db.prepare=query=>{if(/(?:COUNT\(\*\)|MAX\(position\)).*FROM state_rows/i.test(query))throw Error('Forbidden history count scan during organization mutation');return prepare(query);};store.read=()=>{throw Error('Forbidden global read in organization mutation');};
  const candidate=f.candidate(f.a),hold=api.hold(client,candidate);assert.throws(()=>api.hold(client,candidate),e=>e.code==='SLOT_CONFLICT');const input={holdId:hold.id,idempotencyKey:'scoped-confirm',name:'Current fixture name'},booking=api.confirm(client,input);assert.equal(api.confirm(client,input).id,booking.id);api.message(client,{bookingId:booking.id,text:'Own scoped message'});
  assert.equal(store.recordById('bookings',booking.id).priceMinor,2500);assert.equal(store.recordById('clients',client.id).name,'Current fixture name');assert.deepEqual(store.organizationRecords('bookings',f.b.org.id),unrelated);assert.deepEqual(store.db.prepare('SELECT * FROM notification_jobs WHERE booking_id=?').get(other.id),job);
  api.cancelBooking(client,{id:booking.id,version:1,reason:'Isolated scope test'});assert.equal(store.recordById('bookings',booking.id).status,'canceled');assert.deepEqual(store.db.prepare('SELECT * FROM notification_jobs WHERE booking_id=?').get(other.id),job);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox WHERE booking_id=?').get(booking.id).n,2);assert.equal(store.db.prepare('SELECT sha256 FROM state_migration_checkpoints').get().sha256,checkpoint);
  store.db.prepare=prepare;const raw=JSON.stringify(read());assert.equal(store.rowStats().bytes,Buffer.byteLength(raw));assert.equal(store.rowStats().records,store.db.prepare('SELECT COUNT(*) AS n FROM state_rows').get().n);assert.equal(store.rowStats().legacyMirrored,false);
 }finally{store.close();}
});
test('Organization patch rejects stale or unloaded foreign records/global metadata and rolls back oversized row with its outbox',()=>{
 const f=fixture(),{store}=f;try{
  const old=store.readOrganization(f.a.org.id,[f.owner.id]),d=store.read();d.organizations.find(o=>o.id===f.b.org.id).bio='Later authoritative edit';store.write(d);old.organizations[0].bio='Stale';assert.throws(()=>store.writeOrganization(old),e=>e.code==='VERSION_CONFLICT');assert.equal(store.recordById('organizations',f.b.org.id).bio,'Later authoritative edit');
  const foreign=store.readOrganization(f.a.org.id,[f.owner.id]);foreign.services.push({...f.b.service,organizationId:f.a.org.id});assert.throws(()=>store.writeOrganization(foreign),/unloaded record/);assert.equal(store.recordById('services',f.b.service.id).organizationId,f.b.org.id);
  const global=store.readOrganization(f.a.org.id,[f.owner.id]);global.taxonomy[0].label='Forbidden global change';assert.throws(()=>store.writeOrganization(global),/global metadata/);
  const version=store.rowStats().version;assert.throws(()=>store.transaction(()=>{store.mail({recipient:'fixture@example.com',type:'confirmation',payload:{bookingId:'isolated-oversized'}});const value=store.readOrganization(f.a.org.id,[f.owner.id]);value.organizations[0].bio='x'.repeat(129*1024);store.writeOrganization(value);}),e=>e.code==='CAPACITY');assert.equal(store.rowStats().version,version);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox WHERE recipient=?').get('fixture@example.com').n,0);
 }finally{store.close();}
});
