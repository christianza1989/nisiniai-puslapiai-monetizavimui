import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
const now=Date.parse('2026-10-07T07:00:00Z');
const hair='kirpimai-vyru-kirpimas',nails='lakavimas-gelinis-lakavimas';
function fixture(){const store=openStore({filename:':memory:',secret:'offer-fixture-only-'.repeat(4),clock:()=>now}),auth=createAuth(store),api=createPlatform(store);
 const login=email=>{const s=auth.session(null),c=auth.start(s,email,'127.0.0.1');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'127.0.0.1').user;};
 const owner=login('owner@example.com'),client=login('client@example.com'),operator=login('operator@example.com'),stranger=login('stranger@example.com');operator.operator=true;
 const org=api.createOrganization(owner,{name:'Izoliuotas upgrade testas',kind:'salon',city:'Vilnius',bio:'Tik atmintyje laikomas testas.'}),scope={role:'professional',organizationId:org.id};
 const p1=api.workspace(owner,scope).practitioners[0],p2=api.createStaff(owner,{organizationId:org.id,name:'Antras meistras'}),r1=api.workspace(owner,scope).resources[0],r2=api.createResource(owner,{organizationId:org.id,label:'Antra vieta'});
 const selected=api.selectProcedures(owner,{organizationId:org.id,procedureIds:[hair,nails],version:0,idempotencyKey:'initial-selection'});
 const make=(offer=selected[0])=>api.saveOffer(owner,{id:offer.id,version:offer.version,label:'Kirpimas',variants:[{id:'variant-fixture',label:'Trumpi plaukai',priceMinor:2500,durationMin:60,staffOptions:[{practitionerId:p1.id,resourceId:r1.id},{practitionerId:p2.id,resourceId:r2.id,priceMinor:3500,durationMin:90}]}]});
 const publish=offer=>{const pending=api.submitOffer(owner,{id:offer.id,version:offer.version});return api.moderateOffer(operator,{id:offer.id,version:pending.version,state:'approved'});};
 const approveOrg=()=>{const r=api.submitRevision(owner,{scope,name:org.name,bio:org.bio});api.moderate(operator,{id:r.id,state:'approved'});};
 return {store,api,owner,client,operator,stranger,org,scope,p1,p2,r1,r2,selected,make,publish,approveOrg};
}
const fails=(code,fn)=>assert.throws(fn,e=>e.code===code);

test('Versioned catalogue additions require eligibility, retain archived IDs and resolve or reject provider requests',()=>{const f=fixture();try{
 const change=input=>f.api.changeTaxonomy(f.operator,{version:f.api.taxonomy().version,...input});
 fails('FORBIDDEN',()=>f.api.changeTaxonomy(f.owner,{version:f.api.taxonomy().version,operation:'add'}));
 fails('INVALID_INPUT',()=>change({operation:'add',kind:'treatment',nodeId:'kirpimas',parentId:'kirpimai',label:'Collision',aliases:[]}));
 const id='kirpimai-izoliuota-procedura';change({operation:'add',kind:'treatment',nodeId:id,parentId:'kirpimai',label:'Izoliuota procedūra',aliases:['Testinis kirpimas']});
 const n=f.api.taxonomy().nodes.find(n=>n.id===id);assert.equal(n.enabled,true);assert.equal(n.reviewRequired,true);assert.equal(n.path.length,3);
 const request=f.api.requestProcedure(f.owner,{organizationId:f.org.id,label:'Prašymas',description:'Izoliuotas naujos procedūros prašymas.'});
 const resolved=f.api.moderateProcedure(f.operator,{id:request.id,version:request.version,targetId:id,reason:'Atitinka papildytą katalogą.'});assert.equal(resolved.targetId,id);
 fails('VERSION_CONFLICT',()=>f.api.moderateProcedure(f.operator,{id:request.id,version:request.version,targetId:id,reason:'Pakartojimas'}));
 const rejected=f.api.requestProcedure(f.owner,{organizationId:f.org.id,label:'Atmetamas prašymas',description:'Reikia patikslinti.'});assert.equal(f.api.moderateProcedure(f.operator,{id:rejected.id,version:rejected.version,state:'rejected',reason:'Nepakanka apimties.'}).state,'rejected');
 const selected=f.api.selectProcedures(f.owner,{organizationId:f.org.id,version:1,idempotencyKey:'custom-selection',procedureIds:[id]});const offer=f.make(selected[0]);
 fails('QUALIFICATION_REQUIRED',()=>f.api.submitOffer(f.owner,{id:offer.id,version:offer.version}));
 f.api.assessQualification(f.operator,{organizationId:f.org.id,locationId:f.org.locationId,taxonomyNodeId:id,evidenceReference:'Isolated fixture only',expiresAt:'2027-01-01T00:00:00Z'});f.publish(offer);f.approveOrg();
 assert.equal(f.api.catalog({taxonomyServiceId:id}).length,1);assert.ok(f.api.availability({providerServiceId:'variant-fixture',dayOffset:1,from:1020,to:1200}).slots.length);
 const group=f.api.taxonomy().nodes.find(n=>n.id==='kirpimai');change({operation:'update',nodeId:group.id,label:'Kirpimų grupė',rank:2});assert.equal(f.api.taxonomy().nodes.find(n=>n.id===id).path[1],'Kirpimų grupė');
 fails('DEPENDENCY_CONFLICT',()=>change({operation:'archive',nodeId:'kirpimai'}));change({operation:'archive',nodeId:id});change({operation:'aliases',nodeId:id,aliases:['Naujas sinonimas']});
 assert.equal(f.api.catalog({}).length,0);assert.equal(f.api.availability({providerServiceId:'variant-fixture',dayOffset:1,from:1020,to:1200}).slots.length,0);assert.ok(f.api.workspace(f.operator,{role:'operator'}).catalogueNodes.find(n=>n.id===id).archived);
 change({operation:'restore',nodeId:id});assert.equal(f.api.catalog({}).length,1);assert.equal(f.api.taxonomy().nodes.find(n=>n.id===id).aliases[0],'Naujas sinonimas');
 change({operation:'add',kind:'category',nodeId:'izoliuota-pletros-kategorija',label:'Plėtros testas',aliases:[]});assert.equal(f.api.taxonomy().nodes.find(n=>n.id==='izoliuota-pletros-kategorija').enabled,false);
 }finally{f.store.close();}});

