import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeClock,localInstant} from './demo-model.mjs';
import {createPlatformAdapter} from './platform-adapter.mjs';
import {createAppServer,resolveRoute} from './app-server.mjs';
import {catalogTarget,boundedFilters,publicProjection} from './seo-contract.mjs';
const clock=makeClock('2026-10-05T08:00:00Z');
const pro={role:'professional',organizationId:'demo-org-0'},customer={role:'customer',clientId:'demo-client-0'},operator={role:'operator'};
const adapter=(options={})=>createPlatformAdapter({enabled:true,deployment:'local-preview',clock,...options});
const input={providerServiceId:'demo-service-0-0',dayOffset:1,from:1020,to:1200};
const candidate=async a=>(await a.availability(input)).slots[0];

test('Whole duration, add-ons and resource buffers: 19:00 start is rejected when 20:00 shift needs cleanup',async()=>{
  const a=adapter(),plain=await a.availability(input),added=await a.availability({...input,addons:['demo-addon-removal']});
  assert.equal(plain.durationMin,60);assert.equal(added.durationMin,75);assert.equal(added.priceMinor,2700);
  assert.ok(plain.slots.length>added.slots.length);assert.ok(plain.slots.every(s=>Date.parse(s.occupiedEnd)<=Date.parse(localInstant(clock,1,1200))));
  assert.ok(!plain.slots.some(s=>s.startAt===localInstant(clock,1,1140)));
});
test('Busy block, lunch, existing booking and lead time are all excluded',async()=>{
  const a=adapter(),slots=(await a.availability({...input,from:540,to:1200})).slots;
  for(const min of [600,780,960])assert.ok(!slots.some(s=>s.startAt===localInstant(clock,1,min)));
  assert.equal((await a.availability({...input,dayOffset:0,from:540,to:600})).slots.length,0);
});
test('Missing, stale, no-slot and empty states are distinct; unknown add-on is rejected',async()=>{
  for(const [scenario,state] of [['no-calendar','none'],['stale','stale'],['no-slots','no-slots']]){const a=adapter({scenario});const result=await a.availability(input);assert.equal(result.state,state);assert.deepEqual(result.slots,[]);}
  assert.deepEqual(await adapter({scenario:'empty'}).catalog(),[]);await assert.rejects(()=>adapter().availability({...input,addons:['not-real']}),/priedas/);
});
test('Hold, confirm and idempotent retry create exactly one local booking; public catalog has no clients',async()=>{
  const a=adapter(),c=await candidate(a),h=await a.hold(c);
  assert.ok(!(await a.availability(input)).slots.some(s=>s.id===c.id));
  const req={holdId:h.id,name:'Demo klientas',email:'demo-guest@example.com',idempotencyKey:'test-1',clientId:customer.clientId};
  const b=await a.confirm(req),retry=await a.confirm(req);assert.equal(b.id,retry.id);assert.equal((await a.workspace(pro)).bookings.length,17);
  const row=(await a.catalog())[0];assert.ok(!('email' in row)&&!('clients' in row));
});
test('Two overlapping local holds for a shared salon resource conflict',async()=>{
  const a=adapter(),p=await a.workspace({role:'professional',organizationId:'demo-org-24'}),s1=p.services[0],s2=p.services.find(s=>s.practitionerId!==s1.practitionerId);
  const c1=(await a.availability({...input,providerServiceId:s1.id})).slots[0],c2=(await a.availability({...input,providerServiceId:s2.id})).slots.find(s=>s.startAt===c1.startAt);
  assert.ok(c2);await a.hold(c1);await assert.rejects(()=>a.hold(c2),e=>e.code==='SLOT_CONFLICT');
});
test('Expired hold and injected conflict do not produce a false success',async()=>{
  const expired=adapter({scenario:'expired-hold'}),h=await expired.hold(await candidate(expired));await assert.rejects(()=>expired.confirm({holdId:h.id,name:'Demo',email:'demo-x@example.com',idempotencyKey:'expire'}),e=>e.code==='HOLD_EXPIRED');
  const conflict=adapter({scenario:'conflict'});await assert.rejects(async()=>conflict.hold(await candidate(conflict)),e=>e.code==='SLOT_CONFLICT');assert.equal((await conflict.workspace(pro)).bookings.length,16);
});
test('Cancellation releases the resource; change conflict retains previous appointment',async()=>{
  const a=adapter(),h=await a.hold(await candidate(a)),b=await a.confirm({holdId:h.id,name:'Demo',email:'demo-x@example.com',idempotencyKey:'cancel'});
  await a.cancelBooking({scope:{role:'customer',clientId:b.clientId},id:b.id,version:b.version,reason:'Demo'});assert.ok((await a.availability(input)).slots.some(s=>s.startAt===b.startAt));
  const persisted={value:null,load(){return this.value;},save(x){this.value=structuredClone(x);}};
  const first=adapter({persistence:persisted});const old=(await first.workspace(pro)).bookings.find(b=>b.status==='confirmed');
  const c=await candidate(first);await first.edit({scope:pro,table:'services',id:input.providerServiceId,values:{label:'Demo'}});
  const bad=adapter({persistence:persisted,scenario:'conflict'});await assert.rejects(()=>bad.changeBooking({scope:pro,id:old.id,version:old.version,candidate:c}),e=>e.code==='SLOT_CONFLICT');assert.equal((await bad.workspace(pro)).bookings.find(b=>b.id===old.id).startAt,old.startAt);
});
test('Explicit scopes reject another organization/client and permission-denied scenario',async()=>{
  const a=adapter();await assert.rejects(()=>a.workspace({role:'guest'}),e=>e.code==='UNAUTHENTICATED');
  await assert.rejects(()=>a.edit({scope:pro,table:'services',id:'demo-service-1-0',values:{label:'Other'}}),e=>e.code==='FORBIDDEN');
  const b=(await a.workspace(pro)).bookings.find(b=>b.status==='confirmed');await assert.rejects(()=>a.cancelBooking({scope:{role:'customer',clientId:'demo-client-1'},id:b.id,version:b.version}),e=>e.code==='FORBIDDEN');
  await assert.rejects(()=>adapter({scenario:'permission-denied'}).workspace(pro),e=>e.code==='FORBIDDEN');
});
test('Service edit updates profile and availability from the same model; stale entity version fails',async()=>{
  const a=adapter();await a.edit({scope:pro,table:'services',id:input.providerServiceId,version:1,values:{durationMin:90,priceMinor:4500}});
  assert.equal((await a.profile(pro.organizationId)).services[0].priceMinor,4500);assert.equal((await a.availability(input)).durationMin,90);
  await assert.rejects(()=>a.edit({scope:pro,table:'services',id:input.providerServiceId,version:1,values:{label:'Stale'}}),e=>e.code==='VERSION_CONFLICT');
});
test('Review belongs to a completed customer visit and cannot be duplicated; messages are scoped',async()=>{
  const a=adapter(),d=await a.workspace(customer),b=d.bookings.find(b=>b.status==='completed'&&!d.reviews.some(r=>r.bookingId===b.id));assert.ok(b);
  await a.review({scope:customer,bookingId:b.id,rating:5,text:'Demo komentaras'});await assert.rejects(()=>a.review({scope:customer,bookingId:b.id,rating:5,text:'Dar kartą'}),e=>e.code==='ALREADY_REVIEWED');
  await a.message({scope:customer,bookingId:b.id,text:'Demo žinutė'});assert.equal((await a.workspace(pro)).messages.length,1);
  assert.equal((await a.workspace({role:'professional',organizationId:'demo-org-1'})).messages.length,0);
});
test('Profile revision is pending until operator moderation; returned reason required; public revocation immediate',async()=>{
  const a=adapter(),r=await a.submitRevision({scope:pro,name:'Naujas demo vardas',bio:'Demo aprašymas'});
  assert.notEqual((await a.profile(pro.organizationId)).name,r.name);await assert.rejects(()=>a.moderate({scope:operator,id:r.id,state:'returned',reason:''}),e=>e.code==='INVALID_INPUT');
  await a.moderate({scope:operator,id:r.id,state:'approved'});assert.equal((await a.profile(pro.organizationId)).name,r.name);
  await a.edit({scope:operator,table:'organizations',id:pro.organizationId,values:{approved:false}});assert.equal(await a.profile(pro.organizationId),null);assert.ok(!(await a.catalog()).some(s=>s.organizationId===pro.organizationId));
});
test('Delivery failure retains booking; inquiry and waitlist remain separate from reservations',async()=>{
  const a=adapter({scenario:'delivery-error'}),h=await a.hold(await candidate(a)),b=await a.confirm({holdId:h.id,name:'Demo',email:'demo-x@example.com',idempotencyKey:'delivery'});const d=await a.workspace(pro);assert.ok(d.bookings.some(x=>x.id===b.id));assert.equal(d.outbox[0].state,'failed');
  const before=d.bookings.length;await a.createInquiry({organizationId:pro.organizationId,providerServiceId:input.providerServiceId,note:'Demo'});await a.createInquiry({organizationId:pro.organizationId,providerServiceId:input.providerServiceId,note:'Demo',waitlist:true});assert.equal((await a.workspace(pro)).bookings.length,before);
});
test('Local persistence is version/clock isolated; off and real failure never restore demo fallback',async()=>{
  let saved=null;const persistence={load:()=>saved,save:x=>{saved=structuredClone(x);},clear:()=>{saved=null;}};const a=adapter({persistence});await a.edit({scope:pro,table:'services',id:input.providerServiceId,values:{label:'Persisted demo'}});
  assert.equal((await adapter({persistence}).profile(pro.organizationId)).services[0].label,'Persisted demo');
  const off=createPlatformAdapter({persistence});assert.equal(off.mode,'off');assert.deepEqual(await off.catalog(),[]);assert.equal(await off.profile(pro.organizationId),null);
  const real={catalog:async()=>{throw Error('offline');}};assert.equal(createPlatformAdapter({realAdapter:real,persistence}),real);await assert.rejects(()=>real.catalog(),/offline/);
  await a.reset();assert.equal(saved,null);
});
test('Manual visit is organization/client scoped and shares availability rules',async()=>{
  const a=adapter();await assert.rejects(async()=>a.manualVisit({scope:pro,candidate:await candidate(a),clientId:'demo-client-1',idempotencyKey:'manual-bad'}),e=>e.code==='FORBIDDEN');
  const b=await a.manualVisit({scope:pro,candidate:await candidate(a),clientId:'demo-client-0',idempotencyKey:'manual-good'});assert.equal(b.clientId,'demo-client-0');
});
test('Held service snapshots reject duration/buffer edits even when price is unchanged; resource revocation rechecked',async()=>{
  const a=adapter(),h=await a.hold(await candidate(a));await a.edit({scope:pro,table:'services',id:input.providerServiceId,values:{durationMin:90}});
  await assert.rejects(()=>a.confirm({holdId:h.id,name:'Demo',email:'demo-a@example.com',idempotencyKey:'stale-duration'}),e=>e.code==='STALE_AVAILABILITY');
  const b=adapter(),h2=await b.hold(await candidate(b));await b.edit({scope:pro,table:'resources',id:'demo-org-0-room',values:{active:false}});
  await assert.rejects(()=>b.confirm({holdId:h2.id,name:'Demo',email:'demo-a@example.com',idempotencyKey:'resource-off'}),e=>e.code==='SLOT_CONFLICT');
});
test('New break or closed day cannot hide a future confirmed appointment; invalid persistence fails explicitly',async()=>{
  const a=adapter();await assert.rejects(()=>a.edit({scope:pro,table:'schedules',id:'demo-staff-0-0-schedule',values:{breakStartMin:600,breakEndMin:720}}),e=>e.code==='SCHEDULE_CONFLICT');
  await assert.rejects(()=>a.edit({scope:pro,table:'schedules',id:'demo-staff-0-0-schedule',values:{closedDay:1}}),e=>e.code==='SCHEDULE_CONFLICT');
  const broken=adapter({persistence:{save(){throw Error('full');}}});await assert.rejects(()=>broken.edit({scope:pro,table:'services',id:input.providerServiceId,values:{label:'Demo'}}),e=>e.code==='STORAGE_FAILED');
  assert.equal((await broken.profile(pro.organizationId)).services[0].label,'Manikiūras');
});
test('Guest contact becomes a distinct scoped demo identity; operator cannot edit private booking, client or chat',async()=>{
  const a=adapter(),h=await a.hold(await candidate(a)),b=await a.confirm({holdId:h.id,name:'Demo svečias',email:'demo-guest@example.com',idempotencyKey:'guest-identity'});
  assert.notEqual(b.clientId,'demo-client-0');assert.equal((await a.workspace({role:'customer',clientId:b.clientId})).client.name,'Demo svečias');
  await assert.rejects(()=>a.cancelBooking({scope:operator,id:b.id,version:1}),e=>e.code==='FORBIDDEN');await assert.rejects(()=>a.message({scope:operator,bookingId:b.id,text:'Demo'}),e=>e.code==='FORBIDDEN');
  await assert.rejects(()=>a.edit({scope:operator,table:'clients',id:b.clientId,values:{name:'Other'}}),e=>e.code==='FORBIDDEN');
});
test('Bounded URL filters exclude PII and unknown facets; article resolver gates city/future/revoked/demo targets',()=>{
  assert.deepEqual(boundedFilters('#paslauga=manikiuras&email=secret&token=private&diena=1'),{paslauga:'manikiuras',diena:'1'});assert.throws(()=>boundedFilters('#diena=999'));
  const hub={serviceId:'manikiuras',cityId:null,path:'/paslaugos/manikiuras',approved:true,deployed:true,unchanged:true,publishAt:'2026-10-01',isDemo:false};const city={...hub,cityId:'vilnius',path:'/paslaugos/manikiuras/vilnius'};
  assert.equal(catalogTarget({serviceId:'manikiuras',cityId:'vilnius',registry:[hub,city],now:clock.now}),city.path);
  assert.equal(catalogTarget({serviceId:'manikiuras',cityId:'kaunas',registry:[hub,city],now:clock.now}),hub.path);
  assert.equal(catalogTarget({serviceId:'manikiuras',registry:[{...hub,isDemo:true}],now:clock.now}),null);
  assert.equal(catalogTarget({serviceId:'manikiuras',registry:[{...hub,publishAt:'2027-01-01'}],now:clock.now}),null);
  assert.equal(publicProjection([{...hub,isDemo:true},{...hub,revoked:true}]).length,0);
});
test('All declared routes resolve; unknown service/city/guide and unavailable default profile do not',async()=>{
  const inv=JSON.parse(await readFile(new URL('../SCREEN_INVENTORY.json',import.meta.url),'utf8'));
  const {contentProjection}=await import('../content/adapter.mjs'),content=await contentProjection(),contentResolver=slug=>content.pages.some(p=>p.type==='guide'&&p.slug==='gidai/'+slug);
  assert.equal(inv.screens.length,70);
  for(const s of inv.screens.filter(s=>s.route)){const route=s.route.replace(':service','manikiuras').replace(':city','vilnius').replace(':slug',s.id==='content-guide'?'kaip-pasirinkti-nagu-spalva':s.id==='content-author'?'mb-pinet':s.id==='public-venue'?'demo-org-24':'demo-org-0').replace(':id',s.id==='professional-client-detail'?'demo-client-0':'demo-booking-210');assert.ok(resolveRoute(route,{contentResolver}),s.id);}
  for(const path of ['/paslaugos/fake/vilnius','/paslaugos/manikiuras/fake','/gidai/future','/meistrai/demo-org-29'])assert.equal(resolveRoute(path,{contentResolver}),null);
  assert.equal(resolveRoute('/gidai/kaip-pasirinkti-nagu-spalva'),null,'Missing content binding fails closed');
});
test('Private server refuses production, mutation, original assets, discovery; known and 404 responses noindex',async()=>{
  assert.throws(()=>createAppServer({deployment:'production'}),/forbidden/);const s=createAppServer({now:clock.now});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;
  try{for(const path of ['/','/paslaugos/manikiuras/vilnius','/meistrui/kalendorius','/gidai/kaip-pasirinkti-nagu-spalva']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.match(r.headers.get('x-robots-tag'),/noindex/);const body=await r.text();assert.equal(body.includes('application/ld+json'),path==='/'||path.startsWith('/gidai/'));assert.ok(!body.includes('demo-org-'));assert.ok(!body.includes('example.com'));}
    for(const path of ['/missing','/gidai/future','/gidai/kaip-issirinkti-nagu-spalva','/sitemap.xml','/llms.txt','/private-originals/hero-violet-v1.png','/%2e%2e%2fBUSINESS.md','/paslaugos/manikiuras/vilnius?page=999999']){const r=await fetch(base+path);assert.equal(r.status,404,path);assert.match(r.headers.get('x-robots-tag'),/noindex/);}
    assert.equal((await fetch(base,{method:'POST'})).status,405);
  }finally{await new Promise(r=>s.close(r));}
});
test('New responsive asset families and actual preload URLs resolve; font and compressed modules served correctly',async()=>{
  const media=JSON.parse(await readFile(new URL('./public/app-media.json',import.meta.url),'utf8')),s=createAppServer({now:clock.now});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;
  try{for(const a of media.assets)for(const v of a.variants){assert.equal((await fetch(base+'/'+v.file)).status,200,v.file);}
    const home=await fetch(base).then(r=>r.text());assert.ok(home.includes('hero-violet-1600.webp'));assert.ok(!home.includes('hero-violet-1280.webp'));
    assert.equal((await fetch(base+'/fonts/dmsans-app.woff2')).headers.get('content-type'),'font/woff2');
    assert.equal((await fetch(base+'/app.mjs',{headers:{'Accept-Encoding':'gzip'}})).headers.get('content-encoding'),'gzip');
  }finally{await new Promise(r=>s.close(r));}
});
