import {publicLocation,locationSchedule,staffAtLocation,resourceAtLocation,bookingPlace} from './locations-state.mjs';
import {localInstant,makeClock,visitFits} from '../prototype/demo-model.mjs';
import {reject} from './primitives.mjs';
import {serviceEligible} from './catalogue-state.mjs';
export const plus=(iso,min)=>new Date(Date.parse(iso)+min*60000).toISOString();
export const overlaps=(a,b,c,d)=>Date.parse(a)<Date.parse(d)&&Date.parse(c)<Date.parse(b);
export const find=(d,table,id)=>{const r=d[table]?.find(x=>x.id===id);if(!r)reject('NOT_FOUND','Įrašas nerastas.',404);return r;};
export function option(service,addons=[],{validateGroups=true}={}){
  if(!Array.isArray(addons)||new Set(addons).size!==addons.length||addons.some(id=>!service.addons.some(a=>a.id===id)))reject('INVALID_INPUT','Nežinomas paslaugos priedas.');
  const selected=service.addons.filter(a=>addons.includes(a.id));
  if(validateGroups)for(const g of service.addonGroups||[]){const count=selected.filter(a=>a.groupId===g.id).length;if(count<g.min||count>g.max)reject('ADDON_SELECTION_REQUIRED',`„${g.label}“ pasirinkite nuo ${g.min} iki ${g.max} priedų.`);}
  return {durationMin:service.durationMin+selected.reduce((n,a)=>n+a.durationMin,0),priceMinor:service.priceMinor+selected.reduce((n,a)=>n+a.priceMinor,0),addons:selected};
}
export function dayOffsetForDate(input,now){
  let dayOffset=input.dayOffset??1;
  if(input.dateKey!==undefined){
    const key=input.dateKey,parsed=typeof key==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(key)?Date.parse(key+'T12:00:00Z'):NaN;
    if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==key)reject('INVALID_INPUT','Pasirinkite galiojančią datą.');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
    dayOffset=Math.round((parsed-Date.parse(today+'T12:00:00Z'))/86400000);
  }
  if(!Number.isInteger(dayOffset)||dayOffset<0||dayOffset>30)reject('INVALID_INPUT','Pasirinkite datą per 30 dienų.');
  return dayOffset;
}
export function availability(d,input,now,{ignoreBookingId=null,ignoreHoldId=null,internal=false,selectedService=null}={}){
  const {providerServiceId,addons=[],from=540,to=1200}=input;
  const dayOffset=dayOffsetForDate(input,now);
  if(!Number.isInteger(dayOffset)||dayOffset<0||dayOffset>30||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>1439||from>=to)reject('INVALID_INPUT','Pasirinkite datą per30 dienų ir tinkamas valandas.');
  const clock=makeClock(new Date(now).toISOString()),s=selectedService||find(d,'services',providerServiceId);
  if(s.staffOptions&&!selectedService){
    const staff=s.staffOptions.filter(x=>!input.practitionerId||x.practitionerId===input.practitionerId);
    if(input.practitionerId&&!staff.length)reject('INVALID_INPUT','Šis meistras neatlieka pasirinkto varianto.');
    const results=staff.map(x=>availability(d,input,now,{ignoreBookingId,ignoreHoldId,internal,selectedService:{...s,...x}})),slots=results.flatMap(x=>x.slots).sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.practitionerId.localeCompare(b.practitionerId));
    return {...results[0],slots,state:slots.length?'current':results.some(x=>x.state==='no-slots')?'no-slots':'unavailable',priceFromMinor:staff.length?Math.min(...staff.map(x=>x.priceMinor)):null,staffOptions:staff};
  }
  if(input.practitionerId&&input.practitionerId!==s.practitionerId)reject('INVALID_INPUT','Šis meistras neatlieka pasirinkto varianto.');
  const o=find(d,'organizations',s.organizationId),p=find(d,'practitioners',s.practitionerId),r=find(d,'resources',s.resourceId),schedule=locationSchedule(d,p,s.locationId);
  const calc=option(s,addons),meta={source:'madbeauty-server',asOf:clock.now,expiresAt:plus(clock.now,5),serviceVersion:s.version,locationVersion:publicLocation(d,s.locationId)?.version||0,scheduleVersion:schedule?.version||0,...calc};
  if((!internal&&!o.approved)||!s.active||!resourceAtLocation(d,r,s.locationId)||!staffAtLocation(d,p,s.locationId)||!schedule||!serviceEligible(d,s,now)||s.bookingMode&&s.bookingMode!=='instant')return {state:'unavailable',slots:[],...meta};
  const dateKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(localInstant(clock,dayOffset,720)));
  const rules=s.availabilityRules||{};
  if(schedule.closedDate===dateKey||dayOffset>(rules.maxAdvanceDays??30))return {state:'no-slots',slots:[],...meta};
  const at=m=>{try{return localInstant(clock,dayOffset,m);}catch{reject('INVALID_LOCAL_TIME','Šis vietinis laikas neegzistuoja arba kartojasi dėl laikrodžio keitimo. Pasirinkite kitą intervalą.');}},shiftStart=at(schedule.startMin),shiftEnd=at(schedule.endMin),windowStart=at(from),windowEnd=at(to);
  const breakRange=schedule.breakStartMin===null?null:[at(schedule.breakStartMin),at(schedule.breakEndMin)];
  const weekday=new Date(at(720)).toLocaleDateString('en-US',{timeZone:'Europe/Vilnius',weekday:'short'});
  if(schedule.weekdays&&!schedule.weekdays.includes(weekday)||rules.weekdays&&!rules.weekdays.includes(weekday))return {state:'no-slots',slots:[],...meta};
  const slots=[];
  for(let min=Math.ceil(from/15)*15;min<=to;min+=15){
    const startAt=at(min),endAt=plus(startAt,calc.durationMin),occupiedStart=plus(startAt,-s.bufferBeforeMin),occupiedEnd=plus(endAt,s.bufferAfterMin);
    if(Date.parse(startAt)<now+Math.max(o.leadTimeMin??30,rules.minLeadTimeMin??0)*60000||min<(rules.fromMin??0)||min+calc.durationMin>(rules.toMin??1439)||!visitFits({startAt,durationMin:calc.durationMin,windowStart,windowEnd})||occupiedStart<shiftStart||occupiedEnd>shiftEnd||breakRange&&overlaps(occupiedStart,occupiedEnd,...breakRange))continue;
    if(d.bookings.some(b=>{
     if(b.id===ignoreBookingId||b.status!=='confirmed')return false;
     const travel=bookingPlace(d,b)!==s.locationId&&(b.practitionerId===p.id)?p.transferBufferMin||0:0;
     return (b.practitionerId===p.id||b.resourceId===r.id)&&overlaps(occupiedStart,occupiedEnd,plus(b.startAt,-b.bufferBeforeMin-travel),plus(b.endAt,b.bufferAfterMin+travel));
    }))continue;
    if(d.busyBlocks.some(b=>b.active!==false&&(b.practitionerId===p.id||b.resourceId===r.id)&&overlaps(occupiedStart,occupiedEnd,b.startAt,b.endAt)))continue;
    if(d.holds.some(h=>h.id!==ignoreHoldId&&h.state==='held'&&Date.parse(h.expiresAt)>now&&(h.practitionerId===p.id||h.resourceId===r.id)&&overlaps(occupiedStart,occupiedEnd,plus(h.occupiedStart,h.locationId!==s.locationId&&h.practitionerId===p.id?-(p.transferBufferMin||0):0),plus(h.occupiedEnd,h.locationId!==s.locationId&&h.practitionerId===p.id?p.transferBufferMin||0:0))))continue;
    slots.push({id:[s.id,startAt,addons.join(','),...(s.staffOptions?[p.id]:[])].join('|'),providerServiceId:s.id,offerId:s.offerId||null,variantId:s.staffOptions?s.id:null,organizationId:o.id,practitionerId:p.id,resourceId:r.id,locationId:s.locationId,startAt,endAt,occupiedStart,occupiedEnd,dateKey,dayOffset,from,to,addonIds:addons,priceMinor:calc.priceMinor,durationMin:calc.durationMin,serviceVersion:s.version,locationVersion:publicLocation(d,s.locationId)?.version||0,scheduleVersion:schedule.version,snapshotAt:clock.now});
  }
  return {state:slots.length?'current':'no-slots',slots,...meta};
}
