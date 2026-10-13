import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {waitlistMailValid} from './waitlist.mjs';
function fixture(){
 let now=Date.parse('2026-10-07T06:00:00Z');const store=openStore({filename:':memory:',clock:()=>now,secret:'isolated-waitlist-only-'.repeat(3)}),api=createPlatform(store),auth=createAuth(store);
 const login=email=>{const s=auth.session(null),c=auth.start(s,email,'127.0.0.1');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'127.0.0.1').user;};
 const owner=login('waitlist-owner@example.com'),one=login('waitlist-one@example.com'),two=login('waitlist-two@example.com'),operator={...owner,operator:true},org=api.createOrganization(owner,{name:'Waitlist fixture',bio:'Isolated automatic offer acceptance.',kind:'salon',city:'Vilnius'}),scope={role:'professional',organizationId:org.id},w=api.workspace(owner,scope),p2=api.createStaff(owner,{organizationId:org.id,name:'Second staff'}),r2=api.createResource(owner,{organizationId:org.id,label:'Second chair'}),offers=api.selectProcedures(owner,{organizationId:org.id,procedureIds:['manikiuras-klasikinis-manikiuras'],version:0,idempotencyKey:'wl-procedures'});
 let offer=api.saveOffer(owner,{id:offers[0].id,version:offers[0].version,label:'Waitlist manicure',variants:[{id:'wl-variant-a',label:'Variant A',durationMin:60,priceMinor:2500,staffOptions:[{practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id},{practitionerId:p2.id,resourceId:r2.id,priceMinor:3000}]},{id:'wl-variant-b',label:'Variant B',durationMin:60,priceMinor:4000,staffOptions:[{practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id}]}]});offer=api.submitOffer(owner,{id:offer.id,version:offer.version});api.moderateOffer(operator,{id:offer.id,version:offer.version,state:'approved'});
 const rev=api.submitRevision(owner,{scope,name:org.name,bio:org.bio});api.moderate(operator,{id:rev.id,state:'approved'});
 const input={organizationId:org.id,providerServiceId:'wl-variant-a',practitionerId:w.practitioners[0].id,dateKey:'2026-10-08',from:1020,to:1080,addons:[],note:'Isolated waitlist criterion'};
 return {store,api,owner,one,two,operator,org,scope,input,offer,p2,r2,at:value=>{now=value;},close:()=>store.close()};
}
const code=(value,fn)=>assert.throws(fn,e=>e.code===value);
test('Cancellation offers only the requested variant/staff/full interval; two offered clients compete for one atomic hold, then explicitly confirm',()=>{
 const f=fixture();try{
  const candidate=f.api.availability(f.input).slots[0],h=f.api.hold(f.owner,candidate),b=f.api.confirm(f.owner,{holdId:h.id,name:'Blocking client',idempotencyKey:'blocking'});
  const a=f.api.createWaitlist(f.one,{...f.input,idempotencyKey:'one'}),z=f.api.createWaitlist(f.two,{...f.input,idempotencyKey:'two'});assert.equal(a.state,'waiting');assert.equal(z.state,'waiting');assert.equal(f.api.createWaitlist(f.one,{...f.input,idempotencyKey:'one'}).id,a.id);
  assert.equal(f.api.workspace(f.operator,{role:'operator'}).waitlist.length,0);assert.equal(f.api.workspace(f.one,{role:'customer'}).waitlist.length,1);code('FORBIDDEN',()=>f.api.closeWaitlist(f.two,{id:a.id,version:a.version}));
  f.api.cancelBooking(f.owner,{scope:{role:'customer'},id:b.id,version:b.version,reason:'Free the whole window'});
  const request=user=>f.api.workspace(user,{role:'customer'}).waitlist[0],first=request(f.one),second=request(f.two);assert.equal(first.state,'offered');assert.equal(second.state,'offered');assert.equal(first.offer.candidate.providerServiceId,'wl-variant-a');assert.equal(first.offer.candidate.practitionerId,f.input.practitionerId);assert.equal(first.offer.candidate.startAt,b.startAt);assert.equal(first.offer.candidate.endAt,b.endAt);assert.equal(first.offer.candidate.priceMinor,2500);
  const mails=f.store.db.prepare("SELECT * FROM mail_outbox WHERE type='waitlist-offer'").all();assert.equal(mails.length,2);assert.ok(waitlistMailValid(f.store,mails[0],JSON.parse(mails[0].payload)));
  const input={id:first.id,version:first.version,offerId:first.offer.id},claim=f.api.acceptWaitlist(f.one,input);assert.equal(f.api.acceptWaitlist(f.one,input).hold.id,claim.hold.id);assert.equal(f.api.workspace(f.one,{role:'customer'}).bookings.length,0);code('VERSION_CONFLICT',()=>f.api.acceptWaitlist(f.two,{id:second.id,version:second.version,offerId:second.offer.id}));
  assert.equal(waitlistMailValid(f.store,mails[0],JSON.parse(mails[0].payload)),false);
  const booking=f.api.confirm(f.one,{holdId:claim.hold.id,name:'Explicit client',idempotencyKey:'waitlist-confirm'}),finished=request(f.one);assert.equal(booking.startAt,b.startAt);assert.equal(finished.state,'closed');assert.equal(finished.bookingId,booking.id);assert.equal(request(f.two).state,'waiting');
 }finally{f.close();}
});
test('Waitlist validates typed constraints, expires finite offers and never silently applies changed prices or ignores notification opt-out',()=>{
 const f=fixture();try{
  code('INVALID_INPUT',()=>f.api.createWaitlist(f.one,{...f.input,practitionerId:'unknown',idempotencyKey:'bad-staff'}));code('INVALID_INPUT',()=>f.api.createWaitlist(f.one,{...f.input,to:1050,idempotencyKey:'short'}));code('INVALID_INPUT',()=>f.api.createWaitlist(f.one,{...f.input,dateKey:'2026-02-30',idempotencyKey:'bad-date'}));
  f.api.preferences(f.one,{service:false,marketing:false});const a=f.api.createWaitlist(f.one,{...f.input,providerServiceId:'wl-variant-b',idempotencyKey:'second-variant'});assert.equal(a.state,'offered');assert.equal(a.offer.candidate.priceMinor,4000);assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM mail_outbox WHERE type='waitlist-offer'").get().n,0);
  f.at(Date.parse(a.offer.expiresAt));code('OFFER_EXPIRED',()=>f.api.acceptWaitlist(f.one,{id:a.id,version:a.version,offerId:a.offer.id}));f.api.runAutomation();assert.equal(f.api.workspace(f.one,{role:'customer'}).waitlist[0].state,'expired');assert.equal(f.api.workspace(f.one,{role:'customer'}).bookings.length,0);
  const next=f.api.createWaitlist(f.two,{...f.input,idempotencyKey:'price-before'}),current=f.api.workspace(f.owner,f.scope).offers[0],draft=f.api.saveOffer(f.owner,{...current,version:current.version,variants:current.variants.map(v=>({...v,priceMinor:v.priceMinor+500,staffOptions:v.staffOptions.map(p=>({...p,priceMinor:p.priceMinor+500}))}))}),pending=f.api.submitOffer(f.owner,{id:draft.id,version:draft.version});f.api.moderateOffer(f.operator,{id:draft.id,version:pending.version,state:'approved'});
  const fresh=f.api.workspace(f.two,{role:'customer'}).waitlist[0];assert.equal(fresh.offer.candidate.priceMinor,3000);assert.notEqual(fresh.offer.id,next.offer.id);code('VERSION_CONFLICT',()=>f.api.acceptWaitlist(f.two,{id:next.id,version:next.version,offerId:next.offer.id}));
 }finally{f.close();}
});
