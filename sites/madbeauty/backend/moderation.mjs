import {find} from './availability.mjs';
import {randomId,reject} from './primitives.mjs';
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)reject('INVALID_INPUT','Aprašykite pranešimą ir sprendimo priežastį.');return v.trim();};
export const reporterReport=({actions,accountId,moderatedBy,...r})=>({...r,actions:(actions||[]).map(({actorId,...a})=>a)});
function target(d,id){
 const organization=d.organizations.find(o=>o.id===id&&o.approved);if(organization)return {targetKind:'organization',organizationId:organization.id};
 const review=d.reviews.find(r=>r.id===id&&r.approved),booking=review&&d.bookings.find(b=>b.id===review.bookingId&&b.status==='completed'&&b.organizationId===review.organizationId&&b.clientId===review.clientId);
 if(booking&&d.organizations.some(o=>o.id===review.organizationId&&o.approved))return {targetKind:'review',organizationId:review.organizationId};
 const media=(d.media||[]).find(m=>m.id===id&&m.moderationState!=='restricted');if(media&&d.organizations.some(o=>o.id===media.organizationId&&o.approved&&(o.avatarImageId===id||o.gallery.includes(id))))return {targetKind:'media',organizationId:media.organizationId};
 reject('NOT_FOUND','Viešas pranešimo objektas nerastas.',404);
}
export function createModeration({store,mutate,scope,event,clock}){
 return {
  report(user,input){return mutate(d=>{
   if(!user)reject('UNAUTHENTICATED','Prisijunkite.',401);const id=text(input.target,200),note=text(input.note,500),key=input.idempotencyKey?user.id+':report:'+text(input.idempotencyKey,160):null,fingerprint=store.hash(JSON.stringify([id,note])),prior=key&&d.idempotency[key];
   if(prior){if(prior.fingerprint!==fingerprint)reject('IDEMPOTENCY_CONFLICT','Šis raktas skirtas kitam pranešimui.',409);return reporterReport(find(d,'reports',prior.reportId));}
   const values=target(d,id),owned=d.reports.filter(r=>r.accountId===user.id),old=owned.find(r=>r.target===id&&r.note===note&&['new','triage'].includes(r.status));if(old){if(key)d.idempotency[key]={reportId:old.id,fingerprint};return reporterReport(old);}
   if(owned.length>=200||owned.filter(r=>['new','triage'].includes(r.status)).length>=30)reject('LIMIT','Aktyvių pranešimų limitas pasiektas.');
   const r={id:randomId('report'),target:id,...values,note,accountId:user.id,status:'new',version:1,createdAt:clock().now,dueAt:new Date(store.clock()+72*3600000).toISOString(),actions:[{state:'new',action:'submitted',at:clock().now}]};d.reports.push(r);if(key)d.idempotency[key]={reportId:r.id,fingerprint};event(d,'report-created',r.id);return reporterReport(r);
  });},
  reviewReport(user,input){return mutate(d=>{
   scope(d,user,{role:'operator'});const r=find(d,'reports',input.id);if(input.version!==(r.version||0))reject('VERSION_CONFLICT','Pranešimas pasikeitė. Atnaujinkite.',409);
   if(!['triage','resolved','dismissed'].includes(input.state)||!['record-only','hide-review','hide-media','disable-profile'].includes(input.action))reject('INVALID_INPUT','Pasirinkite peržiūros būseną ir veiksmą.');
   if(['resolved','dismissed','hidden'].includes(r.status))reject('VERSION_CONFLICT','Šio pranešimo peržiūra užbaigta.',409);const reason=text(input.reason,500);if((r.actions||[]).length>=50)reject('LIMIT','Pranešimo sprendimų limitas pasiektas.');
   if(input.action!=='record-only'){
    if(input.state!=='resolved')reject('INVALID_INPUT','Viešinimo pakeitimą susiekite su užbaigtu sprendimu.');
    const expected={'hide-review':'review','hide-media':'media','disable-profile':'organization'}[input.action];if(r.targetKind!==expected)reject('INVALID_INPUT','Veiksmas neatitinka pranešimo objekto.');const org=find(d,'organizations',r.organizationId);
    if(input.action==='hide-review'){const review=find(d,'reviews',r.target);if(review.organizationId!==org.id)reject('INVALID_INPUT','Atsiliepimas priklauso kitam profiliui.');const previous=review.state||(review.approved?'approved':'pending');Object.assign(review,{approved:false,state:'rejected',reason,moderatedAt:clock().now,moderatedBy:user.id,version:(review.version||0)+1});review.actions||=[];review.actions.push({previous,state:review.state,reason,reportId:r.id,actorId:user.id,at:clock().now});}
    if(input.action==='hide-media'){const media=find(d,'media',r.target);if(media.organizationId!==org.id)reject('INVALID_INPUT','Vaizdas priklauso kitam profiliui.');media.moderationState='restricted';media.moderationReason=reason;media.moderatedAt=clock().now;media.moderatedBy=user.id;org.gallery=org.gallery.filter(id=>id!==media.id);org.draftGallery=(org.draftGallery||[]).filter(id=>id!==media.id);if(org.avatarImageId===media.id)org.avatarImageId=null;if(org.draftAvatarImageId===media.id)org.draftAvatarImageId=null;org.version++;}
    if(input.action==='disable-profile'){org.approved=false;org.profileState='returned';org.version++;org.moderationReason=reason;org.moderatedAt=clock().now;org.moderatedBy=user.id;}
   }
   const previous=r.status;r.status=input.state;r.reason=reason;r.version=(r.version||0)+1;r.updatedAt=clock().now;r.actions||=[];r.actions.push({previous,state:r.status,action:input.action,reason,actorId:user.id,at:clock().now});event(d,'report-reviewed',r.id);return r;
  });}
 };
}
