import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
function fixture(){
 let now=Date.parse('2026-10-07T07:00:00Z');const store=openStore({filename:':memory:',secret:'visit-sequence-fixture-'.repeat(4),clock:()=>now}),auth=createAuth(store),api=createPlatform(store);
 const login=email=>{const s=auth.session(null),c=auth.start(s,email,'fixture');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'fixture').user;};
 const owner=login('visit-owner@example.com'),client=login('visit-client@example.com'),other=login('visit-other@example.com'),staff=login('visit-staff@example.com');other.operator=true;
 const org=api.createOrganization(owner,{name:'Isolated multi-service fixture',bio:'Local acceptance only',kind:'salon',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=api.workspace(owner,scope),p1=w.practitioners[0],r1=w.resources[0],p2=api.createStaff(owner,{organizationId:org.id,name:'Second fixture staff'}),r2=api.createResource(owner,{organizationId:org.id,label:'Second fixture resource'});
 const manicure=api.createService(owner,{organizationId:org.id,practitionerId:p1.id,resourceId:r1.id,taxonomyServiceId:'manikiuras',label:'Manikiūras',durationMin:60,priceMinor:2500,bufferBeforeMin:5,bufferAfterMin:10}),pedicure=api.createService(owner,{organizationId:org.id,practitionerId:p2.id,resourceId:r2.id,taxonomyServiceId:'pedikiuras',label:'Pedikiūras',durationMin:45,priceMinor:2000,bufferBeforeMin:5,bufferAfterMin:10});
 const rev=api.submitRevision(owner,{scope,name:org.name,bio:org.bio});api.moderate(other,{id:rev.id,state:'approved'});api.grantMembership(owner,{organizationId:org.id,email:staff.email,role:'practitioner',practitionerId:p2.id,version:0});
 const items=[{providerServiceId:manicure.id,practitionerId:p1.id,addons:[]},{providerServiceId:pedicure.id,practitionerId:p2.id,addons:[]}],input={items,dayOffset:1,from:900,to:1200},candidate=()=>api.visitAvailability(input).slots[0];
 return {store,api,owner,client,other,staff,org,scope,p1,p2,r1,r2,manicure,pedicure,items,input,candidate,advance:ms=>now+=ms};
}
const fails=(code,fn)=>assert.throws(fn,e=>e.code===code);
test('One atomic sequence holds every staff/resource, confirms once, preserves totals and reschedules or cancels the whole visit',()=>{const f=fixture();try{
 const c=f.candidate();assert.equal(c.segments.length,2);assert.equal(c.priceMinor,4500);assert.equal(c.procedureMin,105);assert.equal(c.durationMin,120);assert.equal(c.segments[1].occupiedStart,c.segments[0].occupiedEnd);
 const h=f.api.holdVisit(f.client,c);fails('SLOT_CONFLICT',()=>f.api.holdVisit(f.other,c));
 fails('SCHEDULE_CONFLICT',()=>f.api.createBusyBlock(f.owner,{organizationId:f.org.id,practitionerId:f.p2.id,dayOffset:1,from:975,to:1020,label:'Would overlap second held segment'}));
 const b=f.api.confirmVisit(f.client,{holdId:h.id,name:'Sequence fixture',idempotencyKey:'sequence-confirm'});assert.equal(f.store.read().bookings.length,1);assert.equal(b.serviceSnapshot.label,'Manikiūras + Pedikiūras');assert.equal(b.segments[1].serviceSnapshot.priceMinor,2000);assert.equal(f.api.confirmVisit(f.client,{holdId:h.id,name:'Sequence fixture',idempotencyKey:'sequence-confirm'}).id,b.id);assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM mail_outbox WHERE type='confirmation'").get().n,1);
 fails('FORBIDDEN',()=>f.api.visitAvailability({...f.input,ignoreBookingId:b.id,scope:{role:'customer'}},f.other));
 fails('INVALID_INPUT',()=>f.api.changeBooking(f.client,{id:b.id,scope:{role:'customer'},version:b.version,candidate:c}));
 const n=f.api.visitAvailability({...f.input,dayOffset:2,ignoreBookingId:b.id,scope:{role:'customer'}},f.client).slots[0];assert.ok(n);
 const changed=f.api.changeVisit(f.client,{id:b.id,scope:{role:'customer'},version:b.version,candidate:n});assert.equal(changed.id,b.id);assert.equal(changed.version,2);assert.equal(changed.segments[1].dateKey,n.dateKey);assert.ok(f.api.availability({providerServiceId:f.pedicure.id,dayOffset:1,from:975,to:1030}).slots.some(s=>s.startAt===c.segments[1].startAt));
 fails('VERSION_CONFLICT',()=>f.api.changeVisit(f.client,{id:b.id,scope:{role:'customer'},version:b.version,candidate:c}));
 f.api.cancelBooking(f.client,{id:b.id,scope:{role:'customer'},version:changed.version,reason:'Fixture cancellation'});assert.equal(f.store.read().bookings[0].status,'canceled');assert.ok(f.api.visitAvailability({...f.input,dayOffset:2}).slots.some(s=>s.id===n.id));
 }finally{f.store.close();}});
test('A changed second segment leaves no half booking or confirmation mail; expiry and invalid cross-place selections fail safely',()=>{const f=fixture();try{
 const c=f.candidate(),h=f.api.holdVisit(f.client,c);f.api.edit(f.owner,{scope:f.scope,table:'services',id:f.pedicure.id,version:f.pedicure.version,values:{priceMinor:2700}});
 fails('SLOT_CONFLICT',()=>f.api.confirmVisit(f.client,{holdId:h.id,name:'Fixture',idempotencyKey:'changed-second'}));assert.equal(f.store.read().bookings.length,0);assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM mail_outbox WHERE type='confirmation'").get().n,0);assert.equal(f.store.read().holds.find(x=>x.id===h.id).state,'held');
 f.api.releaseHold(f.client,h.id);const fresh=f.candidate();assert.equal(fresh.priceMinor,5200);const exp=f.api.holdVisit(f.client,fresh);f.advance(121000);fails('HOLD_EXPIRED',()=>f.api.confirmVisit(f.client,{holdId:exp.id,name:'Fixture',idempotencyKey:'expired'}));assert.equal(f.store.read().bookings.length,0);
 fails('INVALID_INPUT',()=>f.api.visitAvailability({...f.input,items:[f.items[0],f.items[0]]}));fails('INVALID_INPUT',()=>f.api.visitAvailability({...f.input,items:[f.items[0]]}));
 const d=f.store.read();d.services.find(s=>s.id===f.pedicure.id).organizationId='other-organization';f.store.write(d);fails('INVALID_INPUT',()=>f.api.visitAvailability(f.input));
 }finally{f.store.close();}});
test('Assigned practitioner sees only their own sequence segment and cannot strand or mutate a colleague segment',()=>{const f=fixture();try{
 const b=f.api.confirmVisit(f.client,{holdId:f.api.holdVisit(f.client,f.candidate()).id,name:'Fixture',idempotencyKey:'staff-sequence'}),w=f.api.workspace(f.staff,f.scope);
 assert.equal(w.bookings.length,1);assert.equal(w.bookings[0].id,b.id);assert.equal(w.bookings[0].segments.length,1);assert.equal(w.bookings[0].priceMinor,2000);assert.ok(w.bookings[0].partialVisit);assert.ok(!JSON.stringify(w.bookings[0]).includes(f.manicure.id));assert.ok(!JSON.stringify(w.bookings[0]).includes(f.p1.id));
 fails('FORBIDDEN',()=>f.api.cancelBooking(f.staff,{id:b.id,scope:f.scope,version:b.version}));
 fails('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table:'practitioners',id:f.p2.id,version:f.p2.version,values:{active:false}}));fails('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table:'resources',id:f.r2.id,version:f.r2.version,values:{active:false}}));
 const shift=f.api.workspace(f.owner,f.scope).schedules.find(s=>s.practitionerId===f.p2.id);fails('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:shift.id,version:shift.version,values:{endMin:960}}));assert.equal(f.store.read().bookings[0].version,1);
 }finally{f.store.close();}});
