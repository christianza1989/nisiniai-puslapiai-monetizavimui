import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {fork} from 'node:child_process';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {createApiHandler} from './http.mjs';
import {prepareMedia,readMedia,mediaPublic} from './media.mjs';
import {parseOfferCsv} from '../prototype/public/offer-csv.mjs';
const baseTime=Date.parse('2026-10-05T07:00:00Z');
test('Offer CSV attachment requires the same-origin offer capability, retains IDs and versions, and excludes private customer history',async()=>{
 const f=fixture();let handler;const server=createServer((req,res)=>handler.handle(req,res));
 try{
  const selected=f.api.selectProcedures(f.owner,{organizationId:f.org.id,procedureIds:['kirpimai-vyru-kirpimas'],version:0,idempotencyKey:'csv-export-fixture'})[0];
  const offer=f.api.saveOffer(f.owner,{...selected,label:'Export fixture',variants:[{label:'Hair fixture',durationMin:60,priceMinor:2500,staffOptions:[{practitionerId:f.service.practitionerId,resourceId:f.service.resourceId}]}]});
  const login=user=>{const s=f.auth.session(null),c=f.auth.start(s,user.email,'127.0.0.1');return f.auth.verify(s,c.challengeId,f.store.capture(c.challengeId).code,'127.0.0.1').session.token;};
  const ownerToken=login(f.owner),otherToken=login(f.customer);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;handler=createApiHandler(f.store,{origin});
  const url=origin+'/api/madbeauty/offer-prices.csv?organizationId='+encodeURIComponent(f.org.id),get=(token,extra={})=>fetch(url,{headers:{...(token?{cookie:'madbeauty_sid='+token}:{}),...extra}});
  assert.equal((await get(null)).status,401);assert.equal((await get(otherToken)).status,403);assert.equal((await get(ownerToken,{origin:'https://foreign.test'})).status,403);assert.equal((await get(ownerToken,{'sec-fetch-site':'cross-site'})).status,403);
  const response=await get(ownerToken),raw=await response.text();assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment;/);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.ok(!raw.includes(f.customer.email));
  const rows=parseOfferCsv(raw);assert.equal(rows.length,2);assert.ok(rows.every(r=>r.offerId===offer.id&&r.version===offer.version));assert.equal(rows[0].priceMinor,2500);assert.equal(rows[0].durationMin,60);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
function fixture({filename=':memory:'}={}){
  let now=baseTime;const store=openStore({filename,clock:()=>now,secret:'x'.repeat(64)}),auth=createAuth(store),api=createPlatform(store);
  function login(email){const s=auth.session(null),c=auth.start(s,email,'127.0.0.1'),r=auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'127.0.0.1');return r;}
  const owner=login('owner@example.com').user,customer=login('client@example.com').user,other=login('other@example.com').user;
  const org=api.createOrganization(owner,{name:'Vietinio testo meistrė',bio:'Savarankiškai pateiktas testinis profilis.',city:'Vilnius',kind:'solo'});
  const w=api.workspace(owner,{role:'professional',organizationId:org.id});
  const service=api.createService(owner,{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Manikiūras',durationMin:60,priceMinor:2500,bufferBeforeMin:5,bufferAfterMin:10});
  store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(other.id);other.operator=1;
  const rev=api.submitRevision(owner,{scope:{role:'professional',organizationId:org.id},name:org.name,bio:org.bio});api.moderate(other,{id:rev.id,state:'approved'});
  const scope={role:'professional',organizationId:org.id},input={providerServiceId:service.id,dayOffset:1,from:900,to:1200,addons:[]};
  const candidate=()=>api.availability(input).slots[0];
  const book=()=>{const h=api.hold(customer,candidate());return api.confirm(customer,{holdId:h.id,name:'Testinė klientė',idempotencyKey:h.id});};
  return {store,auth,api,owner,customer,other,org,service,scope,input,candidate,book,advance:ms=>now+=ms,close:()=>store.close()};
}
const code=(expected,fn)=>assert.throws(fn,e=>e.code===expected);
test('customer request history persists statuses and exposes only that client’s safe request projection',()=>{
 const f=fixture();try{
  const input={organizationId:f.org.id,providerServiceId:f.service.id,note:'Spalio 7 d. nuo 14:00 iki 16:00'};
  const inquiry=f.api.createInquiry(f.customer,input),wait=f.api.createInquiry(f.customer,{...input,waitlist:true});
  f.api.createInquiry(f.owner,{...input,note:'Kito kliento privatus pageidavimas'});
  f.api.edit(f.owner,{scope:f.scope,table:'inquiries',id:inquiry.id,values:{status:'qualified'}});
  f.api.edit(f.owner,{scope:f.scope,table:'waitlist',id:wait.id,values:{state:'offered'}});
  const w=f.api.workspace(f.customer,{role:'customer'});assert.equal(w.inquiries.length,1);assert.equal(w.waitlist.length,1);
  assert.equal(w.inquiries[0].status,'qualified');assert.equal(w.waitlist[0].state,'offered');assert.equal(w.inquiries[0].organizationName,f.org.name);assert.equal(w.inquiries[0].serviceLabel,f.service.label);assert.equal(w.bookings.length,0);
  assert.deepEqual(Object.keys(w.inquiries[0]).sort(),['id','organizationId','providerServiceId','note','status','state','createdAt','organizationName','serviceLabel'].sort());
  assert.equal(f.api.workspace(f.other,{role:'customer'}).inquiries.length,0);
  code('FORBIDDEN',()=>f.api.edit(f.customer,{scope:{role:'customer'},table:'inquiries',id:inquiry.id,values:{status:'closed'}}));
  f.api.edit(f.owner,{scope:f.scope,table:'services',id:f.service.id,values:{active:false}});
  assert.equal(f.api.workspace(f.customer,{role:'customer'}).inquiries[0].serviceLabel,f.service.label);
  code('NOT_FOUND',()=>f.api.createInquiry(f.customer,input));
 }finally{f.close();}
});
test('inquiry-only and waitlist-only clients are visible to their provider without leaking other organizations',()=>{
 const f=fixture();try{
  const fresh=f.auth.session(null),c=f.auth.start(fresh,'inquiry-only@example.com','inquiry-test'),u=f.auth.verify(fresh,c.challengeId,f.store.capture(c.challengeId).code,'inquiry-test').user;
  f.api.createInquiry(u,{organizationId:f.org.id,providerServiceId:f.service.id,note:'Rytoj vakare'});
  f.api.createInquiry(f.customer,{organizationId:f.org.id,providerServiceId:f.service.id,note:'Laukiu laiko',waitlist:true});
  const w=f.api.workspace(f.owner,f.scope);assert.equal(w.bookings.length,0);assert.ok(w.clients.some(c=>c.id===u.id&&c.email==='inquiry-only@example.com'));assert.ok(w.clients.some(c=>c.id===f.customer.id));assert.ok(!w.clients.some(c=>c.id===f.other.id));
  code('INVALID_INPUT',()=>f.api.edit(f.owner,{scope:f.scope,table:'inquiries',id:w.inquiries[0].id,values:{status:'confirmed'}}));
  const visit=f.api.manualVisit(f.owner,{scope:f.scope,candidate:f.candidate(),clientId:u.id,idempotencyKey:'inquiry-to-visit'});assert.equal(visit.clientId,u.id);
 }finally{f.close();}
});
test('a new provider can add a scoped client and manual visit before public approval without granting client access',()=>{
 const f=fixture();try{
  const org=f.api.createOrganization(f.owner,{name:'Nauja darbo vieta',bio:'Vietinis pirmo vizito bandymas',city:'Kaunas',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=f.api.workspace(f.owner,scope);
  const service=f.api.createService(f.owner,{...f.service,organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id});
  const count=f.store.db.prepare('SELECT count(*) AS n FROM mail_outbox').get().n,client=f.api.createClient(f.owner,{organizationId:org.id,name:'Naujo kliento vardas',email:'manual-first@example.com'});
  assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM mail_outbox').get().n,count);assert.equal(f.api.workspace(f.owner,scope).clients[0].id,client.id);
  const input={providerServiceId:service.id,dayOffset:1,from:900,to:1200};assert.equal(f.api.availability(input).slots.length,0);assert.equal(f.api.profile(org.id),null);
  code('UNAUTHENTICATED',()=>f.api.availability({...input,scope}));code('FORBIDDEN',()=>f.api.availability({...input,scope},f.customer));
  const candidate=f.api.availability({...input,scope},f.owner).slots[0],b=f.api.manualVisit(f.owner,{scope,candidate,clientId:client.id,idempotencyKey:'first-private-visit'});assert.equal(b.serviceSnapshot.label,service.label);
  const anonymous=f.auth.session(null),challenge=f.auth.start(anonymous,'manual-first@example.com','manual-owner-test'),signed=f.auth.verify(anonymous,challenge.challengeId,f.store.capture(challenge.challengeId).code,'manual-owner-test').user;
  assert.equal(signed.id,client.id);assert.equal(f.api.session(signed).organizations.length,0);assert.equal(f.api.workspace(signed,{role:'customer'}).bookings[0].id,b.id);
  f.api.createClient(f.owner,{organizationId:f.org.id,name:'Privatus kitos vietos vardas',email:'manual-first@example.com'});assert.equal(f.api.workspace(f.owner,scope).clients[0].name,'Naujo kliento vardas');assert.equal(f.api.workspace(signed,{role:'customer'}).client.name,'Naujo kliento vardas');
  code('FORBIDDEN',()=>f.api.createClient(f.other,{organizationId:org.id,name:'Neautorizuotas',email:'foreign@example.com'}));
 }finally{f.close();}
});
test('operator review moderation publishes only completed visit reviews, rejects privately and guards duplicate decisions',()=>{
 const f=fixture();try{
  const b=f.book();f.advance(3*86400000);f.api.completeBooking(f.owner,{scope:f.scope,id:b.id,version:b.version});
  const r=f.api.review(f.customer,{bookingId:b.id,rating:4,text:'Vietinio bandymo įvertinimas'});assert.equal(f.api.profile(f.org.id).reviews.length,0);
  code('FORBIDDEN',()=>f.api.moderateReview(f.owner,{id:r.id,state:'approved'}));
  f.api.moderateReview(f.other,{id:r.id,state:'approved',reason:'Private operator note'});
  const visible=f.api.profile(f.org.id).reviews[0];assert.equal(visible.text,r.text);assert.ok(!('clientId' in visible));assert.ok(!('reason' in visible));
  code('VERSION_CONFLICT',()=>f.api.moderateReview(f.other,{id:r.id,state:'rejected',reason:'Changed decision'}));
  const pending=f.store.transaction(()=>{const d=f.store.read();const copy={...r,id:'reject-review-test',approved:false};d.reviews.push(copy);f.store.write(d);return copy;});
  code('INVALID_INPUT',()=>f.api.moderateReview(f.other,{id:pending.id,state:'rejected',reason:''}));f.api.moderateReview(f.other,{id:pending.id,state:'rejected',reason:'Testinis įrašas neviešinamas'});
  assert.equal(f.api.profile(f.org.id).reviews.length,1);assert.equal(f.store.read().reviews.find(r=>r.id===pending.id).state,'rejected');
 }finally{f.close();}
});
test('time blocks remove authoritative slots and reversible release restores them without removing history',()=>{
 const f=fixture();try{
  const before=f.candidate(),block=f.api.createBusyBlock(f.owner,{organizationId:f.org.id,practitionerId:f.service.practitionerId,dayOffset:1,from:900,to:1020,label:'Susitikimas'});
  assert.ok(!f.api.availability(f.input).slots.some(c=>c.id===before.id));code('FORBIDDEN',()=>f.api.releaseBusyBlock(f.other,{id:block.id,version:block.version}));
  code('INVALID_INPUT',()=>f.api.createBusyBlock(f.owner,{organizationId:f.org.id,practitionerId:f.service.practitionerId,dateKey:'2026-02-30',from:900,to:1020,label:'Test'}));
  f.api.releaseBusyBlock(f.owner,{id:block.id,version:block.version});assert.ok(f.api.availability(f.input).slots.some(c=>c.id===before.id));assert.equal(f.store.read().busyBlocks.find(b=>b.id===block.id).active,false);
  code('VERSION_CONFLICT',()=>f.api.releaseBusyBlock(f.owner,{id:block.id,version:block.version}));
 }finally{f.close();}
});
test('time block cannot cover a booking, a live hold or another provider resource',()=>{
 const f=fixture();try{
  const c=f.candidate(),h=f.api.hold(f.customer,c),v={organizationId:f.org.id,resourceId:f.service.resourceId,dayOffset:1,from:900,to:960,label:'Neprieinamas'};
  code('SCHEDULE_CONFLICT',()=>f.api.createBusyBlock(f.owner,v));f.api.confirm(f.customer,{holdId:h.id,name:'Klientė',idempotencyKey:'block-conflict'});code('SCHEDULE_CONFLICT',()=>f.api.createBusyBlock(f.owner,v));
  const foreign=f.api.createOrganization(f.other,{name:'Kita organizacija',bio:'Kitos organizacijos testas',city:'Kaunas',kind:'solo'}),resource=f.api.workspace(f.other,{role:'professional',organizationId:foreign.id}).resources[0];code('FORBIDDEN',()=>f.api.createBusyBlock(f.owner,{...v,resourceId:resource.id}));assert.equal(f.store.read().busyBlocks.length,0);
  code('INVALID_LOCAL_TIME',()=>f.api.createBusyBlock(f.owner,{...v,dateKey:'2026-10-25',from:210,to:240}));
 }finally{f.close();}
});
test('anonymous session creation is bounded while valid sessions keep working and public media misses create no session',async()=>{
 const f=fixture();let handler;const server=createServer((req,res)=>handler.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;handler=createApiHandler(f.store,{origin});
 try{
  const before=f.store.db.prepare('SELECT count(*) AS n FROM sessions').get().n;
  for(let i=0;i<4;i++)await fetch(origin+'/api/madbeauty/media/missing.webp');
  assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM sessions').get().n,before);
  const first=await fetch(origin+'/api/madbeauty/session'),cookie=first.headers.get('set-cookie').split(';')[0];assert.equal(first.status,200);
  for(let i=1;i<60;i++)assert.equal((await fetch(origin+'/api/madbeauty/session')).status,200);
  assert.equal((await fetch(origin+'/api/madbeauty/session')).status,429);assert.equal((await fetch(origin+'/api/madbeauty/session',{headers:{cookie}})).status,200);
  assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM sessions').get().n,before+60);
 }finally{await new Promise(r=>server.close(r));f.close();}
});
test('a held dated visit stays on its calendar date across Vilnius midnight',()=>{
  const f=fixture();try{
    f.advance(Date.parse('2026-10-05T20:59:30Z')-baseTime);
    const c=f.api.availability({...f.input,dateKey:'2026-10-06'}).slots[0];assert.equal(c.dateKey,'2026-10-06');
    const h=f.api.hold(f.customer,c);f.advance(60000);
    const b=f.api.confirm(f.customer,{holdId:h.id,name:'Testinė klientė',idempotencyKey:'midnight'});
    assert.equal(b.startAt,c.startAt);assert.equal(b.startAt.slice(0,10),'2026-10-06');
    code('INVALID_INPUT',()=>f.api.availability({...f.input,dateKey:'2026-02-30'}));
    code('INVALID_INPUT',()=>f.api.availability({...f.input,dateKey:'2026-11-06'}));
  }finally{f.close();}
});
const removeTestDir=dir=>{const full=path.resolve(dir),base=path.resolve(os.tmpdir());assert.ok(full.startsWith(base+path.sep)&&path.basename(full).startsWith('madbeauty-backend-'));rmSync(full,{recursive:true,force:true,maxRetries:10,retryDelay:50});};
test('empty real store never imports fixture identities',()=>{const s=openStore({filename:':memory:'});try{assert.equal(s.read().organizations.length,0);assert.equal(s.read().isDemo,false);const d=s.read();d.organizations.push({id:'demo-org-0'});assert.throws(()=>s.write(d));}finally{s.close();}});
test('email-only challenge hashed/bound/one-use, session rotated and durable identity reused',()=>{const f=fixture();try{const s=f.auth.session(null),c=f.auth.start(s,'new@example.com','a'),mail=f.store.capture(c.challengeId),row=f.store.db.prepare('SELECT * FROM email_challenges WHERE id=?').get(c.challengeId);assert.notEqual(row.code_hash,mail.code);code('INVALID_CODE',()=>f.auth.verify(f.auth.session(null),c.challengeId,mail.code,'a'));const verified=f.auth.verify(s,c.challengeId,mail.code,'a');assert.notEqual(verified.session.token_hash,s.token_hash);assert.equal(f.auth.session(s.token,{create:false}),null);code('INVALID_CODE',()=>f.auth.verify(s,c.challengeId,mail.code,'a'));const second=f.auth.session(null),c2=f.auth.start(second,'new@example.com','a');assert.equal(f.auth.verify(second,c2.challengeId,f.store.capture(c2.challengeId).code,'a').user.id,verified.user.id);}finally{f.close();}});
test('wrong code attempts persist, expiry and send limit fail closed',()=>{const f=fixture();try{const s=f.auth.session(null),c=f.auth.start(s,'attempts@example.com','a'),otp=f.store.capture(c.challengeId).code;for(let i=0;i<5;i++)code('INVALID_CODE',()=>f.auth.verify(s,c.challengeId,otp==='000000'?'000001':'000000','a'));assert.equal(f.store.db.prepare('SELECT attempts FROM email_challenges WHERE id=?').get(c.challengeId).attempts,5);code('INVALID_CODE',()=>f.auth.verify(s,c.challengeId,otp,'a'));const c2=f.auth.start(s,'expiry@example.com','b');f.advance(600001);code('INVALID_CODE',()=>f.auth.verify(s,c2.challengeId,f.store.capture(c2.challengeId).code,'b'));for(let i=0;i<5;i++)f.auth.start(s,'limited@example.com','c');code('RATE_LIMITED',()=>f.auth.start(s,'limited@example.com','c'));}finally{f.close();}});
test('session idle timeout/logout and CSRF mismatch are enforced',()=>{const f=fixture();try{const r=f.auth.session(null);code('CSRF',()=>f.auth.csrf(r,'wrong'));f.auth.csrf(r,r.csrf);f.advance(1800001);assert.equal(f.auth.session(r.token,{create:false}),null);const s=f.auth.session(null),fresh=f.auth.logout(s);assert.notEqual(s.token_hash,fresh.token_hash);assert.equal(f.auth.session(s.token,{create:false}),null);}finally{f.close();}});
test('provider lifecycle requires real membership, service and operator decision',()=>{const f=fixture();try{code('FORBIDDEN',()=>f.api.workspace(f.customer,f.scope));code('FORBIDDEN',()=>f.api.createService(f.customer,{organizationId:f.org.id}));code('FORBIDDEN',()=>f.api.moderate(f.customer,{id:'x',state:'approved'}));const draft=f.api.createOrganization(f.customer,{name:'Naujas profilis',bio:'Testinis pateikimas.',city:'Kaunas',kind:'solo'});assert.equal(f.api.profile(draft.id),null);code('INVALID_INPUT',()=>f.api.submitRevision(f.customer,{scope:{role:'professional',organizationId:draft.id},name:draft.name,bio:draft.bio}));assert.equal(f.api.profile(f.org.id).name,f.org.name);}finally{f.close();}});
test('whole procedure, addons, buffers, breaks and lead-time control server availability',()=>{const f=fixture();try{assert.equal(f.api.availability({...f.input,from:780,to:840}).slots.length,0);assert.equal(f.api.availability({...f.input,from:1140,to:1200}).slots.length,0);const edit=f.api.edit(f.owner,{scope:f.scope,table:'services',id:f.service.id,values:{addons:[{id:'remove',label:'Nuėmimas',durationMin:30,priceMinor:1000}]},version:1});const a=f.api.availability({...f.input,addons:['remove']});assert.equal(a.durationMin,90);assert.equal(a.priceMinor,3500);assert.ok(a.slots.every(c=>c.endAt<=new Date(Date.parse(a.slots[0].startAt)+300*60000).toISOString()));code('INVALID_INPUT',()=>f.api.option(edit.id,['unknown']));}finally{f.close();}});
test('overlapping holds and shared resources serialize; expired/released holds free availability',()=>{const f=fixture();try{const slots=f.api.availability(f.input).slots,h=f.api.hold(f.customer,slots[0]);code('SLOT_CONFLICT',()=>f.api.hold(f.other,slots[1]));code('FORBIDDEN',()=>f.api.releaseHold(f.other,h.id));f.api.releaseHold(f.customer,h.id);const h2=f.api.hold(f.other,slots[0]);f.advance(120001);assert.ok(f.api.availability(f.input).slots.some(s=>s.startAt===h2.startAt));code('HOLD_EXPIRED',()=>f.api.confirm(f.other,{holdId:h2.id,name:'Testas',idempotencyKey:'expired'}));}finally{f.close();}});
test('authoritative confirm ignores caller price/client fields; idempotency keeps one booking/outbox',()=>{const f=fixture();try{const c=f.candidate(),h=f.api.hold(f.customer,c),req={holdId:h.id,name:'Klientas',idempotencyKey:'same',priceMinor:1,clientId:f.other.id},b=f.api.confirm(f.customer,req);assert.equal(b.clientId,f.customer.id);assert.equal(b.priceMinor,2500);assert.deepEqual(f.api.confirm(f.customer,req),b);assert.equal(f.store.read().bookings.length,1);assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM mail_outbox WHERE booking_id=?').get(b.id).n,1);code('IDEMPOTENCY_CONFLICT',()=>f.api.confirm(f.customer,{...req,holdId:'other'}));assert.ok(!f.api.availability(f.input).slots.some(s=>s.startAt===c.startAt));}finally{f.close();}});
test('stale snapshots and service version change reject; confirmed price snapshot remains',()=>{const f=fixture();try{const c=f.candidate();f.advance(300001);code('STALE_AVAILABILITY',()=>f.api.hold(f.customer,c));const h=f.api.hold(f.customer,f.candidate());f.api.edit(f.owner,{scope:f.scope,table:'services',id:f.service.id,version:1,values:{priceMinor:3000}});code('SLOT_CONFLICT',()=>f.api.confirm(f.customer,{holdId:h.id,name:'Klientas',idempotencyKey:'v'}));f.api.releaseHold(f.customer,h.id);const b=f.book();f.api.edit(f.owner,{scope:f.scope,table:'services',id:f.service.id,version:2,values:{priceMinor:3500,durationMin:90}});assert.equal(f.store.read().bookings.find(x=>x.id===b.id).priceMinor,3000);assert.equal(b.durationMin,60);}finally{f.close();}});
test('cancel releases slot; tenant/customer/operator unauthorized access is denied',()=>{const f=fixture();try{const b=f.book();code('FORBIDDEN',()=>f.api.cancelBooking(f.other,{id:b.id,version:b.version,scope:{role:'customer'},reason:'x'}));code('FORBIDDEN',()=>f.api.changeBooking(f.other,{id:b.id,scope:{role:'operator'}}));assert.equal(f.api.workspace(f.other,{role:'customer'}).bookings.length,0);assert.equal(f.api.workspace(f.other,{role:'operator'}).clients.length,0);f.api.cancelBooking(f.customer,{id:b.id,version:1,reason:'Keičiasi planai',scope:{role:'customer'}});assert.ok(f.api.availability(f.input).slots.some(c=>c.startAt===b.startAt));}finally{f.close();}});
test('reschedule conflict rolls back old booking, success moves atomically',()=>{const f=fixture();try{const b=f.book(),old=structuredClone(b),available=f.api.availability(f.input).slots,c=available[0],h=f.api.hold(f.other,c);code('SLOT_CONFLICT',()=>f.api.changeBooking(f.customer,{scope:{role:'customer'},id:b.id,version:1,candidate:c}));assert.deepEqual(f.store.read().bookings[0],old);f.api.releaseHold(f.other,h.id);const moved=f.api.changeBooking(f.customer,{scope:{role:'customer'},id:b.id,version:1,candidate:c});assert.equal(moved.startAt,c.startAt);assert.equal(moved.version,2);assert.ok(f.api.availability(f.input).slots.some(x=>x.startAt===old.startAt));}finally{f.close();}});
test('graph changes cannot hide a future booking; pending revision does not change public text',()=>{const f=fixture();try{const b=f.book(),w=f.api.workspace(f.owner,f.scope),schedule=w.schedules[0];code('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:schedule.id,version:1,values:{breakStartMin:900,breakEndMin:1020}}));assert.equal(f.api.workspace(f.owner,f.scope).schedules[0].version,1);const r=f.api.submitRevision(f.owner,{scope:f.scope,name:'Naujas vardas',bio:'Naujas aprašymas'});assert.equal(f.api.profile(f.org.id).name,f.org.name);code('INVALID_INPUT',()=>f.api.moderate(f.other,{id:r.id,state:'returned',reason:''}));f.api.moderate(f.other,{id:r.id,state:'returned',reason:'Patikslinti'});assert.equal(f.api.profile(f.org.id).name,f.org.name);assert.equal(b.status,'confirmed');}finally{f.close();}});
test('public projection excludes private client/account/messages and booking occupancy',()=>{const f=fixture();try{f.book();const raw=JSON.stringify([f.api.catalog(),f.api.profile(f.org.id),f.api.availability(f.input)]);assert.ok(!raw.includes('client@example.com'));assert.ok(!raw.includes(f.customer.id));assert.ok(!raw.includes('token_hash'));assert.equal(f.api.profile('demo-org-0'),null);}finally{f.close();}});
test('durable restart and second SQLite connection keep accounts, sessions, booked resource and outbox',()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-backend-'));try{const filename=path.join(dir,'db.sqlite'),f=fixture({filename}),b=f.book(),login=f.auth.session(null),uid=f.customer.id;f.close();const s=openStore({filename,secret:'x'.repeat(64),clock:()=>baseTime}),a=createAuth(s),p=createPlatform(s);assert.equal(a.session(login.token,{create:false}).token_hash,login.token_hash);assert.equal(s.read().bookings[0].id,b.id);assert.equal(s.read().clients.find(c=>c.id===uid).email,'client@example.com');assert.equal(s.db.prepare('SELECT count(*) AS n FROM mail_outbox WHERE booking_id=?').get(b.id).n,1);const second=openStore({filename,secret:'x'.repeat(64),clock:()=>baseTime}),p2=createPlatform(second);assert.equal(p2.workspace(s.db.prepare('SELECT id,email,name FROM accounts WHERE id=?').get(uid),{role:'customer'}).bookings[0].id,b.id);second.close();s.close();}finally{removeTestDir(dir);}});
test('real API origin/CSRF/body/site/permissions and HTTP concurrent holds are enforced',async()=>{
  const f=fixture();let handler;const server=createServer((req,res)=>handler.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;handler=createApiHandler(f.store,{origin});
  try{
    const anon=await fetch(origin+'/api/madbeauty/session'),boot=await anon.json(),cookie=anon.headers.get('set-cookie').split(';')[0];assert.match(anon.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
    const post=(url,data,extra={})=>fetch(origin+url,{method:'POST',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':boot.csrf,...extra},body:JSON.stringify(data)});
    assert.equal((await post('/api/madbeauty/auth/start',{email:'web@example.com'},{origin:'https://evil.invalid'})).status,403);
    assert.equal((await post('/api/madbeauty/auth/start',{email:'web@example.com'},{'x-csrf-token':'bad'})).status,403);
    assert.equal((await post('/api/madbeauty/rpc',{method:'catalog',siteId:'other'})).status,403);
    assert.equal((await post('/api/madbeauty/rpc',{method:'workspace',input:{role:'professional',organizationId:f.org.id}})).status,401);
    assert.equal((await post('/api/madbeauty/rpc',{method:'catalog',input:{oversized:'a'.repeat(17000)}})).status,413);
    assert.equal((await fetch(origin+'/api/madbeauty/mail?email=web@example.com')).status,404);
    const c=await (await post('/api/madbeauty/auth/start',{email:'web@example.com'})).json();assert.equal(c.code,undefined);const verified=await post('/api/madbeauty/auth/verify',{challengeId:c.challengeId,code:f.store.capture(c.challengeId).code}),v=await verified.json(),newCookie=verified.headers.get('set-cookie').split(';')[0];
    const rpc=input=>fetch(origin+'/api/madbeauty/rpc',{method:'POST',headers:{cookie:newCookie,origin,'content-type':'application/json','x-csrf-token':v.csrf},body:JSON.stringify(input)});
    const candidates=f.api.availability(f.input).slots;
    const responses=await Promise.all([rpc({method:'hold',input:candidates[0]}),rpc({method:'hold',input:candidates[1]})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(f.store.read().holds.filter(h=>h.state==='held').length,1);
  }finally{await new Promise(r=>server.close(r));f.close();}
});
test('different confirmation payload with same key is rejected, names included',()=>{const f=fixture();try{const h=f.api.hold(f.customer,f.candidate()),req={holdId:h.id,name:'Pirmas vardas',idempotencyKey:'payload'};f.api.confirm(f.customer,req);code('IDEMPOTENCY_CONFLICT',()=>f.api.confirm(f.customer,{...req,name:'Kitas vardas'}));assert.equal(f.store.read().bookings.length,1);}finally{f.close();}});
test('outbox persistence failure rolls back booking, account update and hold consumption',()=>{const f=fixture();try{const h=f.api.hold(f.customer,f.candidate()),old=f.store.read(),mail=f.store.mail;f.store.mail=()=>{throw Error('Injected outbox disk failure');};assert.throws(()=>f.api.confirm(f.customer,{holdId:h.id,name:'Naujas vardas',idempotencyKey:'rollback'}));f.store.mail=mail;assert.deepEqual(f.store.read(),old);assert.equal(f.store.db.prepare('SELECT name FROM accounts WHERE id=?').get(f.customer.id).name,'');f.api.confirm(f.customer,{holdId:h.id,name:'Naujas vardas',idempotencyKey:'rollback'});assert.equal(f.store.read().bookings.length,1);}finally{f.close();}});
test('availability can ignore only authenticated own booking; favorites persist per account',()=>{const f=fixture();try{const b=f.book();code('FORBIDDEN',()=>f.api.availability({...f.input,ignoreBookingId:b.id,scope:{role:'customer'}},f.other));assert.ok(f.api.availability({...f.input,ignoreBookingId:b.id,scope:{role:'customer'}},f.customer).slots.some(c=>c.startAt===b.startAt));f.api.favorite(f.customer,{organizationId:f.org.id,saved:true});assert.deepEqual(f.api.workspace(f.customer,{role:'customer'}).client.favoriteIds,[f.org.id]);assert.equal(f.api.workspace(f.other,{role:'customer'}).client.favoriteIds,undefined);}finally{f.close();}});
test('completion is provider-only after end and review cannot be duplicated',()=>{const f=fixture();try{const b=f.book();code('FORBIDDEN',()=>f.api.completeBooking(f.customer,{scope:{role:'customer'},id:b.id,version:1}));code('INVALID_INPUT',()=>f.api.completeBooking(f.owner,{scope:f.scope,id:b.id,version:1}));f.advance(Date.parse(b.endAt)-baseTime+1);f.api.completeBooking(f.owner,{scope:f.scope,id:b.id,version:1});f.api.review(f.customer,{bookingId:b.id,rating:5,text:'Atlikto testinio vizito įvertinimas'});code('ALREADY_REVIEWED',()=>f.api.review(f.customer,{bookingId:b.id,rating:5,text:'Pakartojimas'}));}finally{f.close();}});
test('profile city and kind remain old until reviewed and update every public projection together',()=>{const f=fixture();try{const r=f.api.submitRevision(f.owner,{scope:f.scope,name:f.org.name,bio:f.org.bio,kind:'salon',city:'Šiauliai'});assert.equal(f.api.profile(f.org.id).city,'Vilnius');assert.equal(f.api.profile(f.org.id).kind,'solo');f.api.moderate(f.other,{id:r.id,state:'approved'});const p=f.api.profile(f.org.id);assert.equal(p.city,'Šiauliai');assert.equal(p.location.city,'Šiauliai');assert.equal(p.kind,'salon');assert.equal(f.api.catalog()[0].city,'Šiauliai');code('INVALID_INPUT',()=>f.api.submitRevision(f.owner,{scope:f.scope,name:f.org.name,bio:f.org.bio,city:'Unknown'}));}finally{f.close();}});
test('closure uses a real date across clock changes and future assigned entities cannot be disabled',()=>{const f=fixture();try{const w=f.api.workspace(f.owner,f.scope),schedule=w.schedules[0],b=f.book();for(const [table,id] of [['services',f.service.id],['practitioners',b.practitionerId],['resources',b.resourceId]])code('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table,id,values:{active:false},version:1}));code('SCHEDULE_CONFLICT',()=>f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:schedule.id,values:{closedDate:'2026-10-06'},version:1}));code('INVALID_INPUT',()=>f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:schedule.id,values:{closedDate:'2026-02-30'},version:1}));f.api.edit(f.owner,{scope:f.scope,table:'schedules',id:schedule.id,values:{closedDate:'2026-10-07'},version:1});assert.equal(f.api.availability({...f.input,dayOffset:2}).slots.length,0);f.advance(86400000);assert.equal(f.api.availability({...f.input,dayOffset:1}).slots.length,0);assert.equal(f.api.workspace(f.owner,f.scope).schedules[0].closedDate,'2026-10-07');}finally{f.close();}});
test('DST ambiguous and nonexistent local windows are rejected explicitly',()=>{const f=fixture();try{code('INVALID_LOCAL_TIME',()=>f.api.availability({...f.input,dayOffset:20,from:180,to:300}));f.advance(Date.parse('2027-03-28T00:00:00Z')-baseTime);code('INVALID_LOCAL_TIME',()=>f.api.availability({...f.input,dayOffset:0,from:180,to:300}));}finally{f.close();}});
test('two actual processes and SQLite connections serialize overlapping different-duration bookings',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-backend-'));let workers=[];try{
  const filename=path.join(dir,'db.sqlite'),f=fixture({filename}),w=f.api.workspace(f.owner,f.scope),s2=f.api.createService(f.owner,{organizationId:f.org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'nagu-dizainas',label:'Ilgesnis vizitas',durationMin:90,priceMinor:4000,bufferBeforeMin:5,bufferAfterMin:10}),inputs=[{user:f.customer,candidate:f.candidate(),key:'process-1'},{user:f.other,candidate:f.api.availability({...f.input,providerServiceId:s2.id,from:915}).slots[0],key:'process-2'}];f.close();
  const ready=()=>new Promise((resolve,reject)=>{const child=fork(new URL('./concurrent-worker.mjs',import.meta.url),[filename],{stdio:['ignore','ignore','ignore','ipc']});workers.push(child);child.once('error',reject);child.once('message',m=>m.ready?resolve(child):reject(Error('Not ready')));});
  await Promise.all([ready(),ready()]);const pending=workers.map(child=>new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);}));workers.forEach((child,i)=>child.send(inputs[i]));const responses=await Promise.all(pending);assert.equal(responses.filter(r=>r.ok).length,1);assert.deepEqual(responses.filter(r=>!r.ok).map(r=>r.code),['SLOT_CONFLICT']);
  await Promise.all(workers.map(child=>new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);})));const s=openStore({filename,secret:'x'.repeat(64)});try{assert.equal(s.read().bookings.length,1);assert.equal(s.db.prepare('SELECT count(*) AS n FROM mail_outbox WHERE booking_id IS NOT NULL').get().n,1);}finally{s.close();}
 }finally{await Promise.all(workers.map(child=>new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);})));try{removeTestDir(dir);}catch(e){if(e.code!=='EBUSY')throw e;console.warn('Test cleanup deferred: SQLite file lock remains in verified test directory.');}}
});
test('new media stays owner/operator-only until approved revision; originals and provenance never public',async()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'madbeauty-backend-')),f=fixture({filename:path.join(dir,'db.sqlite')});try{const bytes=readFileSync(new URL('../prototype/public/images/nails-neutral-360.webp',import.meta.url)),a=await prepareMedia(f.store,{bytes,mime:'image/webp',organizationId:f.org.id,usage:'gallery',alt:'Originalus testinis stiliaus pavyzdys',rights:'Projekto originali redakcinė iliustracija'});f.api.attachMedia(f.owner,a);assert.equal(f.api.profile(f.org.id).gallery.length,0);assert.equal(f.api.catalog()[0].coverImageId,null);assert.deepEqual(f.api.catalog()[0].media,[]);await assert.rejects(()=>readMedia(f.store,a.variants[0].storageFile,f.customer,f.api),e=>e.code==='NOT_FOUND');assert.ok((await readMedia(f.store,a.variants[0].storageFile,f.owner,f.api)).length>0);await assert.rejects(()=>readMedia(f.store,a.source.original,f.owner,f.api),e=>e.code==='NOT_FOUND');assert.ok(!JSON.stringify(mediaPublic(a)).includes('rights'));const r=f.api.submitRevision(f.owner,{scope:f.scope,name:f.org.name,bio:f.org.bio});assert.equal(f.api.profile(f.org.id).gallery.length,0);f.api.moderate(f.other,{id:r.id,state:'approved'});assert.equal(f.api.profile(f.org.id).media[0].id,a.id);const row=f.api.catalog()[0];assert.equal(row.coverImageId,a.id);assert.deepEqual(row.media.map(m=>m.id),[a.id]);assert.ok(!JSON.stringify(row).includes(a.source.original));assert.ok(!JSON.stringify(row).includes('rights'));assert.ok((await readMedia(f.store,a.variants[0].storageFile,null,f.api)).length>0);assert.ok(!JSON.stringify(f.api.profile(f.org.id)).includes(a.source.original));await assert.rejects(()=>prepareMedia(f.store,{bytes,mime:'image/png',organizationId:f.org.id,usage:'gallery',alt:'Failas',rights:'Originalas'}),e=>e.code==='INVALID_IMAGE');code('FORBIDDEN',()=>f.api.attachMedia(f.customer,a));}finally{f.close();removeTestDir(dir);}});
test('team/resource creation is scoped and manual request replays once without rechecking consumed slot',()=>{const f=fixture();try{code('FORBIDDEN',()=>f.api.createStaff(f.customer,{organizationId:f.org.id,name:'Kitas'}));const p=f.api.createStaff(f.owner,{organizationId:f.org.id,name:'Antras meistras'}),r=f.api.createResource(f.owner,{organizationId:f.org.id,label:'Kitas kabinetas'});assert.equal(f.api.workspace(f.owner,f.scope).schedules.find(s=>s.practitionerId===p.id).version,1);assert.equal(r.active,true);f.book();const req={scope:f.scope,clientId:f.customer.id,candidate:f.api.availability(f.input).slots[0],idempotencyKey:'manual-payload'};const b=f.api.manualVisit(f.owner,req);assert.equal(f.api.manualVisit(f.owner,req).id,b.id);code('IDEMPOTENCY_CONFLICT',()=>f.api.manualVisit(f.owner,{...req,clientId:f.other.id}));assert.equal(f.store.read().bookings.length,2);}finally{f.close();}});
