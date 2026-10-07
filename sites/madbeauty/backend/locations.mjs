import {CITY_NAMES} from '../prototype/cities.mjs';
import {randomId,reject} from './primitives.mjs';
import {find} from './availability.mjs';
import {publicLocation,practitionerPlaces,bookingPlace} from './locations-state.mjs';
const text=(v,max=100)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)reject('INVALID_INPUT','Patikrinkite veiklos vietos laukus.');return v.trim();};
const version=(x,v)=>{if((x.version||0)!==v)reject('VERSION_CONFLICT','Įrašas pasikeitė. Atnaujinkite duomenis.',409);};
export function validateCoordinates(latitude,longitude){
 if(latitude==null&&longitude==null)return {latitude:null,longitude:null};
 if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)reject('INVALID_INPUT','Nurodykite abi galiojančias koordinates arba palikite abi tuščias.');
 return {latitude,longitude};
}
export function createLocationApi({store,mutate,ownOrg,scope,event,clock}){
 const owned=(d,u,id)=>{const l=find(d,'locations',id);ownOrg(d,u,l.organizationId,'profile');return l;};
 const future=(d,id)=>d.bookings.some(b=>bookingPlace(d,b)===id&&b.status==='confirmed'&&Date.parse(b.endAt)>store.clock());
 return {
  saveLocation(user,input){return mutate(d=>{
   ownOrg(d,user,input.organizationId,'profile');let l=input.id?owned(d,user,input.id):null;
   if(l&&l.organizationId!==input.organizationId)reject('FORBIDDEN','Kita organizacija.',403);
   if(l)version(l,input.version);else if(d.locations.filter(l=>l.organizationId===input.organizationId).length>=16)reject('LIMIT','Veiklos vietų limitas pasiektas.');
   if(!CITY_NAMES.includes(input.city))reject('INVALID_INPUT','Pasirinkite Lietuvos miestą.');
   const draft={label:text(input.label),city:input.city,area:String(input.area||'').trim().slice(0,80),publicAddress:text(input.publicAddress,200),openingHoursLabel:text(input.openingHoursLabel,300),...validateCoordinates(input.latitude,input.longitude)};
   if(!l){l={id:randomId('location'),organizationId:input.organizationId,active:true,version:0,createdAt:clock().now};d.locations.push(l);}
   else if(!l.state&&!l.published){l.published={...publicLocation(d,l.id)};l.publicVersion=1;}
   Object.assign(l,{draft,state:'draft',version:(l.version||0)+1});event(d,'location-draft-saved',l.id);return l;
  });},
  submitLocation(user,input){return mutate(d=>{const l=owned(d,user,input.id);version(l,input.version);if(!l.draft||l.active===false||l.state==='pending')reject('INVALID_INPUT','Paruoškite aktyvios vietos juodraštį.');l.state='pending';l.submittedAt=clock().now;l.version++;event(d,'location-submitted',l.id);return l;});},
  moderateLocation(user,input){return mutate(d=>{
   scope(d,user,{role:'operator'});const l=find(d,'locations',input.id);version(l,input.version);if(l.state!=='pending')reject('VERSION_CONFLICT','Vieta jau peržiūrėta.',409);
   if(!['approved','returned'].includes(input.state))reject('INVALID_INPUT','Pasirinkite peržiūros sprendimą.');
   const old=publicLocation(d,l.id);
   if(input.state==='approved'){
    if(old&&future(d,l.id)&&(old.city!==l.draft.city||old.publicAddress!==l.draft.publicAddress))reject('LOCATION_CONFLICT','Šioje vietoje yra būsimų vizitų. Pirmiau juos perkelkite arba atšaukite.',409);
    l.published={...structuredClone(l.draft),approvedAt:clock().now,approvedBy:user.id};l.publicVersion=(l.publicVersion||0)+1;
    if(find(d,'organizations',l.organizationId).locationId===l.id)find(d,'organizations',l.organizationId).city=l.draft.city;
   }else l.reason=text(input.reason,500);
   l.state=input.state;l.version++;event(d,'location-'+input.state,l.id);return l;
  });},
  setLocationActive(user,input){return mutate(d=>{const l=owned(d,user,input.id);version(l,input.version);if(typeof input.active!=='boolean')reject('INVALID_INPUT','Netinkama vietos būsena.');if(!input.active&&future(d,l.id))reject('LOCATION_CONFLICT','Pirmiau perkelkite arba atšaukite šios vietos būsimus vizitus.',409);l.active=input.active;l.version=(l.version||0)+1;event(d,input.active?'location-restored':'location-archived',l.id);return l;});},
  assignStaffLocations(user,input){return mutate(d=>{
   const p=find(d,'practitioners',input.id);ownOrg(d,user,p.organizationId,'team');version(p,input.version);
   const ids=input.locationIds;if(!Array.isArray(ids)||!ids.length||ids.length>16||new Set(ids).size!==ids.length)reject('INVALID_INPUT','Pasirinkite veiklos vietas be pasikartojimų.');
   for(const id of ids){const l=find(d,'locations',id);if(l.organizationId!==p.organizationId||l.active===false)reject('FORBIDDEN','Vieta nepriklauso šiai organizacijai arba neaktyvi.',403);}
   if(!Number.isInteger(input.transferBufferMin)||input.transferBufferMin<0||input.transferBufferMin>240)reject('INVALID_INPUT','Įrašykite reikalingą persikėlimo laiką (0–240 min.).');
   if(d.bookings.some(b=>b.practitionerId===p.id&&b.status==='confirmed'&&Date.parse(b.endAt)>store.clock()&&!ids.includes(bookingPlace(d,b))))reject('SCHEDULE_CONFLICT','Pirmiau perkelkite šio meistro būsimus vizitus iš pašalinamos vietos.',409);
   const shifts=d.schedules.filter(s=>s.practitionerId===p.id&&ids.includes(s.locationId||p.locationId));
   for(const a of shifts)for(const b of shifts)if(a.id!==b.id&&(a.locationId||p.locationId)!==(b.locationId||p.locationId)&&(a.weekdays||[]).some(day=>(b.weekdays||[]).includes(day))&&a.startMin<b.endMin+input.transferBufferMin&&b.startMin<a.endMin+input.transferBufferMin)reject('SCHEDULE_CONFLICT','Persikėlimo laikas netelpa tarp esamų pamainų.',409);
   const previous=practitionerPlaces(d,p);for(const s of d.schedules.filter(s=>s.practitionerId===p.id&&!s.locationId))s.locationId=previous[0];
   for(const id of ids)if(!d.schedules.some(s=>s.practitionerId===p.id&&s.locationId===id))d.schedules.push({id:randomId('schedule'),organizationId:p.organizationId,practitionerId:p.id,locationId:id,startMin:540,endMin:1200,breakStartMin:780,breakEndMin:840,closedDate:null,closedDay:null,weekdays:[],version:1});
   p.locationIds=[...ids];p.locationId=ids.includes(p.locationId)?p.locationId:ids[0];p.transferBufferMin=input.transferBufferMin;p.version=(p.version||0)+1;event(d,'staff-locations-assigned',p.id);return p;
  });},
 };
}