test('Inactive incomplete variants are excluded from publication without breaking the approved active roster',()=>{const f=fixture();try{
 const o=f.make(),draft=f.api.saveOffer(f.owner,{...o,variants:[...o.variants,{id:'inactive-unpriced',label:'Ruošiama',active:false,priceMinor:null,durationMin:null,staffOptions:[]}]});f.publish(draft);f.approveOrg();assert.deepEqual(f.api.catalog({}).map(x=>x.id),['variant-fixture']);
 }finally{f.store.close();}});
test('Server memberships separate prices, reception and assigned staff; revoked access fails immediately while bookings survive',()=>{const f=fixture();try{
 const offer=f.make();f.publish(offer);f.approveOrg();const makeBooking=(user,p,key)=>{const c=f.api.availability({providerServiceId:'variant-fixture',practitionerId:p.id,dayOffset:1,from:1020,to:1200}).slots[0],h=f.api.hold(user,c);return f.api.confirm(user,{holdId:h.id,name:'Role fixture',idempotencyKey:key});};
 const b1=makeBooking(f.client,f.p1,'staff-one'),b2=makeBooking(f.owner,f.p2,'staff-two');
 let member=f.api.grantMembership(f.owner,{organizationId:f.org.id,email:f.stranger.email,role:'reception',version:0});
 assert.ok(f.api.workspace(f.stranger,f.scope).capabilities.includes('bookings'));assert.equal(f.api.workspace(f.stranger,f.scope).offers.length,0);fails('FORBIDDEN',()=>f.api.saveOffer(f.stranger,{...f.api.workspace(f.owner,f.scope).offers[0],label:'Unauthorized price'}));fails('FORBIDDEN',()=>f.api.createStaff(f.stranger,{organizationId:f.org.id,name:'Unauthorized team'}));
 assert.ok(f.api.createClient(f.stranger,{organizationId:f.org.id,name:'Reception fixture',email:'reception-client@example.com'}).id);
 member=f.api.grantMembership(f.owner,{organizationId:f.org.id,email:f.stranger.email,role:'practitioner',practitionerId:f.p2.id,version:member.version});const own=f.api.workspace(f.stranger,f.scope);assert.deepEqual(own.bookings.map(b=>b.id),[b2.id]);assert.ok(!own.clients.some(c=>c.id===b1.clientId));assert.equal(own.schedules.length,1);assert.equal(own.services[0].priceMinor,3500);assert.equal(own.memberships.length,0);
 fails('FORBIDDEN',()=>f.api.cancelBooking(f.stranger,{scope:f.scope,id:b1.id,version:b1.version}));fails('FORBIDDEN',()=>f.api.edit(f.stranger,{scope:f.scope,table:'schedules',id:f.api.workspace(f.owner,f.scope).schedules.find(s=>s.practitionerId===f.p1.id).id,values:{startMin:600}}));fails('FORBIDDEN',()=>f.api.grantMembership(f.stranger,{organizationId:f.org.id,email:f.client.email,role:'manager',version:0}));
 fails('VERSION_CONFLICT',()=>f.api.revokeMembership(f.owner,{id:member.id,version:1}));f.api.revokeMembership(f.owner,{id:member.id,version:member.version});fails('FORBIDDEN',()=>f.api.workspace(f.stranger,f.scope));assert.equal(f.api.session(f.stranger).organizations.length,0);assert.equal(f.api.workspace(f.owner,f.scope).bookings.length,2);assert.equal(f.api.workspace(f.owner,f.scope).accessChanges.length,3);
 }finally{f.store.close();}});
