import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
test('a confirmed reschedule refreshes its shown price/duration snapshot and actual assigned staff/resource atomically',()=>{
 const store=openStore({filename:':memory:',secret:'x'.repeat(64),clock:()=>Date.parse('2026-10-06T00:00:00Z')}),auth=createAuth(store),api=createPlatform(store);
 try{
  const login=email=>{const s=auth.session(null),c=auth.start(s,email,'local-contract-test');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'local-contract-test').user;};
  const owner=login('contract-owner@example.com'),client=login('contract-client@example.com');
  const org=api.createOrganization(owner,{name:'Contract QA',bio:'Private contract test',city:'Vilnius',kind:'salon'}),scope={role:'professional',organizationId:org.id},w=api.workspace(owner,scope),service=api.createService(owner,{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Originali procedūra',durationMin:60,priceMinor:2500,bufferBeforeMin:5,bufferAfterMin:10});
  api.createClient(owner,{organizationId:org.id,name:'Contract client',email:client.email});
  const input={scope,providerServiceId:service.id,dayOffset:1,from:900,to:1200,addons:[]},original=api.manualVisit(owner,{scope,clientId:client.id,candidate:api.availability(input,owner).slots[0],idempotencyKey:'original-contract'});
  const staff=api.createStaff(owner,{organizationId:org.id,name:'Kitas meistras'}),resource=api.createResource(owner,{organizationId:org.id,label:'Kita darbo vieta'});
  api.edit(owner,{scope,table:'services',id:service.id,version:service.version,values:{label:'Atnaujinta procedūra',priceMinor:4000,durationMin:90,practitionerId:staff.id,resourceId:resource.id}});
  assert.equal(store.read().bookings[0].priceMinor,2500);assert.equal(store.read().bookings[0].serviceSnapshot.label,'Originali procedūra');
  const outsider=login('contract-outsider@example.com');
  assert.equal(api.availability({...input,scope:undefined}).slots.length,0);
  assert.throws(()=>api.availability({...input,scope:{role:'customer'},ignoreBookingId:original.id},outsider),e=>e.code==='FORBIDDEN');
  const candidate=api.availability({...input,scope:{role:'customer'},ignoreBookingId:original.id},client).slots[0],moved=api.changeBooking(client,{scope:{role:'customer'},id:original.id,version:original.version,candidate});
  assert.equal(moved.priceMinor,4000);assert.equal(moved.durationMin,90);assert.equal(moved.practitionerId,staff.id);assert.equal(moved.resourceId,resource.id);assert.equal(moved.serviceSnapshot.label,'Atnaujinta procedūra');assert.equal(moved.serviceSnapshot.practitionerName,'Kitas meistras');assert.equal(moved.serviceSnapshot.priceMinor,moved.priceMinor);assert.equal(moved.serviceSnapshot.durationMin,moved.durationMin);assert.equal(moved.version,2);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM mail_outbox WHERE booking_id=?').get(original.id).n,2);assert.equal(store.read().bookings.length,1);
 }finally{store.close();}
});
