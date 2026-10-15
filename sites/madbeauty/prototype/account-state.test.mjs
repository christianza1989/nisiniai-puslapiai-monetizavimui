import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileAccountState} from './public/account-state.mjs';
const selected=()=>({session:{role:'customer',clientId:'old',organizationId:'org'},favorites:['org'],onboarding:{name:'Private organization'},chatBookingId:'old-booking',clientFilter:'Private name',uploads:[{alt:'Private asset'}],booking:{serviceId:'public-service',contact:{name:'Previous customer',email:'old@example.com',understand:true},hold:{id:'old-hold',accountId:'old'},result:null}});
test('A different or ended account clears private single/sequence/result state before it can be shown to the next session',()=>{
 for(const account of [{id:'next',email:'next@example.com'},null])for(const variant of ['legacy-single','bound-sequence','confirmed','unbound-private']){
  const state=selected();if(variant==='bound-sequence'){state.realAccountId='old';state.booking.sequence=true;state.booking.items=[{providerServiceId:'private-choice'}];}
  if(variant==='confirmed'){state.booking.hold=null;state.booking.result={id:'old-booking',clientId:'old'};}
  if(variant==='unbound-private'){state.session={role:'guest',clientId:null};state.booking.hold=null;}
  const search={miestas:'vilnius',nuo:'17:00'};state.search=search;
  assert.equal(reconcileAccountState(state,account),true,variant);assert.equal(state.booking,null);assert.deepEqual(state.favorites,[]);assert.deepEqual(state.onboarding,{});assert.equal(state.chatBookingId,null);assert.equal(state.clientFilter,'');assert.deepEqual(state.uploads,[]);assert.equal(state.session.organizationId,null);assert.equal(state.realAccountId,account?.id||null);assert.equal(state.search,search);
 }
});
test('Same-account reload preserves the chosen hold and edited contact; anonymous public selection adopts only the newly authenticated contact',()=>{
 const state=selected(),booking=state.booking;assert.equal(reconcileAccountState(state,{id:'old',name:'Canonical name',email:'old@example.com'}),false);assert.equal(state.booking,booking);assert.equal(state.booking.contact.name,'Previous customer');assert.equal(state.realAccountId,'old');assert.equal(reconcileAccountState(state,{id:'old',email:'old@example.com'}),false);assert.equal(state.booking.hold.id,'old-hold');
 const guest={session:{role:'guest',clientId:'demo-client-0'},booking:{serviceId:'public-service',addons:['public-addon'],hold:null,result:null,contact:{name:'',email:''}}},choice=guest.booking;
 assert.equal(reconcileAccountState(guest,null),false);assert.equal(guest.booking,choice);guest.session={role:'customer',clientId:'next',organizationId:null};assert.equal(reconcileAccountState(guest,{id:'next',name:'New customer',email:'next@example.com'}),false);assert.equal(guest.booking,choice);assert.deepEqual(guest.booking.addons,['public-addon']);assert.deepEqual(guest.booking.contact,{name:'New customer',email:'next@example.com'});assert.equal(guest.realAccountId,'next');
});
