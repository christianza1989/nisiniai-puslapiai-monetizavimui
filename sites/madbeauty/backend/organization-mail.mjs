import {randomId,reject} from './primitives.mjs';
import {reminderValid,nextReminderAt} from './notifications.mjs';
import {waitlistMailValid,nextWaitlistAt} from './waitlist.mjs';

const types=new Set(['confirmation','reschedule','cancellation','reminder','waitlist-offer']),maxReceipts=4096;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const payloadFor=(store,row)=>store.unseal?store.unseal(row.payload):JSON.parse(row.payload);
const invalid=()=>reject('MAIL_ADMISSION_INVALID','Pranešimo pristatymas nepatvirtintas.',403);
export function validateOrganizationMailClaim(store,transfer,candidate,claim){
 if(!claim||Object.keys(claim).some(k=>!['id','organizationId','epoch','accountId','recipient','type','payload','leaseToken','messageHash','attempt'].includes(k))||claim.id!==candidate.id||claim.accountId!==candidate.accountId||claim.organizationId!==transfer.organization_id||claim.epoch!==transfer.epoch||!validId(claim.leaseToken)||!Number.isSafeInteger(claim.attempt)||claim.attempt<1||!types.has(claim.type))invalid();
 const account=store.db.prepare('SELECT email FROM accounts WHERE site_id=? AND id=?').get(store.siteId,claim.accountId),{leaseToken,messageHash,attempt,...message}=claim;
 if(account?.email!==claim.recipient||messageHash!==store.hash('organization-mail:'+JSON.stringify(message)))invalid();
}