test('Verified imported account repairs a missing client projection without changing its account ID or granting roles',()=>{
 const store=openStore({filename:':memory:',secret:'imported-account-fixture-'.repeat(3),clock:()=>now});try{store.db.prepare('INSERT INTO accounts(id,site_id,email,name,created_at) VALUES(?,?,?,?,?)').run('imported-fixture','madbeauty','imported@example.com','Imported fixture',now);const auth=createAuth(store),session=auth.session(null),challenge=auth.start(session,'imported@example.com','fixture'),verified=auth.verify(session,challenge.challengeId,store.capture(challenge.challengeId).code,'fixture');assert.equal(verified.user.id,'imported-fixture');assert.equal(verified.user.operator,0);assert.equal(createPlatform(store).workspace(verified.user,{role:'customer'}).client.id,'imported-fixture');assert.equal(store.read().clients.length,1);}finally{store.close();}
});
test('CSV draft price batches are atomic, scoped, idempotent, versioned and never overwrite approved prices',()=>{const f=fixture();try{
 const draft=f.make();f.publish(draft);f.approveOrg();const o=f.api.workspace(f.owner,f.scope).offers.find(o=>o.id===draft.id),input={organizationId:f.org.id,idempotencyKey:'csv-prices',updates:[{offerId:o.id,version:o.version,variantId:'variant-fixture',practitionerId:f.p2.id,priceMinor:4200,durationMin:105}]};
 const result=f.api.bulkOfferPrices(f.owner,input);assert.equal(result.updated,1);assert.deepEqual(f.api.bulkOfferPrices(f.owner,input),result);assert.equal(f.api.catalog()[0].priceToMinor,3500);const saved=f.api.workspace(f.owner,f.scope).offers.find(x=>x.id===o.id);assert.equal(saved.variants[0].staffOptions[1].priceMinor,4200);assert.equal(saved.state,'draft');
 fails('VERSION_CONFLICT',()=>f.api.bulkOfferPrices(f.owner,{...input,idempotencyKey:'stale'}));fails('IDEMPOTENCY_CONFLICT',()=>f.api.bulkOfferPrices(f.owner,{...input,updates:[{...input.updates[0],priceMinor:4500}]}));
 const before=f.api.workspace(f.owner,f.scope).offers.find(x=>x.id===o.id);fails('NOT_FOUND',()=>f.api.bulkOfferPrices(f.owner,{...input,idempotencyKey:'invalid-tail',updates:[{...input.updates[0],version:saved.version,priceMinor:9900},{...input.updates[0],version:saved.version,variantId:'does-not-exist'}]}));assert.deepEqual(f.api.workspace(f.owner,f.scope).offers.find(x=>x.id===o.id),before);
 fails('FORBIDDEN',()=>f.api.bulkOfferPrices(f.stranger,{...input,idempotencyKey:'cross'}));
 }finally{f.store.close();}});
