import {reporterReport} from './moderation.mjs';
import {find,option} from './availability.mjs';
import {visitSegments} from './occupancy.mjs';
import {serviceEligible} from './catalogue-state.mjs';
import {publicLocation,staffAtLocation,resourceAtLocation} from './locations-state.mjs';
import {randomId,reject} from './primitives.mjs';
const fresh=(user,now)=>{if(!user)reject('UNAUTHENTICATED','Prisijunkite.',401);if(!Number.isFinite(user.verifiedAt)||user.verifiedAt>now||now-user.verifiedAt>600000)reject('REAUTH_REQUIRED','Duomenų veiksmui dar kartą patvirtinkite savo el. paštą.',403);};
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())reject('INVALID_INPUT','Patikrinkite kortelės laukus.');return value.trim();};
export function createCustomerTools({store,mutate,ownOrg,ownBooking,scope,event,clock}){
 const ownClient=(d,organizationId,clientId)=>{const c=find(d,'clients',clientId);if(![...d.bookings,...d.inquiries,...d.waitlist,...(d.clientLinks||[])].some(x=>x.organizationId===organizationId&&x.clientId===clientId))reject('FORBIDDEN','Klientas nepriklauso šiai organizacijai.',403);return c;};
 return {
  rebooking(user,input){
   const before=store.recordById?ownBooking({bookings:[store.recordById('bookings',input.id)].filter(Boolean)},user,{role:'customer'},input.id):null;
   const d=before&&store.readOrganization?store.readOrganization(before.organizationId,[user.id]):store.read(),b=ownBooking(d,user,{role:'customer'},input.id),old=visitSegments(b),changes=[],items=[];
   const alternatives=d.services.filter(s=>s.active&&serviceEligible(d,s,store.clock())&&d.organizations.some(o=>o.id===s.organizationId&&o.approved)&&s.organizationId===b.organizationId).map(s=>({providerServiceId:s.id,label:s.label,organizationId:s.organizationId,locationId:s.locationId,kind:d.organizations.find(o=>o.id===s.organizationId).kind}));
   for(const before of old){
    const s=d.services.find(s=>s.id===before.providerServiceId),org=d.organizations.find(o=>o.id===s?.organizationId);
    if(!s||!s.active||!org?.approved||!serviceEligible(d,s,store.clock())||s.bookingMode&&s.bookingMode!=='instant')return {state:'unavailable',bookingId:b.id,reason:'Ankstesnis variantas šiuo metu nerezervuojamas internetu.',alternatives,searchPath:'/paieska'};
    const staff=(s.staffOptions||[{practitionerId:s.practitionerId,resourceId:s.resourceId,priceMinor:s.priceMinor,durationMin:s.durationMin}]).filter(p=>d.practitioners.some(x=>x.id===p.practitionerId&&staffAtLocation(d,x,s.locationId))&&d.resources.some(x=>x.id===p.resourceId&&resourceAtLocation(d,x,s.locationId)));
    const selected=staff.find(p=>p.practitionerId===before.practitionerId)||staff[0];if(!selected)return {state:'unavailable',bookingId:b.id,reason:'Šio varianto meistras nepasiekiamas.',alternatives,searchPath:'/paieska'};
    const addons=(before.addonIds||[]).filter(id=>s.addons.some(a=>a.id===id));let quote;try{quote=option({...s,...selected},addons);}catch(e){if(e.code!=='ADDON_SELECTION_REQUIRED')throw e;quote={...option({...s,...selected},addons,{validateGroups:false}),requiresSelection:true};}
    const name=d.practitioners.find(p=>p.id===selected.practitionerId).name,location=publicLocation(d,s.locationId),previous=before.serviceSnapshot||{};
    items.push({providerServiceId:s.id,practitionerId:selected.practitionerId,addons,locationId:s.locationId});
    changes.push({label:s.label,practitionerName:name,location,previous:{label:previous.label||s.label,practitionerName:previous.practitionerName||'',location:previous.location||null,priceMinor:before.priceMinor,durationMin:before.durationMin},current:{priceMinor:quote.priceMinor,durationMin:quote.durationMin},changed:quote.priceMinor!==before.priceMinor||quote.durationMin!==before.durationMin||selected.practitionerId!==before.practitionerId||s.label!==previous.label||JSON.stringify(previous.location)!==JSON.stringify(location)||addons.length!==(before.addonIds||[]).length,requiresSelection:!!quote.requiresSelection,removedAddons:(before.addonIds||[]).filter(id=>!addons.includes(id))});
   }
   if(new Set(items.map(i=>i.locationId)).size>1)return {state:'unavailable',bookingId:b.id,reason:'Paslaugos dabar teikiamos skirtingose vietose. Pasirinkite naują vizito sudėtį.',alternatives,searchPath:'/paieska'};
   return {state:'ready',bookingId:b.id,items:items.map(({locationId,...i})=>i),sequence:items.length>1,changes,priceMinor:changes.reduce((n,x)=>n+x.current.priceMinor,0),procedureMin:changes.reduce((n,x)=>n+x.current.durationMin,0)};
  },
  saveClientCard(user,input){return mutate(d=>{
   ownOrg(d,user,input.organizationId,'clients');ownClient(d,input.organizationId,input.clientId);d.clientCards||=[];
   const old=d.clientCards.find(c=>c.organizationId===input.organizationId&&c.clientId===input.clientId);if((old?.version||0)!==input.version)reject('VERSION_CONFLICT','Kliento kortelė pasikeitė. Atnaujinkite.',409);
   const c=old||{id:randomId('client-card'),organizationId:input.organizationId,clientId:input.clientId,createdAt:clock().now};Object.assign(c,{name:text(input.name,80,true),note:text(input.note??'',1000),version:(old?.version||0)+1,updatedAt:clock().now,updatedBy:user.id});if(!old)d.clientCards.push(c);event(d,'client-card-updated',c.id);return c;
  });},
  exportCustomer(user){fresh(user,store.clock());let d;if(store.clientRecords){d={clients:[store.recordById('clients',user.id)].filter(Boolean)};for(const table of ['bookings','messages','reviews','reports','inquiries','waitlist','preferences','clientCards','dataRequests'])d[table]=store.clientRecords(table,user.id);}else d=store.read();const owned=table=>(d[table]||[]).filter(x=>x.clientId===user.id||x.accountId===user.id);return {schemaVersion:1,siteId:store.siteId,exportedAt:clock().now,client:find(d,'clients',user.id),bookings:owned('bookings'),messages:owned('messages'),reviews:owned('reviews').map(reporterReport),reports:owned('reports').map(reporterReport),inquiries:owned('inquiries'),waitlist:owned('waitlist').map(({offer,...w})=>({...w,offer:offer?{id:offer.id,expiresAt:offer.expiresAt,candidate:offer.candidate}:null})),preferences:owned('preferences'),organizationCards:owned('clientCards').map(({updatedBy,...c})=>c),dataRequests:owned('dataRequests').map(({actions,...r})=>r)};},
  requestErasure(user,input){fresh(user,store.clock());return mutate(d=>{
   if(input.confirmEmail!==user.email)reject('INVALID_INPUT','Patvirtinkite savo prisijungimo el. paštą.');d.dataRequests||=[];const old=d.dataRequests.find(r=>r.clientId===user.id&&!['withdrawn','completed'].includes(r.state));if(old)return {...old,actions:undefined};
   const r={id:randomId('data-request'),clientId:user.id,state:'pending',kind:'erasure',version:1,createdAt:clock().now,actions:[{state:'pending',at:clock().now}],retentionState:'review-required'};d.dataRequests.push(r);event(d,'erasure-requested',r.id);return {...r,actions:undefined};
  });},
  withdrawErasure(user,input){return mutate(d=>{if(!user)reject('UNAUTHENTICATED','Prisijunkite.',401);const r=find(d,'dataRequests',input.id);if(r.clientId!==user.id)reject('FORBIDDEN','Prašymas nepriklauso jums.',403);if(r.version!==input.version)reject('VERSION_CONFLICT','Prašymas pasikeitė.',409);if(!['pending','needs-information','retention-review'].includes(r.state))reject('INVALID_INPUT','Šio prašymo atšaukti nebegalima.');r.state='withdrawn';r.version++;r.actions.push({state:r.state,at:clock().now});event(d,'erasure-withdrawn',r.id);return {...r,actions:undefined};});},
  erasureCase(user,input){scope({},user,{role:'operator'});let d;if(store.clientRecords){const request=store.recordById('dataRequests',input.id);if(!request)reject('NOT_FOUND','Įrašas nerastas.',404);d={dataRequests:[request],clients:[store.recordById('clients',request.clientId)].filter(Boolean),bookings:store.clientRecords('bookings',request.clientId)};}else d=store.read();const r=find(d,'dataRequests',input.id),client=find(d,'clients',r.clientId);return {...r,client:{id:client.id,name:client.name,email:client.email},futureBookings:d.bookings.filter(b=>b.clientId===client.id&&b.status==='confirmed'&&Date.parse(b.endAt)>store.clock()).map(b=>({id:b.id,organizationId:b.organizationId,startAt:b.startAt,endAt:b.endAt})),executionEnabled:false};},
  reviewErasure(user,input){return mutate(d=>{
   scope(d,user,{role:'operator'});const r=find(d,'dataRequests',input.id);if(r.version!==input.version||['withdrawn','completed'].includes(r.state))reject('VERSION_CONFLICT','Prašymas pasikeitė.',409);if(!['needs-information','retention-review'].includes(input.state))reject('INVALID_INPUT','Pasirinkite prašymo peržiūros būseną.');
   const reason=text(input.reason,600,true),basis=text(input.retentionBasis,600,true);r.state=input.state;r.version++;r.reason=reason;r.retentionBasis=basis;r.updatedAt=clock().now;r.actions.push({state:r.state,reason,retentionBasis:basis,actorId:user.id,at:clock().now});event(d,'erasure-reviewed',r.id);return {...r,actions:undefined};
  });}
 };
}