// Private target outbox. Only signed central commands can claim/acknowledge it.
// No browser identity, OTP or external transport is admitted on the target.
export function createOrganizationMailbox(store){
 const {db,siteId}=store,columns=new Set(db.prepare('PRAGMA table_info(mail_outbox)').all().map(c=>c.name));
 for(const name of ['next_attempt_at','lease_until'])if(!columns.has(name))db.exec('ALTER TABLE mail_outbox ADD COLUMN '+name+' INTEGER NOT NULL DEFAULT 0');
 db.exec('CREATE TABLE IF NOT EXISTS organization_mail_claims(site_id TEXT NOT NULL,mail_id TEXT NOT NULL,lease_token TEXT NOT NULL,message_hash TEXT NOT NULL,PRIMARY KEY(site_id,mail_id)); CREATE INDEX IF NOT EXISTS organization_mail_due ON mail_outbox(site_id,state,next_attempt_at,lease_until);');
 const authority=()=>db.prepare("SELECT organization_id,epoch FROM organization_target_authority WHERE site_id=? AND state='active'").get(siteId);
 const get=id=>{const a=authority();if(!a)invalid();return db.prepare('SELECT * FROM mail_outbox WHERE site_id=? AND organization_id=? AND id=?').get(siteId,a.organization_id,id);};
 const expire=row=>db.prepare("UPDATE mail_outbox SET state='expired',payload='{}',lease_until=0 WHERE site_id=? AND id=?").run(siteId,row.id);
 return {
  candidates:()=>{const a=authority();if(!a)invalid();return db.prepare("SELECT id,account_id AS accountId FROM mail_outbox WHERE site_id=? AND organization_id=? AND challenge_id IS NULL AND type IN ('confirmation','reschedule','cancellation','reminder','waitlist-offer') AND ((state='pending' AND next_attempt_at<=?) OR (state='sending' AND lease_until<=?)) ORDER BY created_at,id LIMIT 10").all(siteId,a.organization_id,store.clock(),store.clock());},
  claim:(actor,input)=>{
   if(!validId(input?.id)||!actor)invalid();const row=get(input.id);if(!row||row.account_id!==actor.id||row.recipient!==actor.email||row.challenge_id||!types.has(row.type))invalid();
   const now=store.clock();if(!(row.state==='pending'&&row.next_attempt_at<=now||row.state==='sending'&&row.lease_until<=now))return null;
   const payload=payloadFor(store,row);if(!payload||Buffer.byteLength(JSON.stringify(payload))>16384)invalid();
   const booking=row.booking_id?store.recordById('bookings',row.booking_id):null;
   const current=row.type==='waitlist-offer'?true:!!booking&&booking.clientId===actor.id&&booking.status===payload.status&&booking.startAt===payload.startAt&&booking.endAt===payload.endAt;
   if(!current||!reminderValid(store,row,payload)||!waitlistMailValid(store,row,payload)){expire(row);return null;}
   if(!db.prepare('SELECT mail_id FROM organization_mail_claims WHERE site_id=? AND mail_id=?').get(siteId,row.id)&&db.prepare('SELECT COUNT(*) AS n FROM organization_mail_claims WHERE site_id=?').get(siteId).n>=maxReceipts)reject('CAPACITY','Pranešimų pristatymo žurnalo talpa pasiekta.',503);
   const leaseToken=randomId('mail-lease'),a=authority(),message={id:row.id,organizationId:a.organization_id,epoch:a.epoch,accountId:actor.id,recipient:row.recipient,type:row.type,payload};
   const messageHash=store.hash('organization-mail:'+JSON.stringify(message));
   db.prepare('INSERT INTO organization_mail_claims VALUES(?,?,?,?) ON CONFLICT(site_id,mail_id) DO UPDATE SET lease_token=excluded.lease_token,message_hash=excluded.message_hash').run(siteId,row.id,leaseToken,messageHash);
   db.prepare("UPDATE mail_outbox SET state='sending',attempts=attempts+1,lease_until=? WHERE site_id=? AND id=?").run(now+60000,siteId,row.id);
   return {...message,leaseToken,messageHash,attempt:row.attempts+1};
  },
  acknowledge:input=>{
   if(!validId(input?.id)||!validId(input.leaseToken)||!['accepted','expired','rejected'].includes(input.outcome))invalid();
   const row=get(input.id),claim=db.prepare('SELECT lease_token,message_hash FROM organization_mail_claims WHERE site_id=? AND mail_id=?').get(siteId,input.id);
   if(!row||claim?.lease_token!==input.leaseToken||claim.message_hash!==input.messageHash)reject('MAIL_LEASE_CONFLICT','Pranešimo pristatymo versija pasikeitė.',409);
   if(row.state!=='sending')return {id:row.id,state:row.state};
   if(input.outcome==='expired')expire(row);
   else if(input.outcome==='accepted')db.prepare("UPDATE mail_outbox SET state='accepted',delivered_at=?,lease_until=0 WHERE site_id=? AND id=?").run(store.clock(),siteId,row.id);
   else db.prepare('UPDATE mail_outbox SET state=?,next_attempt_at=?,lease_until=0 WHERE site_id=? AND id=?').run(row.attempts>=5?'failed':'pending',store.clock()+Math.min(300000,15000*2**(row.attempts-1)),siteId,row.id);
   return {id:row.id,state:get(row.id).state};
  },
  nextAt:()=>{const a=authority();if(!a)return null;const row=db.prepare("SELECT MIN(CASE WHEN state='sending' THEN lease_until ELSE next_attempt_at END) AS due FROM mail_outbox WHERE site_id=? AND organization_id=? AND challenge_id IS NULL AND type IN ('confirmation','reschedule','cancellation','reminder','waitlist-offer') AND state IN ('pending','sending')").get(siteId,a.organization_id),due=Math.min(row?.due??Infinity,nextReminderAt(store)??Infinity,nextWaitlistAt(store)??Infinity);return Number.isFinite(due)?due:null;}
 };
}

