import {availability,find,option,dayOffsetForDate} from './availability.mjs';
import {plus,visitSegments} from './occupancy.mjs';
import {publicLocation} from './locations-state.mjs';
import {reject,randomId} from './primitives.mjs';
const keyShape=items=>items.map(i=>({providerServiceId:i.providerServiceId,practitionerId:i.practitionerId,addons:i.addons||[]}));
export function visitAvailability(d,input,now,hash,opts={}){
 const {items,from=540,to=1200}=input;
 if(!Array.isArray(items)||items.length<2||items.length>6||new Set(items.map(i=>i?.providerServiceId)).size!==items.length)reject('INVALID_INPUT','Pasirinkite 2–6 skirtingus variantus vienam vizitui.');
 const services=items.map(i=>{if(!i||typeof i.practitionerId!=='string')reject('INVALID_INPUT','Kiekvienai paslaugai pasirinkite meistrą.');return find(d,'services',i.providerServiceId);});
 const first=services[0];if(services.some(s=>s.organizationId!==first.organizationId||s.locationId!==first.locationId))reject('INVALID_INPUT','Vieno vizito paslaugos turi būti toje pačioje organizacijoje ir vietoje.');
 const dayOffset=dayOffsetForDate(input,now),request=i=>({providerServiceId:i.providerServiceId,practitionerId:i.practitionerId,addons:i.addons||[],from,to,dayOffset,dateKey:input.dateKey});
 const starts=availability(d,request(items[0]),now,opts),slots=[];
 for(const candidate of starts.slots){
  if(input.startAt&&candidate.startAt!==input.startAt)continue;
  const segments=[candidate];
  for(let i=1;i<items.length;i++){
   const startAt=plus(segments.at(-1).occupiedEnd,services[i].bufferBeforeMin||0);
   const next=availability(d,request(items[i]),now,{...opts,exactStartAt:startAt}).slots.find(c=>c.startAt===startAt);
   if(!next)break;segments.push(next);
  }
  if(segments.length!==items.length)continue;
  const endAt=segments.at(-1).endAt,priceMinor=segments.reduce((n,s)=>n+s.priceMinor,0),durationMin=(Date.parse(endAt)-Date.parse(candidate.startAt))/60000;
  const id='visit|'+hash(JSON.stringify(segments.map(s=>[s.id,s.practitionerId,s.resourceId,s.serviceVersion,s.scheduleVersion,s.locationVersion,s.priceMinor,s.durationMin])));
  slots.push({kind:'visit-sequence',id,items:keyShape(items),segments,organizationId:first.organizationId,locationId:first.locationId,providerServiceId:first.id,practitionerId:candidate.practitionerId,resourceId:candidate.resourceId,startAt:candidate.startAt,endAt,occupiedStart:candidate.occupiedStart,occupiedEnd:segments.at(-1).occupiedEnd,priceMinor,durationMin,procedureMin:segments.reduce((n,s)=>n+s.durationMin,0),from,to,dateKey:candidate.dateKey,dayOffset,snapshotAt:candidate.snapshotAt});
 }
 return {source:'madbeauty-server',asOf:starts.asOf,expiresAt:starts.expiresAt,state:slots.length?'current':'no-slots',slots};
}