test('Required/exclusive addon groups and service rules use full payable duration; private changes retain the public menu',()=>{const f=fixture();try{
 const group=f.api.saveMenuGroup(f.owner,{organizationId:f.org.id,label:'Kirpimas ir priežiūra',rank:2});let o=f.make();
 o=f.api.saveOffer(f.owner,{...o,menuGroupId:group.id,rank:3,variants:o.variants.map(v=>({...v,addonGroups:[{id:'finish',label:'Užbaigimas',min:1,max:1}],addons:[{id:'styling',label:'Šukavimas',groupId:'finish',priceMinor:1000,durationMin:30},{id:'drying',label:'Džiovinimas',groupId:'finish',priceMinor:500,durationMin:15}],availabilityRules:{weekdays:['Thu'],fromMin:1020,toMin:1200,maxAdvanceDays:14}}))});
 f.publish(o);f.approveOrg();assert.equal(f.api.profile(f.org.id).services[0].menuGroupLabel,'Kirpimas ir priežiūra');
 assert.equal(f.api.option('variant-fixture',[],f.p2.id).requiresSelection,true);
 fails('ADDON_SELECTION_REQUIRED',()=>f.api.availability({providerServiceId:'variant-fixture',dayOffset:1,from:1020,to:1200}));
 fails('ADDON_SELECTION_REQUIRED',()=>f.api.availability({providerServiceId:'variant-fixture',addons:['styling','drying'],dayOffset:1,from:1020,to:1200}));
 const rows=f.api.search({city:'Vilnius',taxonomyServiceId:'plaukai',dayOffset:1,from:1020,to:1200});assert.equal(rows[0].availability.state,'needs-options');assert.equal(rows[0].availability.slots.length,0);
 const a=f.api.availability({providerServiceId:'variant-fixture',practitionerId:f.p2.id,addons:['styling'],dayOffset:1,from:1020,to:1200});assert.equal(a.durationMin,120);assert.equal(a.priceMinor,4500);assert.ok(a.slots.length);assert.ok(a.slots.every(c=>new Date(c.endAt).getUTCHours()<=17));
 assert.equal(f.api.availability({providerServiceId:'variant-fixture',addons:['drying'],dayOffset:2,from:1020,to:1200}).slots.length,0);
 const old=f.api.workspace(f.owner,f.scope).offers.find(x=>x.id===o.id);fails('INVALID_INPUT',()=>f.api.saveOffer(f.owner,{...old,variants:old.variants.map(v=>({...v,availabilityRules:{unknown:true}}))}));
 assert.equal(f.api.profile(f.org.id).services[0].menuGroupLabel,'Kirpimas ir priežiūra');fails('FORBIDDEN',()=>f.api.saveMenuGroup(f.stranger,{id:group.id,version:group.version,organizationId:f.org.id,label:'Hijack'}));
 }finally{f.store.close();}});