// Central receipt stores no email/body. An accepted external send is retried as
// an acknowledgement, not another send. Crash before its receipt is at-least-once.
export function createOrganizationMailReceipts(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS directory_organization_mail(site_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,mail_id TEXT NOT NULL,account_id TEXT NOT NULL,message_hash TEXT NOT NULL,lease_token TEXT NOT NULL,phase TEXT NOT NULL,outcome TEXT,ack_due INTEGER NOT NULL,PRIMARY KEY(site_id,organization_id,mail_id)); CREATE INDEX IF NOT EXISTS organization_mail_ack_due ON directory_organization_mail(site_id,phase,ack_due); CREATE TABLE IF NOT EXISTS directory_organization_mail_cursor(site_id TEXT PRIMARY KEY,organization_id TEXT NOT NULL);');
 const get=(org,id)=>db.prepare('SELECT * FROM directory_organization_mail WHERE site_id=? AND organization_id=? AND mail_id=?').get(siteId,org,id);
 return {
  get,
  order:targets=>{const rows=[...targets].sort((a,b)=>a.organization_id.localeCompare(b.organization_id)),last=db.prepare('SELECT organization_id FROM directory_organization_mail_cursor WHERE site_id=?').get(siteId)?.organization_id,index=rows.findIndex(t=>t.organization_id===last)+1;return [...rows.slice(index),...rows.slice(0,index)];},
  advance:target=>db.prepare('INSERT INTO directory_organization_mail_cursor VALUES(?,?) ON CONFLICT(site_id) DO UPDATE SET organization_id=excluded.organization_id').run(siteId,target.organization_id),
  capacity:()=>db.prepare('SELECT COUNT(*) AS n FROM directory_organization_mail WHERE site_id=?').get(siteId).n<maxReceipts,
  reserve:(transfer,claim)=>{
   const prior=get(transfer.organization_id,claim.id);if(prior&&(prior.message_hash!==claim.messageHash||prior.epoch!==transfer.epoch))reject('MAIL_LEASE_CONFLICT','Pranešimo turinys pasikeitė.',409);
   if(prior?.outcome==='accepted')return prior;
   if(!prior&&db.prepare('SELECT COUNT(*) AS n FROM directory_organization_mail WHERE site_id=?').get(siteId).n>=maxReceipts)reject('CAPACITY','Pranešimų pristatymo žurnalo talpa pasiekta.',503);
   db.prepare("INSERT INTO directory_organization_mail VALUES(?,?,?,?,?,?,?,'reserved',NULL,?) ON CONFLICT(site_id,organization_id,mail_id) DO UPDATE SET lease_token=excluded.lease_token,phase='reserved',outcome=NULL,ack_due=excluded.ack_due").run(siteId,transfer.organization_id,transfer.epoch,claim.id,claim.accountId,claim.messageHash,claim.leaseToken,store.clock()+60000);return get(transfer.organization_id,claim.id);
  },
  settle:(row,outcome)=>{if(!['accepted','expired','rejected'].includes(outcome))invalid();db.prepare("UPDATE directory_organization_mail SET phase='ack-pending',outcome=?,ack_due=? WHERE site_id=? AND organization_id=? AND mail_id=? AND lease_token=? AND phase='reserved'").run(outcome,store.clock(),siteId,row.organization_id,row.mail_id,row.lease_token);return get(row.organization_id,row.mail_id);},
  pending:()=>db.prepare("SELECT * FROM directory_organization_mail WHERE site_id=? AND phase='ack-pending' AND ack_due<=? ORDER BY ack_due,mail_id LIMIT 32").all(siteId,store.clock()),
  acknowledged:row=>db.prepare("UPDATE directory_organization_mail SET phase='complete' WHERE site_id=? AND organization_id=? AND mail_id=? AND lease_token=? AND phase='ack-pending'").run(siteId,row.organization_id,row.mail_id,row.lease_token),
  retry:row=>db.prepare("UPDATE directory_organization_mail SET ack_due=? WHERE site_id=? AND organization_id=? AND mail_id=? AND phase='ack-pending'").run(store.clock()+30000,siteId,row.organization_id,row.mail_id),
  nextAt:()=>db.prepare("SELECT MIN(ack_due) AS due FROM directory_organization_mail WHERE site_id=? AND phase='ack-pending'").get(siteId)?.due??null
 };
}