export function requireWholeVisit(access,b){if(access.practitionerId&&visitSegments(b).some(s=>s.practitionerId!==access.practitionerId))reject('FORBIDDEN','Visą kelių meistrų vizitą gali keisti klientas arba veiklos administratorius.',403);}
export function createVisitApi({store,mutate,publicRead,calendarRead,scope,ownBooking,event,outbox,clock}){
 const choose=(d,candidate,opts={})=>{
  if(candidate?.kind!=='visit-sequence'||!Number.isFinite(Date.parse(candidate.snapshotAt))||Date.parse(candidate.snapshotAt)+300000<store.clock())reject('STALE_AVAILABILITY','Pasirinkimas paseno. Atnaujinkite viso vizito laikus.',409);
  const a=visitAvailability(d,{items:candidate.items,dateKey:candidate.dateKey,dayOffset:candidate.dayOffset,from:candidate.from,to:candidate.to,startAt:candidate.startAt},store.clock(),store.hash,opts),c=a.slots.find(c=>c.id===candidate.id&&c.priceMinor===candidate.priceMinor&&c.endAt===candidate.endAt&&c.durationMin===candidate.durationMin);
  if(!c)reject('SLOT_CONFLICT','Vienas iš vizito segmentų pasikeitė. Pasirinkite kitą viso vizito laiką.',409);return c;
 };
 const snapshot=(d,c)=>{
  const segments=c.segments.map(x=>{const s=find(d,'services',x.providerServiceId);return {...x,bufferBeforeMin:s.bufferBeforeMin,bufferAfterMin:s.bufferAfterMin,serviceSnapshot:{label:s.label,practitionerName:find(d,'practitioners',x.practitionerId).name,organizationName:find(d,'organizations',x.organizationId).name,location:publicLocation(d,x.locationId),durationMin:x.durationMin,priceMinor:x.priceMinor,addons:option(s,x.addonIds).addons}};});
  return {...c,segments,addonIds:[],bufferBeforeMin:segments[0].bufferBeforeMin,bufferAfterMin:segments.at(-1).bufferAfterMin,serviceSnapshot:{label:segments.map(s=>s.serviceSnapshot.label).join(' + '),practitionerName:[...new Set(segments.map(s=>s.serviceSnapshot.practitionerName))].join(', '),organizationName:segments[0].serviceSnapshot.organizationName,location:segments[0].serviceSnapshot.location,durationMin:c.durationMin,priceMinor:c.priceMinor,addons:[]}};
 };
 return {
  visitAvailability(input,user=null){
   const base=publicRead(['memberships']),first=find(base,'services',input.items?.[0]?.providerServiceId),d=calendarRead(base,first.organizationId),opts={};
   if(input.ignoreBookingId){const b=ownBooking(d,user,input.scope,input.ignoreBookingId),access=scope(d,user,input.scope);requireWholeVisit(access,b);if(!b.segments||JSON.stringify(input.items?.map(i=>i.providerServiceId))!==JSON.stringify(b.items.map(i=>i.providerServiceId)))reject('INVALID_INPUT','Perkeliant turi išlikti visi vizito variantai ir jų seka.');opts.ignoreBookingId=b.id;opts.internal=true;}
   return visitAvailability(d,input,store.clock(),store.hash,opts);
  },
  holdVisit(user,candidate){return mutate(d=>{if(!user)reject('UNAUTHENTICATED','Prisijunkite prieš pasirinkdami laiką.',401);const c=choose(d,candidate),h={...c,slotId:c.id,id:randomId('hold'),accountId:user.id,state:'held',expiresAt:plus(clock().now,2)};d.holds.push(h);return h;});},
  confirmVisit(user,input){return mutate(d=>{
   if(!user)reject('UNAUTHENTICATED','Prisijunkite.',401);
   if(typeof input.idempotencyKey!=='string'||!input.idempotencyKey.trim()||input.idempotencyKey.length>160)reject('INVALID_INPUT','Netinkamas pakartojimo raktas.');
   const key=user.id+':visit:'+input.idempotencyKey,fingerprint=store.hash(JSON.stringify([input.holdId,input.name||''])),prior=d.idempotency[key];
   if(prior){if(prior.fingerprint!==fingerprint)reject('IDEMPOTENCY_CONFLICT','Raktas jau panaudotas kitam vizitui.',409);return find(d,'bookings',prior.bookingId);}
   const h=find(d,'holds',input.holdId);if(h.accountId!==user.id)reject('FORBIDDEN','Šio pasirinkimo prieiga neleidžiama.',403);if(h.kind!=='visit-sequence'||h.state!=='held'||Date.parse(h.expiresAt)<=store.clock())reject('HOLD_EXPIRED','Viso vizito pasirinkimo galiojimas baigėsi.',409);
   const c=choose(d,{...h,id:h.slotId,snapshotAt:clock().now},{ignoreHoldId:h.id}),client=find(d,'clients',user.id),name=String(input.name||client.name||'').trim();if(!name||name.length>80)reject('INVALID_INPUT','Patikrinkite vardą.');
   client.name=name;client.version++;store.db.prepare('UPDATE accounts SET name=? WHERE id=? AND site_id=?').run(name,user.id,store.siteId);
   const b={...snapshot(d,c),id:randomId('booking'),clientId:user.id,status:'confirmed',currency:'EUR',timezone:'Europe/Vilnius',version:1,createdAt:clock().now};delete b.occupiedStart;delete b.occupiedEnd;
   h.state='confirmed';d.bookings.push(b);d.idempotency[key]={bookingId:b.id,holdId:h.id,fingerprint};outbox(d,b,'confirmation');event(d,'visit-confirmed',b.id);return b;
  });},
  changeVisit(user,input){return mutate(d=>{
   const b=ownBooking(d,user,input.scope,input.id),access=scope(d,user,input.scope);requireWholeVisit(access,b);
   if(b.version!==input.version)reject('VERSION_CONFLICT','Vizitas pasikeitė. Atnaujinkite.',409);if(!b.segments||b.status!=='confirmed'||Date.parse(b.startAt)<=store.clock())reject('INVALID_INPUT','Keisti galima būsimą patvirtintą kelių paslaugų vizitą.');
   if(JSON.stringify(input.candidate?.items?.map(i=>i.providerServiceId))!==JSON.stringify(b.items.map(i=>i.providerServiceId)))reject('INVALID_INPUT','Turi išlikti visi vizito variantai ir jų seka.');
   const c=choose(d,input.candidate,{ignoreBookingId:b.id,internal:true});if(c.organizationId!==b.organizationId||c.locationId!==b.locationId)reject('FORBIDDEN','Vizitas priklauso kitai vietai.',403);
   Object.assign(b,snapshot(d,c),{id:b.id,version:b.version+1});delete b.occupiedStart;delete b.occupiedEnd;outbox(d,b,'reschedule');event(d,'visit-changed',b.id);return b;
  });},
 };
}
