import {DEMO_CONFIG} from './config.mjs';
export function makeClock(iso=new Date().toISOString()) {
  if (!Number.isFinite(Date.parse(iso))) throw Error('Invalid clock');
  const now=new Date(iso).toISOString();
  return Object.freeze({now,timezone:DEMO_CONFIG.timezone});
}
function localParts(ms,tz) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
  return Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
}
export function localInstant(clock,dayOffset,minuteOfDay) {
  if (!Number.isInteger(dayOffset)||!Number.isInteger(minuteOfDay)||minuteOfDay<0||minuteOfDay>=1440) throw Error('Invalid local time');
  const p=localParts(Date.parse(clock.now),clock.timezone);
  const target=Date.UTC(p.year,p.month-1,p.day+dayOffset,Math.floor(minuteOfDay/60),minuteOfDay%60,0);
  // Derive both neighboring offsets. Reject gaps/ambiguity instead of silently guessing at DST.
  const candidates=new Set();
  for(const sample of [target-86400000,target,target+86400000]) {
    const q=localParts(sample,clock.timezone);
    const offset=Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,q.second)-sample;
    const candidate=target-offset;
    const r=localParts(candidate,clock.timezone);
    if(Date.UTC(r.year,r.month-1,r.day,r.hour,r.minute,r.second)===target) candidates.add(candidate);
  }
  if(candidates.size!==1) throw Error(candidates.size?'Ambiguous local time':'Nonexistent local time');
  return new Date([...candidates][0]).toISOString();
}
export const TAXONOMY=Object.freeze([
  ['manikiuras','Manikiūras','nails-neutral',60],['gelinis-lakavimas','Gelinis lakavimas','nails-color',75],['nagu-dizainas','Nagų dizainas','nails-french',90],
  ['pedikiuras','Pedikiūras','pedicure',60],['kirpimas','Kirpimas','hair',45],['plauku-dazymas','Plaukų dažymas','hair',120],
  ['antakiai','Antakių priežiūra','brows',30],['blakstienos','Blakstienų priežiūra','lashes',60],['masazas','Masažas','massage',60],['veido-prieziura','Veido priežiūra','skincare',60]
].map(([id,label,imageId,durationMin])=>Object.freeze({id,label,imageId,durationMin})));
const firstNames=['Austėja','Ieva','Gabija','Ema','Rūta','Monika','Milda','Ugnė','Lina','Greta','Justė','Simona'];
const cities=['Vilnius','Kaunas','Klaipėda'];
const marks=['Linija','Atspalvis','Švelniai','Ritmas','Detalė','Forma'];
const demo=(id,values)=>({id:'demo-'+id,isDemo:true,...values});
export function generateDemo(clock=makeClock()) {
  const organizations=Array.from({length:30},(_,i)=>demo('org-'+i,{name:i<24?firstNames[i%12]+' · demo '+(i+1):marks[i-24]+' · demo salonas',city:cities[i%3],kind:i<24?'solo':'salon',locationId:'demo-loc-'+i,approved:i!==29,calendarState:i===2?'none':i===3?'stale':'current'}));
  const locations=organizations.map((o,i)=>demo('loc-'+i,{organizationId:o.id,city:o.city,area:['Centras','Naujamiestis','Senamiestis'][i%3],publicAddress:'Demonstracinė vieta · '+o.city,openingHoursLabel:'Darbo dienomis 09:00–20:00 (demo)',imageId:'studio'}));
  const practitioners=organizations.flatMap((o,i)=>Array.from({length:o.kind==='solo'?1:3},(_,j)=>demo('staff-'+i+'-'+j,{organizationId:o.id,locationId:o.locationId,name:firstNames[(i+j)%12]+' · demo '+(i+1)+(j?'.'+j:''),initials:firstNames[(i+j)%12][0]+marks[i%6][0]})));
  const services=practitioners.flatMap((p,i)=>Array.from({length:3},(_,j)=>{const t=TAXONOMY[(i+j)%10];return demo('service-'+i+'-'+j,{organizationId:p.organizationId,locationId:p.locationId,practitionerId:p.id,taxonomyServiceId:t.id,label:t.label,durationMin:t.durationMin,bufferBeforeMin:5,bufferAfterMin:10,priceMinor:2200+(i%7)*500+j*300,currency:'EUR',imageId:t.imageId,addons:[{id:'demo-addon-removal',label:'Papildomas paruošimas',durationMin:15,priceMinor:500}]});}));
  const clients=Array.from({length:120},(_,i)=>demo('client-'+i,{organizationId:organizations[i%30].id,name:firstNames[(i+4)%12]+' · demo klientas '+(i+1),email:'demo-client-'+i+'@example.com'}));
  const bookings=Array.from({length:480},(_,i)=>{const org=organizations[i%30];const ss=services.filter(s=>s.organizationId===org.id);const service=ss[Math.floor(i/30)%ss.length];const c=clients.filter(x=>x.organizationId===org.id)[Math.floor(i/30)%4];const dayOffset=Math.floor(i/30)-7;const startAt=localInstant(clock,dayOffset,10*60);return demo('booking-'+i,{organizationId:org.id,clientId:c.id,practitionerId:service.practitionerId,providerServiceId:service.id,startAt,endAt:new Date(Date.parse(startAt)+service.durationMin*60000).toISOString(),timezone:clock.timezone,status:dayOffset<0?'completed':i%11===0?'canceled':'confirmed',priceMinor:service.priceMinor,currency:'EUR'});});
  const completed=bookings.filter(b=>b.status==='completed');
  const reviews=Array.from({length:96},(_,i)=>{const b=completed[i];return demo('review-'+i,{organizationId:b.organizationId,bookingId:b.id,clientId:b.clientId,practitionerId:b.practitionerId,rating:4+i%2,text:['Ramus vizitas ir aiškiai aptarta procedūra.','Patogu pasirinkti laiką.','Patiko kruopštumas ir aiški santrauka.'][i%3],createdAt:b.endAt});});
  const inquiries=organizations.map((o,i)=>demo('inquiry-'+i,{organizationId:o.id,clientId:clients[i].id,status:['new','qualified','closed'][i%3],createdAt:localInstant(clock,-(i%5),11*60),deliveryStatus:'demo-only'}));
  const waitlist=Array.from({length:24},(_,i)=>demo('waitlist-'+i,{organizationId:organizations[i].id,clientId:clients[i].id,providerServiceId:services.find(s=>s.organizationId===organizations[i].id).id,preferredDay:localInstant(clock,1+i%3,17*60),state:'waiting'}));
  return {seedVersion:DEMO_CONFIG.seedVersion,clock,isDemo:true,taxonomy:TAXONOMY,organizations,locations,practitioners,services,clients,bookings,reviews,inquiries,waitlist};
}
export function visitFits({startAt,durationMin,addonDurationMin=0,windowStart,windowEnd}) {
  const start=Date.parse(startAt),lo=Date.parse(windowStart),hi=Date.parse(windowEnd);
  if(![start,lo,hi,durationMin,addonDurationMin].every(Number.isFinite)||durationMin<=0||addonDurationMin<0||lo>=hi) return false;
  return start>=lo&&start+(durationMin+addonDurationMin)*60000<=hi;
}
export function formatMoney(minor) {return new Intl.NumberFormat('lt-LT',{style:'currency',currency:'EUR'}).format(minor/100);}
