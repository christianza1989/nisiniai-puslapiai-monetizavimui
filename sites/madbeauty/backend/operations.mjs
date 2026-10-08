import {find} from './availability.mjs';
import {occupiedRanges} from './occupancy.mjs';
import {makeClock,localInstant} from '../prototype/demo-model.mjs';
import {reject} from './primitives.mjs';
import {validateReportRange} from '../prototype/public/report-range.mjs';
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const dayKey=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
const validDay=value=>{const range=validateReportRange(value,value);if(range.error)reject('INVALID_INPUT','Pasirinkite galiojančią datą.');return range.fromNoon;};
const interval=(from,to)=>{const range=validateReportRange(from,to);if(range.error)reject('INVALID_INPUT',range.error);return {start:Date.parse(localInstant(makeClock(new Date(range.fromNoon).toISOString()),0,0)),end:Date.parse(localInstant(makeClock(new Date(range.toNoon).toISOString()),0,1439))+60000,days:range.days};};
const merge=rows=>{const out=[];for(const [lo,hi] of rows.filter(([lo,hi])=>hi>lo).sort((a,b)=>a[0]-b[0])){const last=out.at(-1);if(last&&lo<=last[1])last[1]=Math.max(hi,last[1]);else out.push([lo,hi]);}return out;};
const minutes=rows=>merge(rows).reduce((n,[a,b])=>n+(b-a)/60000,0);
export const csvCell=v=>{let s=String(v??'');if(/^[\s]*[=+\-@]|^[\t\r\n]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
function report(d,input,now){
 const range=interval(input.from,input.to),inside=at=>Date.parse(at)>=range.start&&Date.parse(at)<range.end,rows=d.bookings.filter(b=>inside(b.startAt)),completed=rows.filter(b=>b.status==='completed'),clients=new Set(completed.map(b=>b.clientId)),returning=[...clients].filter(id=>completed.some(b=>b.clientId===id&&d.bookings.some(old=>old.clientId===id&&old.status==='completed'&&old.id!==b.id&&old.startAt<b.startAt))),scheduled=new Map(),occupied=new Map();
 const org=d.organizations[0],rules=org.bookingRules||{};
 for(let day=0;day<range.days;day++){
  const noon=Date.parse(input.from+'T12:00:00Z')+day*86400000,key=new Date(noon).toISOString().slice(0,10),weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Vilnius',weekday:'short'}).format(new Date(noon));if(rules.closedDates?.includes(key)||rules.weekdays&&!rules.weekdays.includes(weekday))continue;
  const at=min=>Date.parse(localInstant(makeClock(new Date(noon).toISOString()),0,min));
  for(const s of d.schedules){if(s.closedDate===key||s.weekdays&&!s.weekdays.includes(weekday)||!d.practitioners.some(p=>p.id===s.practitionerId&&p.active))continue;const spans=s.breakStartMin===null?[[s.startMin,s.endMin]]:[[s.startMin,s.breakStartMin],[s.breakEndMin,s.endMin]];if(!scheduled.has(s.practitionerId))scheduled.set(s.practitionerId,[]);scheduled.get(s.practitionerId).push(...spans.map(([a,b])=>[at(a),at(b)]));}
 }
 for(const b of d.bookings.filter(b=>['confirmed','completed'].includes(b.status)))for(const o of occupiedRanges(b).filter(o=>o.practitionerId)){if(!occupied.has(o.practitionerId))occupied.set(o.practitionerId,[]);occupied.get(o.practitionerId).push([Math.max(range.start,Date.parse(o.startAt)),Math.min(range.end,Date.parse(o.endAt))]);}
 let scheduledMin=0,reservedMin=0;for(const [id,windows] of scheduled){const planned=merge(windows);scheduledMin+=minutes(planned);const used=merge(occupied.get(id)||[]);reservedMin+=minutes(planned.flatMap(([a,b])=>used.map(([lo,hi])=>[Math.max(a,lo),Math.min(b,hi)])));}
 const inquiries=d.inquiries.filter(x=>inside(x.createdAt)),waitlist=d.waitlist.filter(x=>x.criteria&&inside(x.createdAt)),bookedWaitlist=waitlist.filter(x=>x.bookingId&&d.bookings.some(b=>b.id===x.bookingId)).length,canceled=rows.filter(b=>b.status==='canceled').length;
 return {organizationId:input.organizationId,from:input.from,to:input.to,asOf:new Date(now).toISOString(),fixture:!!d.isDemo,statuses:['completed','confirmed','canceled'].map(status=>{const items=rows.filter(b=>b.status===status);return {status,count:items.length,serviceValueMinor:items.reduce((n,b)=>n+b.priceMinor,0)};}),occupancy:{scheduledMin,reservedMin,rate:scheduledMin?reservedMin/scheduledMin:null,basis:'current-schedule-active-staff-minutes-without-breaks'},cancellations:{count:canceled,total:rows.length,rate:rows.length?canceled/rows.length:null},returningClients:{count:returning.length,total:clients.size,rate:clients.size?returning.length/clients.size:null},inquiries:{count:inquiries.length,qualified:inquiries.filter(x=>x.status==='qualified').length},waitlist:{count:waitlist.length,booked:bookedWaitlist,rate:waitlist.length?bookedWaitlist/waitlist.length:null},visits:rows.map(b=>({id:b.id,startAt:b.startAt,endAt:b.endAt,status:b.status,label:b.serviceSnapshot?.label||d.services.find(s=>s.id===b.providerServiceId)?.label||'Paslauga',practitionerName:b.serviceSnapshot?.practitionerName||'',priceMinor:b.priceMinor,currency:b.currency||'EUR'}))};
}
export function createOperations({store,mutate,ownOrg,event,clock}){
 const organizationReport=(user,input)=>{const base=store.readCollections(['memberships','organizations','practitioners','isDemo']);ownOrg(base,user,input.organizationId,'reports');const d={...base,organizations:base.organizations.filter(o=>o.id===input.organizationId),...Object.fromEntries(['services','schedules','bookings','inquiries','waitlist'].map(k=>[k,store.organizationRecords(k,input.organizationId)]))};return report(d,input,store.clock());};
 return {
  saveBookingRules(user,input){return mutate(d=>{
   const access=ownOrg(d,user,input.organizationId,'schedule');if(access.practitionerId)reject('FORBIDDEN','Darbo vietos taisykles keičia jos administratorius.',403);const org=find(d,'organizations',input.organizationId);if(input.version!==org.version)reject('VERSION_CONFLICT','Taisyklės pasikeitė. Atnaujinkite.',409);
   if(!Number.isInteger(input.minLeadTimeMin)||input.minLeadTimeMin<0||input.minLeadTimeMin>10080||!Number.isInteger(input.maxAdvanceDays)||input.maxAdvanceDays<1||input.maxAdvanceDays>30||!Array.isArray(input.weekdays)||input.weekdays.some(x=>!DAYS.includes(x))||new Set(input.weekdays).size!==input.weekdays.length||!Array.isArray(input.closedDates)||input.closedDates.length>60||new Set(input.closedDates).size!==input.closedDates.length)reject('INVALID_INPUT','Patikrinkite registracijos taisykles.');
   input.closedDates.forEach(validDay);
   for(const b of d.bookings.filter(b=>b.organizationId===org.id&&b.status==='confirmed'&&Date.parse(b.endAt)>store.clock())){const day=dayKey(b.startAt),weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Vilnius',weekday:'short'}).format(new Date(b.startAt));if(!input.weekdays.includes(weekday)||input.closedDates.includes(day))reject('SCHEDULE_CONFLICT','Uždarymas paslėptų būsimą vizitą. Pirmiau perkelkite arba atšaukite jį.',409);}
   org.leadTimeMin=input.minLeadTimeMin;org.bookingRules={maxAdvanceDays:input.maxAdvanceDays,weekdays:[...input.weekdays],closedDates:[...input.closedDates].sort()};org.version++;event(d,'booking-rules-updated',org.id);return org;
  });},
  organizationReport,
  reportCsv(user,input){const r=organizationReport(user,input),rows=[['visitId','startAt','endAt','status','service','practitioner','serviceValueMinor','currency','fixture'],...r.visits.map(b=>[b.id,b.startAt,b.endAt,b.status,b.label,b.practitionerName,b.priceMinor,b.currency,r.fixture])];return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
 };
}