test('Procedure selection persists private unpriced drafts, strict scope, versions and idempotency',()=>{const f=fixture();try{
 assert.equal(f.api.catalog().length,0);assert.equal(f.api.workspace(f.owner,f.scope).offers.length,2);assert.equal(f.api.workspace(f.owner,f.scope).selectionVersion,1);
 const same=f.api.selectProcedures(f.owner,{organizationId:f.org.id,procedureIds:[nails,hair],version:0,idempotencyKey:'initial-selection'});assert.deepEqual(same.map(o=>o.id).sort(),f.selected.map(o=>o.id).sort());
 fails('VERSION_CONFLICT',()=>f.api.selectProcedures(f.owner,{organizationId:f.org.id,procedureIds:[nails],version:0,idempotencyKey:'stale'}));
 fails('IDEMPOTENCY_CONFLICT',()=>f.api.selectProcedures(f.owner,{organizationId:f.org.id,procedureIds:[nails],version:0,idempotencyKey:'initial-selection'}));
 fails('FORBIDDEN',()=>f.api.selectProcedures(f.stranger,{organizationId:f.org.id,procedureIds:[hair],version:1,idempotencyKey:'cross'}));
 const draft=f.api.saveOffer(f.owner,{id:f.selected[0].id,version:1,label:'Kirpimas',variants:[{label:'Trumpi plaukai',priceMinor:null,durationMin:null,staffOptions:[]}]});
 fails('OFFER_INCOMPLETE',()=>f.api.submitOffer(f.owner,{id:draft.id,version:draft.version}));assert.equal(f.api.catalog().length,0);
 assert.equal(f.api.taxonomy().nodes.filter(n=>n.enabled&&n.kind==='treatment').length,194);
}finally{f.store.close();}});
test('One approved variant has two staff prices and calendars, atomic hold, stable snapshots, private draft edits',()=>{const f=fixture();try{
 let offer=f.publish(f.make());f.approveOrg();const rows=f.api.catalog({taxonomyServiceId:'plaukai'});assert.equal(rows.length,1);assert.equal(rows[0].staffOptions.length,2);
 const input={providerServiceId:'variant-fixture',dayOffset:1,from:900,to:1200};const slots=f.api.availability(input).slots;assert.ok(slots.some(s=>s.practitionerId===f.p1.id&&s.priceMinor===2500&&s.durationMin===60));assert.ok(slots.some(s=>s.practitionerId===f.p2.id&&s.priceMinor===3500&&s.durationMin===90));
 const c=slots.find(s=>s.practitionerId===f.p2.id),h=f.api.hold(f.client,c);fails('SLOT_CONFLICT',()=>f.api.hold(f.owner,c));const b=f.api.confirm(f.client,{holdId:h.id,idempotencyKey:'booking',name:'Testinis klientas'});assert.equal(b.practitionerId,f.p2.id);assert.equal(b.priceMinor,3500);assert.equal(b.durationMin,90);
 assert.equal(f.api.workspace(f.client,{role:'customer'}).bookings[0].id,b.id);assert.equal(f.api.workspace(f.owner,f.scope).bookings[0].id,b.id);
 offer=f.api.saveOffer(f.owner,{...offer,id:offer.id,label:'Pakeistas kirpimas',variants:offer.variants.map(v=>({...v,priceMinor:4500,staffOptions:v.staffOptions.map(x=>({...x,priceMinor:4500}))}))});assert.equal(f.api.catalog()[0].priceMinor,2500);
 f.publish(offer);assert.equal(f.api.catalog()[0].priceMinor,4500);const old=f.api.workspace(f.client,{role:'customer'}).bookings[0];assert.equal(old.priceMinor,3500);assert.equal(old.serviceSnapshot.label,'Trumpi plaukai');
 fails('INVALID_INPUT',()=>f.api.edit(f.owner,{scope:f.scope,table:'services',id:'variant-fixture',values:{priceMinor:100}}));
}finally{f.store.close();}});
test('Revised published variant invalidates stale hold; archive retains confirmed booking and IDs',()=>{const f=fixture();try{
 let offer=f.publish(f.make());f.approveOrg();const c=f.api.availability({providerServiceId:'variant-fixture',dayOffset:1,from:900,to:1200}).slots[0],h=f.api.hold(f.client,c);
 offer=f.api.saveOffer(f.owner,{...offer,label:'Nauja versija',variants:offer.variants.map(v=>({...v,durationMin:75,staffOptions:v.staffOptions.map(x=>({...x,durationMin:75}))}))});offer=f.publish(offer);
 fails('SLOT_CONFLICT',()=>f.api.confirm(f.client,{holdId:h.id,idempotencyKey:'stale',name:'Testas'}));assert.equal(f.store.read().bookings.length,0);f.api.releaseHold(f.client,h.id);
 const c2=f.api.availability({providerServiceId:'variant-fixture',dayOffset:1,from:900,to:1200}).slots[0],h2=f.api.hold(f.client,c2),b=f.api.confirm(f.client,{holdId:h2.id,idempotencyKey:'valid',name:'Testas'});
 f.api.archiveOffer(f.owner,{id:offer.id,version:offer.version});assert.equal(f.api.catalog().length,0);assert.equal(f.api.availability({providerServiceId:'variant-fixture',dayOffset:1,from:900,to:1200}).slots.length,0);assert.equal(f.store.read().bookings[0].id,b.id);assert.equal(f.store.read().services[0].id,'variant-fixture');
}finally{f.store.close();}});
test('Legacy migration preserves broad classification, original IDs and snapshots, idempotent rerun',()=>{const f=fixture();try{
 const s=f.api.createService(f.owner,{organizationId:f.org.id,practitionerId:f.p1.id,resourceId:f.r1.id,taxonomyServiceId:'kirpimas',label:'Esamas kirpimas',priceMinor:2700,durationMin:60});const before=f.store.read();
 const result=f.api.migrateCatalogue(f.operator);assert.equal(result.added,1);assert.equal(f.api.migrateCatalogue(f.operator).added,0);const after=f.store.read(),legacy=after.offers.find(o=>o.legacyServiceId===s.id);
 assert.equal(after.services[0].id,before.services[0].id);assert.equal(after.services[0].priceMinor,2700);assert.equal(legacy.taxonomyServiceId,'kirpimai');assert.equal(legacy.migrationState,'needs-classification');assert.deepEqual(after.bookings,before.bookings);
 fails('INVALID_INPUT',()=>f.api.submitOffer(f.owner,{id:legacy.id,version:1}));fails('FORBIDDEN',()=>f.api.migrateCatalogue(f.owner));
}finally{f.store.close();}});
