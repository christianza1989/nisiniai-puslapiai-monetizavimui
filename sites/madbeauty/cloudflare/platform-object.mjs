import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from './store.mjs';
import {fetchApi} from './fetch-api.mjs';
import {createMedia} from './media.mjs';
import {createSqlMediaBucket} from './media-bucket.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {createAuth} from '../backend/auth.mjs';
import {createOrganizationHandoff} from '../backend/organization-handoff.mjs';
import {createOrganizationCommit} from '../backend/organization-authority.mjs';
import {createOrganizationDirectory} from '../backend/organization-directory.mjs';
import {nextReminderAt,reminderValid} from '../backend/notifications.mjs';
import {nextWaitlistAt,waitlistMailValid} from '../backend/waitlist.mjs';
import {transactionalMail} from '../backend/transactional-mail.mjs';
import {createOrganizationMediaSource} from '../backend/organization-media.mjs';
import {policyActive} from '../backend/retention-policy.mjs';
import {sendHostingerMail} from '../../../../dovanos-memorycasting/lib/hostinger-transport.mjs';

// One bounded Madbeauty pilot coordination domain. Other sites use separate namespaces.
// Booking/state transactions never await network I/O. Split per organization before scale.
export class MadbeautyPlatform extends DurableObject{
 constructor(ctx,env,storeOptions){super(ctx,env);this.store=openDurableStore(ctx,env.SESSION_SECRET,storeOptions);this.store.retentionPolicyVersion=env.RETENTION_POLICY_VERSION;this.mediaBucket=createSqlMediaBucket(this.store);this.media=createMedia({...env,MEDIA:this.mediaBucket});this.mailRunning=null;
  this.store.onVerifiedAccount=user=>{if(env.OPERATOR_EMAIL&&user.email===env.OPERATOR_EMAIL){this.store.db.prepare('UPDATE accounts SET operator=1 WHERE id=? AND site_id=?').run(user.id,this.store.siteId);return {...user,operator:1};}return user;};
 }
 async fetch(request){
  const origin=this.env.APP_ORIGIN;
  if(new URL(request.url).origin!==origin)return new Response('Not found',{status:404});
  if(new URL(request.url).pathname==='/api/madbeauty/recovery-status'){
   if(request.method!=='GET')return new Response('Method not allowed',{status:405});
   const token=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-madbeauty_sid='))?.slice('__Host-madbeauty_sid='.length),auth=createAuth(this.store);
   if(!auth.account(auth.session(token,{create:false}))?.operator)return Response.json({error:{code:'FORBIDDEN'}},{status:403,headers:{'Cache-Control':'no-store'}});
   try{return Response.json(await this.recoveryStatus(),{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});}catch{return Response.json({error:{code:'RECOVERY_STATUS_UNAVAILABLE'}},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
  if(request.method==='POST'&&new URL(request.url).pathname==='/api/madbeauty/auth/start'&&!this.env.MAIL_TRANSPORT&&!this.env.MAIL_RELAY_URL&&(!this.env.LEAD_SMTP_USER||!this.env.LEAD_SMTP_PASSWORD))return Response.json({error:{code:'MAIL_UNAVAILABLE',message:'Prisijungimas laikinai nepasiekiamas. Rašykite info@pinet.lt.'}},{status:503,headers:{'Cache-Control':'no-store'}});
  const directory=this.directory(),media={...this.media,uploadMedia:(user,input)=>directory.uploadMedia(user,input,{transformMedia:this.media.transformMedia,uploadSource:account=>this.media.uploadSource(this.store,account,input)}),readMedia:(store,file,user,platform)=>directory.readMedia(file,user,()=>this.media.readMedia(store,file,user,platform))};
  const response=await fetchApi(request,this.store,{origin,media,ip:request.headers.get('x-madbeauty-client-ip')||'unknown',dispatch:directory.dispatch});
  if(request.method==='POST'){
   await this.schedule();
   if(new URL(request.url).pathname==='/api/madbeauty/auth/start'&&response.ok){
    await this.drain();
    const copy=await response.clone().json();
    const row=this.store.db.prepare('SELECT state FROM mail_outbox WHERE challenge_id=? AND site_id=?').get(copy.challengeId,this.store.siteId);
    if(row?.state!=='accepted')return Response.json({error:{code:'MAIL_UNAVAILABLE',message:'Laiško išsiųsti nepavyko. Bandykite vėliau.'}},{status:503,headers:{'Cache-Control':'no-store'}});
   }
  }
  return response;
 }
 directory(){return createOrganizationDirectory(this.store,{getTarget:this.env.ORGANIZATION_STAGING?name=>this.env.ORGANIZATION_STAGING.get(this.env.ORGANIZATION_STAGING.idFromName(name)):undefined});}
 async catalog(input){return this.directory().dispatch('catalog',null,input);}
 async profile(id){return this.directory().dispatch('profile',null,{id});}
 async publicProfiles(){return this.directory().dispatch('publicProfiles',null,{});}
 // Private maintenance RPC; operator identity comes from accounts, never a browser flag.
 // These methods stage a copy only. They cannot grant a second calendar writer.
 async organizationHandoffStatus(input){return createOrganizationHandoff(this.store).status(input);}
 async freezeOrganization(input){return createOrganizationHandoff(this.store).freeze(input);}
 async organizationHandoffPage(input){return createOrganizationHandoff(this.store).page(input);}
 async organizationMediaHandoffPage(input){return createOrganizationMediaSource(this.store).page(input);}
 async abortOrganizationHandoff(input){return createOrganizationHandoff(this.store).abort(input);}
 async organizationHandoffContext(input){return createOrganizationCommit(this.store).context(input);}
 async sealOrganizationHandoff(input){return createOrganizationCommit(this.store).seal(input);}
 async abortPreparedOrganizationHandoff(input){return createOrganizationCommit(this.store).abort(input);}
 async recoveryStatus(){
  this.expire();
  const bookmark=await this.ctx.storage.getCurrentBookmark(),db=this.store.db;
  return {siteId:this.store.siteId,bookmark,databaseBytes:this.ctx.storage.sql.databaseSize,stateBytes:this.store.rowStats().bytes,stateStorage:this.store.rowStats(),mediaBytes:this.mediaBucket.stats().bytes,mediaStorage:this.mediaBucket.stats(),outbox:db.prepare('SELECT state,COUNT(*) AS count FROM mail_outbox WHERE site_id=? GROUP BY state').all(this.store.siteId),alarm:await this.ctx.storage.getAlarm()};
 }
 // Control-plane RPC only. It is absent from the browser dispatcher and HTTP API.
 // Calling this schedules recovery on the next DO session; maintainers then abort
 // the session through a reviewed maintenance deployment. Never run as a smoke test.
 async scheduleRecovery(bookmark){
  if(!/^[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{32}$/i.test(bookmark))throw Error('Invalid recovery bookmark');
  // A source-only rewind can resurrect calendar ownership, canonical actors or
  // issuance sequences already superseded by an organization object. Aborted
  // handoffs also retain epochs/receipts, so they require coordinated recovery.
  const decision=await this.ctx.blockConcurrencyWhile(async()=>{
   // A raw rewind would also rewind the erasure journal and revive deleted
   // identities. Approved-policy recovery uses an isolated import with an
   // independently verified current journal; never expose an older live DB.
   if(policyActive(this.store)||this.directory().retention.journal().length)return {privacyBlocked:true};
   if(this.store.db.prepare('SELECT COUNT(*) AS n FROM organization_handoffs WHERE site_id=?').get(this.store.siteId).n)return {blocked:true};
   return {bookmark:await this.ctx.storage.onNextSessionRestoreBookmark(bookmark)};
  });
  // Throw after the callback: an expected refusal inside it would reset the DO.
  if(decision.privacyBlocked)throw Error('Recovery requires the current erasure journal in an isolated checkpoint import');
  if(decision.blocked)throw Error('Source recovery requires coordinated source and organization checkpoints');
  return decision.bookmark;
 }
 async schedule(){
  const row=this.store.db.prepare("SELECT MIN(CASE WHEN state='sending' THEN lease_until ELSE next_attempt_at END) AS due FROM mail_outbox AS mail WHERE site_id=? AND state IN ('pending','sending') AND NOT EXISTS (SELECT 1 FROM organization_handoffs AS h WHERE h.site_id=mail.site_id AND h.organization_id=mail.organization_id AND h.state!='aborted')").get(this.store.siteId);
  const directory=this.directory(),due=Math.min(row?.due??Infinity,nextReminderAt(this.store)??Infinity,nextWaitlistAt(this.store)??Infinity,directory.nextControlAt()??Infinity,directory.nextClientAdmissionAt()??Infinity,directory.nextErasureAt()??Infinity,await directory.nextOrganizationMailAt()??Infinity);
  await this.ctx.storage.setAlarm(Math.max(Date.now()+1000,Number.isFinite(due)?due:Date.now()+86400000));
 }
 async alarm(){const directory=this.directory();try{await directory.runRetention();await directory.flushClientAdmissions();await directory.flushCustomerControls();createPlatform(this.store).runAutomation();await this.drain();this.expire();}finally{await this.schedule();}}
 expire(){
  const now=this.store.clock(),db=this.store.db;
  db.prepare("UPDATE mail_outbox SET state='expired',payload='{}',lease_until=0 WHERE type='login-code' AND state IN ('pending','sending','failed') AND challenge_id IN (SELECT id FROM email_challenges WHERE consumed=1 OR expires_at<=?)").run(now);
  db.prepare('DELETE FROM sessions WHERE expires_at<? OR touched_at<?').run(now,now-1800000);
  db.prepare('DELETE FROM rate_limits WHERE expires_at<?').run(now);
  db.prepare('DELETE FROM email_challenges WHERE expires_at<?').run(now-86400000);
  db.prepare("UPDATE mail_outbox SET finalized_at=? WHERE finalized_at=0 AND state IN ('accepted','failed','expired') AND NOT EXISTS (SELECT 1 FROM organization_handoffs AS h WHERE h.site_id=mail_outbox.site_id AND h.organization_id=mail_outbox.organization_id AND h.state!='aborted')").run(now);
  db.prepare("DELETE FROM mail_outbox WHERE type='login-code' AND created_at<?").run(now-86400000);
  db.prepare("DELETE FROM mail_outbox WHERE state IN ('accepted','failed','expired') AND finalized_at>0 AND finalized_at<? AND NOT EXISTS (SELECT 1 FROM organization_handoffs AS h WHERE h.site_id=mail_outbox.site_id AND h.organization_id=mail_outbox.organization_id AND h.state!='aborted')").run(now-30*86400000);
  db.prepare("DELETE FROM notification_jobs WHERE state IN ('queued','suppressed','missed') AND due_at<? AND NOT EXISTS (SELECT 1 FROM organization_handoffs AS h WHERE h.site_id=notification_jobs.site_id AND h.organization_id=notification_jobs.organization_id AND h.state!='aborted')").run(now-30*86400000);
 }
 async drain(){
  if(this.mailRunning)return this.mailRunning;
  this.mailRunning=this.deliverPending();
  try{await this.mailRunning;}finally{this.mailRunning=null;}
 }
 async deliverPending(){
  const {db,siteId}=this.store;
  try{
   for(let n=0;n<10;n++){
    const now=Date.now();const row=db.prepare("SELECT * FROM mail_outbox AS mail WHERE site_id=? AND ((state='pending' AND next_attempt_at<=?) OR (state='sending' AND lease_until<=?)) AND NOT EXISTS (SELECT 1 FROM organization_handoffs AS h WHERE h.site_id=mail.site_id AND h.organization_id=mail.organization_id AND h.state!='aborted') ORDER BY created_at LIMIT 1").get(siteId,now,now);
    if(!row)break;
    const payload=this.store.unseal(row.payload);
    if(row.type==='account-closure-notice'&&!this.store.db.prepare('SELECT account_id FROM retention_activity WHERE site_id=? AND account_id=? AND notice_mail_id=? AND notice_at>0').get(siteId,row.account_id,row.id)||!reminderValid(this.store,row,payload)||!waitlistMailValid(this.store,row,payload)){db.prepare("UPDATE mail_outbox SET state='expired',payload='{}',lease_until=0,finalized_at=? WHERE id=? AND site_id=?").run(now,row.id,siteId);continue;}
    if(row.type==='login-code'){
     const challenge=db.prepare('SELECT consumed,expires_at FROM email_challenges WHERE id=? AND site_id=?').get(row.challenge_id,siteId);
     if(!challenge||challenge.consumed||challenge.expires_at<=now){db.prepare("UPDATE mail_outbox SET state='expired',payload='{}',finalized_at=? WHERE id=?").run(now,row.id);continue;}
    }
    db.prepare("UPDATE mail_outbox SET state='sending',attempts=attempts+1,lease_until=? WHERE id=?").run(now+60000,row.id);
    const mail=transactionalMail(row,payload);
    let accepted=false;
    try{
     if(this.env.MAIL_TRANSPORT){const r=await this.env.MAIL_TRANSPORT.fetch('https://transactional.invalid/',{method:'POST',body:JSON.stringify(mail)});if(!r.ok)throw Error('Transport failed');}
     else await sendHostingerMail(this.env,mail);
     accepted=true;
     db.prepare("UPDATE mail_outbox SET state='accepted',delivered_at=?,finalized_at=?,lease_until=0,payload=? WHERE id=?").run(Date.now(),Date.now(),row.type==='login-code'?'{}':row.payload,row.id);
    }catch(error){
     console.warn('transactional-mail-failed',accepted?'Mail relay receipt storage unavailable':error.message?.startsWith('Mail relay')?error.message:'Transport unavailable '+(error.name==='TypeError'?'type':error.name==='Error'?'generic':'storage'));
     const failed=row.attempts>=4;
     db.prepare('UPDATE mail_outbox SET state=?,next_attempt_at=?,lease_until=0,finalized_at=? WHERE id=?').run(failed?'failed':'pending',now+Math.min(300000,15000*2**row.attempts),failed?now:0,row.id);
    }
   }
   await this.directory().drainOrganizationMail(async claim=>{const mail=transactionalMail(claim,claim.payload);if(this.env.MAIL_TRANSPORT){const response=await this.env.MAIL_TRANSPORT.fetch('https://transactional.invalid/',{method:'POST',body:JSON.stringify(mail)});if(!response.ok)throw Error('Transport failed');}else await sendHostingerMail(this.env,mail);});
  }finally{await this.schedule();}
 }
}
