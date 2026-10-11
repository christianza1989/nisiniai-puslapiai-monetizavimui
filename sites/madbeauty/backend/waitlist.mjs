import {randomId,reject} from './primitives.mjs';
import {availability,dayOffsetForDate,option,find} from './availability.mjs';
import {serviceEligible} from './catalogue-state.mjs';
import {makeClock,localInstant} from '../prototype/demo-model.mjs';
import {plus} from './occupancy.mjs';
const key=c=>[c.providerServiceId,c.practitionerId,c.startAt,c.serviceVersion,c.scheduleVersion,c.locationVersion,c.priceMinor,c.durationMin,c.addonIds.join(',')].join('|');
function candidates(d,w,now){try{return availability(d,{providerServiceId:w.providerServiceId,...w.criteria},now).slots;}catch(e){if(e.status&&e.status<500)return [];throw e;}}
const same=(a,b)=>key(a)===key(b);
export function validateWaitlist(d,input,now){
 const s=find(d,'services',input.providerServiceId),o=find(d,'organizations',s.organizationId);
 if(!o.approved||s.organizationId!==input.organizationId||!s.active||!serviceEligible(d,s,now))reject('NOT_FOUND','Paslauga nepasiekiama.',404);
 if(typeof input.dateKey!=='string')reject('INVALID_INPUT','Pasirinkite laukimo datą.');
 const offset=dayOffsetForDate(input,now),{from,to}=input;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>1439||from>=to)reject('INVALID_INPUT','Pasirinkite tinkamas laukimo valandas.');
 const practitionerId=input.practitionerId||null,staff=s.staffOptions||[{practitionerId:s.practitionerId}];
 if(practitionerId&&!staff.some(p=>p.practitionerId===practitionerId))reject('INVALID_INPUT','Meistras neatlieka šio varianto.');
 const addons=input.addons||[];if(!Array.isArray(addons))reject('INVALID_INPUT','Netinkami priedai.');
 const quotes=staff.filter(p=>!practitionerId||p.practitionerId===practitionerId).map(p=>option({...s,...p},addons));
 if(!quotes.some(q=>q.durationMin<=to-from))reject('INVALID_INPUT','Intervale turi tilpti visa pasirinkta paslauga.');
 const clock=makeClock(new Date(now).toISOString());let endAt;
 try{localInstant(clock,offset,from);endAt=localInstant(clock,offset,to);}catch{reject('INVALID_LOCAL_TIME','Šis intervalas kartojasi arba neegzistuoja keičiant laikrodį. Pasirinkite kitą.');}
 if(Date.parse(endAt)<=now)reject('INVALID_INPUT','Pasirinkite būsimą intervalą.');
 return {criteria:{dateKey:input.dateKey,from,to,practitionerId,addons:[...addons]},windowEndAt:endAt};
}
export function synchronizeWaitlist(store,d){
 const now=store.clock(),cache=new Map();
 for(const w of d.waitlist.filter(w=>w.criteria&&!['closed','expired'].includes(w.state))){
  if(store.organizationWritable&&!store.organizationWritable(w.organizationId))continue;
  if(Date.parse(w.windowEndAt)<=now){w.state='expired';w.version++;continue;}
  if(w.state==='choosing'){
   const hold=d.holds.find(h=>h.id===w.holdId);
   if(hold?.state==='confirmed'){const value=Object.values(d.idempotency).find(x=>x.holdId===hold.id);w.state='closed';w.bookingId=value?.bookingId;w.closeReason='booked';w.version++;}
   else if(!hold||hold.state!=='held'||Date.parse(hold.expiresAt)<=now){w.state='expired';w.closeReason='hold-ended';w.version++;}
   continue;
  }
  if(w.state==='offered'&&Date.parse(w.offer.expiresAt)<=now){w.state='expired';w.version++;continue;}
  const cacheKey=JSON.stringify([w.providerServiceId,w.criteria]);if(!cache.has(cacheKey))cache.set(cacheKey,candidates(d,w,now));const slots=cache.get(cacheKey);
  if(w.state==='offered'){
   if(slots.some(c=>same(c,w.offer.candidate)))continue;
   w.state='waiting';w.offer=null;w.version++;
  }
  if(w.state!=='waiting'||(w.offeredKeys||[]).length>=3)continue;
  const candidate=slots.find(c=>!(w.offeredKeys||[]).includes(key(c)));if(!candidate)continue;
  w.state='offered';w.version++;w.offer={id:randomId('waitlist-offer'),candidate,expiresAt:plus(new Date(now).toISOString(),15)};
  w.offeredKeys=[...(w.offeredKeys||[]),key(candidate)];
  const client=find(d,'clients',w.clientId),pref=d.preferences.find(p=>p.clientId===w.clientId);w.deliveryStatus='stored';
  if(pref?.service!==false){w.offer.outboxId=store.mail({accountId:client.id,organizationId:w.organizationId,recipient:client.email,type:'waitlist-offer',payload:{waitlistId:w.id,waitlistVersion:w.version,offerId:w.offer.id,startAt:candidate.startAt,endAt:candidate.endAt,expiresAt:w.offer.expiresAt,status:'offered'}});w.deliveryStatus='queued';}
 }
}
export function waitlistMailValid(store,row,payload){
 if(row.type!=='waitlist-offer')return true;
 const w=store.recordById('waitlist',payload.waitlistId),pref=w?store.clientRecords('preferences',w.clientId)[0]:null;
 return !!w&&w.state==='offered'&&w.version===payload.waitlistVersion&&w.offer.id===payload.offerId&&w.offer.outboxId===row.id&&Date.parse(w.offer.expiresAt)>store.clock()&&pref?.service!==false;
}
export function claimWaitlist(d,user,input,now){
 if(!user)reject('UNAUTHENTICATED','Prisijunkite.',401);const w=find(d,'waitlist',input.id);
 if(w.clientId!==user.id)reject('FORBIDDEN','Šis pasiūlymas nepriklauso jums.',403);
 if(w.state==='choosing'&&w.offer?.id===input.offerId){const h=d.holds.find(h=>h.id===w.holdId);if(h?.state==='held'&&Date.parse(h.expiresAt)>now)return {hold:h,candidate:{...h,id:h.slotId}};}
 if(w.version!==input.version)reject('VERSION_CONFLICT','Pasiūlymas pasikeitė. Atnaujinkite.',409);
 if(w.state!=='offered'||w.offer?.id!==input.offerId||Date.parse(w.offer.expiresAt)<=now)reject('OFFER_EXPIRED','Pasiūlymo galiojimas baigėsi.',409);
 const candidate=candidates(d,w,now).find(c=>same(c,w.offer.candidate));if(!candidate)reject('SLOT_CONFLICT','Laikas jau nepasiekiamas. Atnaujinkite pasirinkimą.',409);
 const hold={...candidate,slotId:candidate.id,id:randomId('hold'),accountId:user.id,state:'held',expiresAt:plus(new Date(now).toISOString(),2),waitlistId:w.id};d.holds.push(hold);w.state='choosing';w.holdId=hold.id;w.version++;return {hold,candidate};
}
export function nextWaitlistAt(store){
 const rows=store.readCollections(['waitlist']).waitlist.filter(w=>w.criteria&&!['closed','expired'].includes(w.state)&&(!store.organizationWritable||store.organizationWritable(w.organizationId)));
 return rows.length?Math.min(store.clock()+300000,...rows.filter(w=>w.offer&&w.state==='offered').map(w=>Date.parse(w.offer.expiresAt)),...rows.map(w=>Date.parse(w.windowEndAt))):null;
}
