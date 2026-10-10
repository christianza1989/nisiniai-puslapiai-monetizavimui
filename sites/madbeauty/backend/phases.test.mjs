import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
const fails=(code,fn)=>assert.throws(fn,e=>e.code===code);
function fixture(){
 const store=openStore({filename:':memory:',secret:'phase-fixture-only-'.repeat(4),clock:()=>Date.parse('2026-10-07T07:00:00Z')}),auth=createAuth(store),api=createPlatform(store);
 const login=email=>{const s=auth.session(null),c=auth.start(s,email,'fixture');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'fixture').user;};
 const owner=login('phase-owner@example.com'),client=login('phase-client@example.com'),other=login('phase-other@example.com');other.operator=true;
 const org=api.createOrganization(owner,{name:'Isolated phase acceptance',kind:'salon',city:'Vilnius',bio:'Fixture only'}),scope={role:'professional',organizationId:org.id},w=api.workspace(owner,scope),p1=w.practitioners[0],r1=w.resources[0],p2=api.createStaff(owner,{organizationId:org.id,name:'Other fixture staff'}),r2=api.createResource(owner,{organizationId:org.id,label:'Other fixture chair'});
 const o=api.selectProcedures(owner,{organizationId:org.id,procedureIds:['plauku-dazymas-visu-plauku-dazymas'],version:0,idempotencyKey:'phase-procedure'})[0],phases=[{label:'Užtepimas',durationMin:20,staffBusy:true,resourceBusy:true},{label:'Laukimas',durationMin:40,staffBusy:false,resourceBusy:true},{label:'Užbaigimas',durationMin:30,staffBusy:true,resourceBusy:true}];
 const value={id:'phase-color',label:'Fixture colour',priceMinor:5000,durationMin:90,bufferBeforeMin:5,bufferAfterMin:5,phases,addons:[{id:'extra',label:'Papildomas darbas',durationMin:15,priceMinor:500}],staffOptions:[{practitionerId:p1.id,resourceId:r1.id}]};
 const save=(variant=value,offer=o)=>api.saveOffer(owner,{id:offer.id,version:offer.version,label:'Fixture colour',variants:[variant]}),publish=offer=>{const pending=api.submitOffer(owner,{id:offer.id,version:offer.version});return api.moderateOffer(other,{id:offer.id,version:pending.version,state:'approved'});};const published=publish(save());
 const cut=api.createService(owner,{organizationId:org.id,practitionerId:p1.id,resourceId:r2.id,taxonomyServiceId:'kirpimas',label:'Other chair haircut',durationMin:30,priceMinor:1500}),chair=api.createService(owner,{organizationId:org.id,practitionerId:p2.id,resourceId:r1.id,taxonomyServiceId:'kirpimas',label:'Same chair other staff',durationMin:30,priceMinor:1500});
 const rev=api.submitRevision(owner,{scope,name:org.name,bio:org.bio});api.moderate(other,{id:rev.id,state:'approved'});
 const input={providerServiceId:value.id,practitionerId:p1.id,dayOffset:1,from:540,to:1200},candidate=()=>api.availability(input).slots.find(c=>new Date(c.startAt).toISOString().includes('06:15:'));
 return {store,api,owner,client,other,org,scope,p1,p2,r1,r2,o,published,value,phases,save,publish,input,candidate,cut,chair};
}
test('Processing frees staff on another chair but retains the occupied chair, buffers and each active phase',()=>{const f=fixture();try{
 const c=f.candidate();assert.ok(c);assert.equal(c.phases.length,3);assert.equal(c.occupancies[2].practitionerId,null);const h=f.api.hold(f.client,c);
 const cut=f.api.availability({providerServiceId:f.cut.id,dayOffset:1,from:585,to:615}).slots;assert.equal(cut.length,1);assert.equal(cut[0].startAt,'2026-10-08T06:45:00.000Z');
 assert.equal(f.api.availability({providerServiceId:f.chair.id,dayOffset:1,from:585,to:615}).slots.length,0);assert.equal(f.api.availability({providerServiceId:f.cut.id,dayOffset:1,from:600,to:645}).slots.length,0);
 f.api.createBusyBlock(f.owner,{organizationId:f.org.id,practitionerId:f.p1.id,dayOffset:1,from:575,to:615,label:'Allowed processing break'});fails('SCHEDULE_CONFLICT',()=>f.api.createBusyBlock(f.owner,{organizationId:f.org.id,resourceId:f.r1.id,dayOffset:1,from:575,to:615,label:'Occupied chair'}));
 const b=f.api.confirm(f.client,{holdId:h.id,name:'Phase fixture',idempotencyKey:'colour'});assert.deepEqual(b.phases,c.phases);assert.deepEqual(b.occupancies,c.occupancies);
 const schedule=f.api.workspace(f.owner,f.scope).schedules.find(s=>s.practitionerId===f.p1.id);f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:schedule.id,version:schedule.version,values:{breakStartMin:575,breakEndMin:615}});const next=f.api.workspace(f.owner,f.scope).schedules.find(s=>s.id===schedule.id);fails('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:schedule.id,version:next.version,values:{breakStartMin:570,breakEndMin:615}}));
 f.publish(f.save({...f.value,phases:[]},f.published));assert.deepEqual(f.api.workspace(f.client,{role:'customer'}).bookings[0].phases,b.phases);fails('INVALID_INPUT',()=>f.api.edit(f.owner,{scope:f.scope,table:'services',id:f.value.id,version:2,values:{durationMin:60}}));
 }finally{f.store.close();}});
