import {reject} from './primitives.mjs';
import {mediaPublic} from './primitives.mjs';
export const ROLE_CAPABILITIES={owner:['offers','profile','team','resources','schedule','clients','bookings','messages','reports','access'],manager:['offers','profile','team','resources','schedule','clients','bookings','messages','reports'],reception:['clients','bookings','messages','reports'],practitioner:['schedule','bookings','messages']};
export function membershipScope(d,user,organizationId){
 const m=d.memberships.find(m=>m.accountId===user.id&&m.organizationId===organizationId&&m.active!==false),role=m?.role==='staff'?'practitioner':m?.role;
 if(!m||!ROLE_CAPABILITIES[role]||role==='practitioner'&&!d.practitioners.some(p=>p.id===m.practitionerId&&p.organizationId===organizationId&&p.active))reject('FORBIDDEN','Šios organizacijos prieiga neleidžiama.',403);
 return {role:'professional',membershipRole:role,clientId:user.id,accountId:user.id,organizationId,practitionerId:role==='practitioner'?m.practitionerId:null,capabilities:ROLE_CAPABILITIES[role]};
}
export function requireCapability(s,capability){if(capability&&!s.capabilities?.includes(capability))reject('FORBIDDEN','Šiam veiksmui tavo darbo vietos prieigos nepakanka.',403);return s;}
export function canManageProfile(d,user,organizationId){try{return membershipScope(d,user,organizationId).capabilities.includes('profile');}catch{return false;}}
export function practitionerWorkspace(d,s,result){
 if(!s.capabilities.includes('access')){result.memberships=[];result.accessChanges=[];}
 if(!s.capabilities.includes('offers')){result.offers=[];result.procedureRequests=[];result.menuGroups=[];}
 if(!s.capabilities.includes('profile')){
  result.qualifications=[];result.revisions=[];
  result.organizations=result.organizations.map(({draftGallery,draftAvatarImageId,...org})=>org);
  const published=new Set(result.organizations.flatMap(o=>[o.avatarImageId,...o.gallery]));
  result.media=(result.media||[]).filter(a=>published.has(a.id)).map(mediaPublic);
 }
 if(s.membershipRole!=='practitioner')return result;
 const bookings=result.bookings.filter(b=>b.practitionerId===s.practitionerId),ids=new Set(bookings.map(b=>b.id)),clients=new Set(bookings.map(b=>b.clientId));
 const services=result.services.filter(x=>x.practitionerId===s.practitionerId||x.staffOptions?.some(p=>p.practitionerId===s.practitionerId)).map(x=>({...x,...x.staffOptions?.find(p=>p.practitionerId===s.practitionerId),...(x.staffOptions?{staffOptions:x.staffOptions.filter(p=>p.practitionerId===s.practitionerId)}:{})}));
 const resources=new Set([...services,...bookings].map(x=>x.resourceId));
 return {...result,bookings,clients:result.clients.filter(c=>clients.has(c.id)),clientLinks:[],offers:[],procedureRequests:[],qualifications:[],memberships:[],revisions:[],inquiries:[],waitlist:[],practitioners:result.practitioners.filter(p=>p.id===s.practitionerId),schedules:result.schedules.filter(x=>x.practitionerId===s.practitionerId),services,resources:result.resources.filter(r=>resources.has(r.id)),holds:result.holds.filter(x=>x.practitionerId===s.practitionerId),busyBlocks:result.busyBlocks.filter(x=>x.practitionerId===s.practitionerId),messages:result.messages.filter(x=>ids.has(x.bookingId)),reviews:result.reviews.filter(x=>ids.has(x.bookingId)),outbox:result.outbox.filter(x=>ids.has(x.bookingId))};
}
