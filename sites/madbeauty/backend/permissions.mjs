import {publicLocation,practitionerPlaces} from './locations-state.mjs';
import {reject} from './primitives.mjs';
import {mediaPublic} from './primitives.mjs';
import {visitSegments,bookingUses} from './occupancy.mjs';
export const ROLE_CAPABILITIES={owner:['offers','profile','team','resources','schedule','clients','bookings','messages','reports','access'],manager:['offers','profile','team','resources','schedule','clients','bookings','messages','reports'],reception:['clients','bookings','messages','reports'],practitioner:['schedule','bookings','messages']};
export function membershipScope(d,user,organizationId){
 const m=d.memberships.find(m=>m.accountId===user.id&&m.organizationId===organizationId&&m.active!==false),role=m?.role==='staff'?'practitioner':m?.role;
 if(!m||!ROLE_CAPABILITIES[role]||role==='practitioner'&&!d.practitioners.some(p=>p.id===m.practitionerId&&p.organizationId===organizationId&&p.active))reject('FORBIDDEN','Šios organizacijos prieiga neleidžiama.',403);
 return {role:'professional',membershipRole:role,clientId:user.id,accountId:user.id,organizationId,practitionerId:role==='practitioner'?m.practitionerId:null,capabilities:ROLE_CAPABILITIES[role]};
}
export function requireCapability(s,capability){if(capability&&!s.capabilities?.includes(capability))reject('FORBIDDEN','Šiam veiksmui tavo darbo vietos prieigos nepakanka.',403);return s;}
export function canManageProfile(d,user,organizationId){try{return membershipScope(d,user,organizationId).capabilities.includes('profile');}catch{return false;}}
export function practitionerWorkspace(d,s,result){
 if(!s.capabilities.includes('clients'))result.clientCards=[];
 result.dataRequests=[];
 if(!s.capabilities.includes('access')){result.memberships=[];result.accessChanges=[];}
 if(!s.capabilities.includes('offers')){result.offers=[];result.procedureRequests=[];result.menuGroups=[];}
 if(!s.capabilities.includes('profile')){
  result.qualifications=[];result.revisions=[];result.locations=result.locations.map(l=>publicLocation(d,l.id)||{id:l.id,organizationId:l.organizationId,label:'Vieta ruošiama'});
  result.organizations=result.organizations.map(({draftGallery,draftGalleryEntries,draftAvatarImageId,draftStaffPortraits,...org})=>org);
  const published=new Set(result.organizations.flatMap(o=>[o.avatarImageId,...o.gallery,...(o.staffPortraits||[]).map(x=>x.mediaId)]));
  result.media=(result.media||[]).filter(a=>published.has(a.id)).map(mediaPublic);
 }
 if(s.membershipRole!=='practitioner')return result;
 const bookings=result.bookings.filter(b=>bookingUses(b,'practitionerId',s.practitionerId)).map(b=>{
  if(!b.segments)return b;const segments=visitSegments(b).filter(x=>x.practitionerId===s.practitionerId),first=segments[0],last=segments.at(-1),priceMinor=segments.reduce((n,x)=>n+x.priceMinor,0),durationMin=segments.reduce((n,x)=>n+x.durationMin,0);
  return {...b,partialVisit:segments.length!==b.segments.length,segments,items:b.items.filter(i=>i.practitionerId===s.practitionerId),providerServiceId:first.providerServiceId,practitionerId:first.practitionerId,resourceId:first.resourceId,startAt:first.startAt,endAt:last.endAt,priceMinor,durationMin,procedureMin:durationMin,serviceSnapshot:{...first.serviceSnapshot,label:segments.map(x=>x.serviceSnapshot.label).join(' + '),priceMinor,durationMin,addons:segments.flatMap(x=>x.serviceSnapshot.addons)}};
 }),ids=new Set(bookings.map(b=>b.id)),clients=new Set(bookings.map(b=>b.clientId));
 const services=result.services.filter(x=>x.practitionerId===s.practitionerId||x.staffOptions?.some(p=>p.practitionerId===s.practitionerId)).map(x=>({...x,...x.staffOptions?.find(p=>p.practitionerId===s.practitionerId),...(x.staffOptions?{staffOptions:x.staffOptions.filter(p=>p.practitionerId===s.practitionerId)}:{})}));
 const resources=new Set([...services,...bookings].map(x=>x.resourceId));
 return {...result,locations:result.locations.filter(l=>practitionerPlaces(d,d.practitioners.find(p=>p.id===s.practitionerId)).includes(l.id)),bookings,clients:result.clients.filter(c=>clients.has(c.id)),clientLinks:[],offers:[],procedureRequests:[],qualifications:[],memberships:[],revisions:[],inquiries:[],waitlist:[],practitioners:result.practitioners.filter(p=>p.id===s.practitionerId),schedules:result.schedules.filter(x=>x.practitionerId===s.practitionerId),services,resources:result.resources.filter(r=>resources.has(r.id)),holds:result.holds.filter(x=>bookingUses(x,'practitionerId',s.practitionerId)).map(x=>x.segments?{id:x.id,accountId:x.accountId,state:x.state,expiresAt:x.expiresAt,segments:x.segments.filter(y=>y.practitionerId===s.practitionerId)}:x),busyBlocks:result.busyBlocks.filter(x=>x.practitionerId===s.practitionerId),messages:result.messages.filter(x=>ids.has(x.bookingId)),reviews:result.reviews.filter(x=>ids.has(x.bookingId)),outbox:result.outbox.filter(x=>ids.has(x.bookingId))};
}