test('Phase validation, per-staff timings, stale phase changes and addons keep one server-authoritative duration',()=>{const f=fixture();try{
 fails('INVALID_INPUT',()=>f.save({...f.value,phases:[{...f.phases[0],durationMin:19},...f.phases.slice(1)]},f.published));fails('INVALID_INPUT',()=>f.save({...f.value,phases:[{...f.phases[0],staffBusy:'false'},...f.phases.slice(1)]},f.published));fails('INVALID_INPUT',()=>f.save({...f.value,staffOptions:[{practitionerId:f.p1.id,resourceId:f.r1.id,durationMin:100}]},f.published));
 fails('INVALID_INPUT',()=>f.save({...f.value,phases:f.phases.map(p=>({...p,staffBusy:false,resourceBusy:false}))},f.published));
 const c=f.candidate(),h=f.api.hold(f.client,c),changed=f.publish(f.save({...f.value,phases:[{...f.phases[0],durationMin:30},{...f.phases[1],durationMin:30},f.phases[2]]},f.published));fails('SLOT_CONFLICT',()=>f.api.confirm(f.client,{holdId:h.id,name:'Phase fixture',idempotencyKey:'stale'}));assert.equal(f.store.read().bookings.length,0);f.api.releaseHold(f.client,h.id);
 const extra=f.api.availability({...f.input,addons:['extra']}).slots[0];assert.equal(extra.durationMin,105);assert.equal(extra.phases.at(-1).durationMin,15);assert.equal(extra.phases.at(-1).staffBusy,true);assert.equal(extra.phases.at(-1).endAt,extra.endAt);
 const ownPhases=[{label:'First',durationMin:10,staffBusy:true,resourceBusy:true},{label:'Wait',durationMin:60,staffBusy:false,resourceBusy:true},{label:'Finish',durationMin:30,staffBusy:true,resourceBusy:true}];f.publish(f.save({...f.value,staffOptions:[{practitionerId:f.p1.id,resourceId:f.r1.id,durationMin:100,phases:ownPhases}]},changed));assert.equal(f.api.availability(f.input).slots[0].durationMin,100);assert.equal(f.api.availability(f.input).slots[0].phases[1].durationMin,60);
 }finally{f.store.close();}});
