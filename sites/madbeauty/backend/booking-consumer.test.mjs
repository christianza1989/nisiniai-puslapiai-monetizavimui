import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createServer} from 'node:http';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {createApiHandler} from './http.mjs';
import {createHttpAdapter} from '../prototype/public/http-adapter.mjs';
register('./browser-module-loader.mjs',import.meta.url);
const {bookingView,bookingForm}=await import('../prototype/public/booking-ui.mjs');

async function fixture(multiple=true,secondVariant=false){
 const store=openStore({filename:':memory:',secret:'public-synthetic-booking-test-key-32',clock:()=>Date.parse('2026-10-05T07:00:00Z')}),auth=createAuth(store),platform=createPlatform(store);
 const login=email=>{const s=auth.session(null),c=auth.start(s,email,'fixture');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'fixture').user;};
 const owner=login('owner@example.test'),op=login('operator@example.test');store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(op.id);op.operator=true;
 const org=platform.createOrganization(owner,{name:'Consumer fixture',bio:'Public synthetic consumer test',kind:'salon',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=platform.workspace(owner,scope),first=w.practitioners[0],second=multiple?platform.createStaff(owner,{organizationId:org.id,name:'Meistrė B <ilgas vardas> Ąčęėįšųūž'}):null;
 const resource=multiple?platform.createResource(owner,{organizationId:org.id,label:'Second resource'}):null;
 if(multiple){
  const [offer]=platform.selectProcedures(owner,{organizationId:org.id,procedureIds:['kirpimai-vyru-kirpimas'],version:0,idempotencyKey:'consumer'});
  const variants=[{id:'consumer-variant',label:'Consumer variant',priceMinor:2000,durationMin:30,staffOptions:[{practitionerId:first.id,resourceId:w.resources[0].id,priceMinor:2000,durationMin:30},{practitionerId:second.id,resourceId:resource.id,priceMinor:4000,durationMin:60}]}];
  if(secondVariant)variants.push({id:'consumer-variant-two',label:'Distinct second variant',priceMinor:3500,durationMin:45,staffOptions:[{practitionerId:first.id,resourceId:w.resources[0].id,priceMinor:3500,durationMin:45},{practitionerId:second.id,resourceId:resource.id,priceMinor:6500,durationMin:90}]});
  const saved=platform.saveOffer(owner,{id:offer.id,version:offer.version,label:'Consumer service',variants});
  const pending=platform.submitOffer(owner,{id:saved.id,version:saved.version});platform.moderateOffer(op,{id:pending.id,version:pending.version,state:'approved'});
 }else platform.createService(owner,{organizationId:org.id,practitionerId:first.id,resourceId:w.resources[0].id,taxonomyServiceId:'manikiuras',label:'Legacy single staff',durationMin:30,priceMinor:2000});
 const revision=platform.submitRevision(owner,{scope,name:org.name,bio:org.bio});platform.moderate(op,{id:revision.id,state:'approved'});
 let handler;const server=createServer((req,res)=>handler.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;handler=createApiHandler(store,{origin});
 const savedFetch=globalThis.fetch;let cookie='';
 globalThis.fetch=async(url,options={})=>{const headers=new Headers(options.headers);if(cookie)headers.set('cookie',cookie);if(options.method==='POST')headers.set('origin',origin);const response=await savedFetch(new URL(url,origin),{...options,headers});const received=response.headers.get('set-cookie');if(received)cookie=received.split(';')[0];return response;};
 const adapter=createHttpAdapter();await adapter.refreshSession();const challenge=await adapter.authStart('client@example.test');await adapter.authVerify(challenge.challengeId,store.capture(challenge.challengeId).code);
 const catalog=await adapter.catalog(),service=secondVariant?catalog.find(s=>s.id==='consumer-variant-two'):catalog[0],input={providerServiceId:service.id,practitionerId:second?.id||first.id,dayOffset:1,from:900,to:1200,addons:[]};
 const candidate=(await adapter.availability(input)).slots[0];assert.ok(candidate);
 const hold=await adapter.hold(candidate),b={serviceId:service.id,addons:[],candidate,hold,contact:{name:'Synthetic client',email:'client@example.test',understand:true},idempotencyKey:'consumer-booking'};
 const ctx={adapter,realAdapter:adapter,state:{booking:b,search:{diena:'1',nuo:'15:00',iki:'20:00'},session:{role:'customer',clientId:adapter.session.user.id}},candidates:new Map(),saveUI(){},async navigate(path){this.lastPath=path;},dayKey:()=>candidate.dateKey,dayLabel:x=>String(x)};
 return {store,adapter,ctx,service,first,second,candidate,platform,owner,scope,async close(){globalThis.fetch=savedFetch;server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}};
}

test('Actual HTTP browser adapter quotes the same selected staff as the held and confirmed candidate',async()=>{const f=await fixture();try{
 const quote=await f.adapter.option(f.service.id,[],f.second.id);assert.equal(quote.priceMinor,4000);assert.equal(quote.durationMin,60);
 await assert.rejects(f.adapter.option(f.service.id,[],'foreign-staff'),e=>e.code==='INVALID_INPUT');
 const html=await bookingView(f.ctx,'/registracija/perziura');assert.match(html,/Meistrė B &lt;ilgas vardas&gt; Ąčęėįšųūž/);assert.match(html,/60 min\./);assert.match(html,/40/);
 const booking=await f.adapter.confirm({holdId:f.ctx.state.booking.hold.id,...f.ctx.state.booking.contact,idempotencyKey:'consumer-confirm'});assert.equal(booking.practitionerId,f.second.id);assert.equal(booking.priceMinor,quote.priceMinor);assert.equal(booking.durationMin,quote.durationMin);
}finally{await f.close();}});

test('Actual staff form includes both options, releases old hold and filters availability by chosen practitioner',async()=>{const f=await fixture();try{
 const html=await bookingView(f.ctx,'/registracija/meistras');assert.match(html,/Meistrė B &lt;ilgas vardas&gt;/);assert.ok(html.includes(JSON.stringify([f.service.id,f.second.id]).replaceAll('"','&quot;')));
 const fd=new FormData();fd.set('staffChoice',JSON.stringify([f.service.id,f.second.id]));assert.equal(await bookingForm(f.ctx,{id:'booking-staff'},fd),true);assert.equal(f.ctx.state.booking.practitionerId,f.second.id);assert.equal(f.ctx.state.booking.hold,null);assert.equal(f.ctx.state.booking.candidate,null);
 await bookingView(f.ctx,'/registracija/laikas');assert.ok(f.ctx.candidates.size>0);assert.ok([...f.ctx.candidates.values()].every(x=>x.practitionerId===f.second.id));
 const invalid=new FormData();invalid.set('staffChoice',JSON.stringify([f.service.id,'foreign-staff']));await assert.rejects(bookingForm(f.ctx,{id:'booking-staff'},invalid),e=>e.code==='INVALID_INPUT');assert.equal(f.ctx.state.booking.practitionerId,f.second.id);
}finally{await f.close();}});

test('Legacy single-staff service retains its price, duration and practitioner in actual browser review',async()=>{const f=await fixture(false);try{
 const quote=await f.adapter.option(f.service.id,[],f.first.id);assert.equal(quote.priceMinor,2000);assert.equal(quote.durationMin,30);const html=await bookingView(f.ctx,'/registracija/perziura');assert.ok(html.includes(f.service.practitionerName));assert.match(html,/30 min\./);
}finally{await f.close();}});

test('Staff choice stays on the exact selected second variant when both variants share the same two practitioners',async()=>{const f=await fixture(true,true);try{
 const html=await bookingView(f.ctx,'/registracija/meistras');assert.ok(html.includes(JSON.stringify([f.service.id,f.second.id]).replaceAll('"','&quot;')));
 const fd=new FormData();fd.set('staffChoice',JSON.stringify([f.service.id,f.second.id]));await bookingForm(f.ctx,{id:'booking-staff'},fd);assert.equal(f.ctx.state.booking.serviceId,'consumer-variant-two');
 const quote=await f.adapter.option(f.ctx.state.booking.serviceId,[],f.ctx.state.booking.practitionerId);assert.equal(quote.priceMinor,6500);assert.equal(quote.durationMin,90);
 await bookingView(f.ctx,'/registracija/laikas');const candidate=[...f.ctx.candidates.values()][0];assert.equal(candidate.providerServiceId,'consumer-variant-two');assert.equal(candidate.practitionerId,f.second.id);
 const hold=await f.adapter.hold(candidate),booking=await f.adapter.confirm({holdId:hold.id,name:'Synthetic client',idempotencyKey:'second-variant-confirm'});assert.equal(booking.providerServiceId,'consumer-variant-two');assert.equal(booking.practitionerId,f.second.id);assert.equal(booking.priceMinor,6500);assert.equal(booking.durationMin,90);
}finally{await f.close();}});

test('A fresh booking defaults to the remaining projected staff; an explicit inactive staff selection requires reselection',async()=>{const f=await fixture();try{
 await f.adapter.releaseHold(f.ctx.state.booking.hold.id);Object.assign(f.ctx.state.booking,{candidate:null,hold:null,practitionerId:null});
 f.platform.edit(f.owner,{scope:f.scope,table:'practitioners',id:f.first.id,version:f.first.version,values:{active:false}});
 const html=await bookingView(f.ctx,'/registracija/laikas');assert.match(html,/Meistrė B &lt;ilgas vardas&gt;/);assert.ok(f.ctx.candidates.size>0);assert.ok([...f.ctx.candidates.values()].every(x=>x.practitionerId===f.second.id));
 const candidate=[...f.ctx.candidates.values()][0],hold=await f.adapter.hold(candidate),booking=await f.adapter.confirm({holdId:hold.id,name:'Synthetic client',idempotencyKey:'remaining-staff-confirm'});assert.equal(booking.practitionerId,f.second.id);assert.equal(booking.priceMinor,4000);assert.equal(booking.durationMin,60);
 f.ctx.state.booking.practitionerId=f.first.id;await assert.rejects(bookingView(f.ctx,'/registracija/laikas'),e=>e.code==='INVALID_INPUT');
 f.ctx.state.booking.practitionerId=null;f.ctx.state.booking.candidate={...f.candidate,practitionerId:f.first.id};await assert.rejects(bookingView(f.ctx,'/registracija/perziura'),e=>e.code==='INVALID_INPUT');
}finally{await f.close();}});
