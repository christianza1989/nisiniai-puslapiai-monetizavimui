import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {randomId,reject,initialState} from './primitives.mjs';
import {RETENTION_POLICY as policy,policyActive,policyPublic,monthsBefore} from './retention-policy.mjs';
const day=86400000,json=JSON.stringify,valid=id=>typeof id==='string'&&/^[a-zA-Z0-9_:-]{1,160}$/.test(id);
const fresh=(store,user)=>{if(!user)reject('UNAUTHENTICATED','Prisijunkite.',401);const now=store.clock();if(!Number.isFinite(user.verifiedAt)||user.verifiedAt>now||now-user.verifiedAt>600000)reject('REAUTH_REQUIRED','Dar kartą patvirtinkite el. paštą.',403);};
const tables=store=>new Set(store.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
const schema=`CREATE TABLE IF NOT EXISTS retention_tombstones(site_id TEXT NOT NULL,client_id TEXT NOT NULL,request_id TEXT NOT NULL,alias_id TEXT NOT NULL,policy_version TEXT NOT NULL,created_at INTEGER NOT NULL,completed_at INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL,counts TEXT NOT NULL,PRIMARY KEY(site_id,client_id));
CREATE TABLE IF NOT EXISTS retention_target_queue(site_id TEXT NOT NULL,client_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,state TEXT NOT NULL,PRIMARY KEY(site_id,client_id,organization_id));
CREATE TABLE IF NOT EXISTS retention_backups(site_id TEXT NOT NULL,id TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,sha256 TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(site_id,id));
CREATE TABLE IF NOT EXISTS retention_backup_chunks(site_id TEXT NOT NULL,id TEXT NOT NULL,part INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(site_id,id,part));
CREATE TABLE IF NOT EXISTS retention_activity(site_id TEXT NOT NULL,account_id TEXT NOT NULL,touched_at INTEGER NOT NULL,notice_at INTEGER NOT NULL DEFAULT 0,notice_mail_id TEXT,PRIMARY KEY(site_id,account_id));
CREATE TABLE IF NOT EXISTS retention_retired_handoffs(site_id TEXT NOT NULL,organization_id TEXT NOT NULL,retired_at INTEGER NOT NULL,PRIMARY KEY(site_id,organization_id));`;
export function createRetention(store){
 const {db,siteId}=store;db.exec(schema);
 db.exec('CREATE TABLE IF NOT EXISTS retention_receipt_access(site_id TEXT NOT NULL,token_hash TEXT NOT NULL,client_id TEXT NOT NULL,expires_at INTEGER NOT NULL,PRIMARY KEY(site_id,token_hash));');
 if(!db.prepare('PRAGMA table_info(retention_activity)').all().some(c=>c.name==='notice_mail_id'))db.exec('ALTER TABLE retention_activity ADD COLUMN notice_mail_id TEXT');
 const active=()=>{if(!policyActive(store))reject('RETENTION_NOT_ACTIVE','Duomenų šalinimas dar neaktyvintas.',503);};
 const accountErasure=event=>{const result=store.onAccountErasure?.(Object.freeze(event));if(result?.then)throw Error('Native account erasure hook must be synchronous');};
 const get=id=>db.prepare('SELECT * FROM retention_tombstones WHERE site_id=? AND client_id=?').get(siteId,id);
 const key=Buffer.from(store.hash('retention-backup-key-v1'),'hex');
 const protect=bytes=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([c.update(bytes),c.final()]);return json({v:1,iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),encrypted:encrypted.toString('base64')});};
 const unprotect=raw=>{const e=JSON.parse(raw);if(e.v!==1)throw Error('Unknown backup encryption');const c=createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));c.setAuthTag(Buffer.from(e.tag,'base64'));return Buffer.concat([c.update(Buffer.from(e.encrypted,'base64')),c.final()]);};
 // Portable customer-data backup. Media bytes and SQL control-plane continuity
 // are also covered by provider PITR; this envelope cannot rewind writer epochs.
 function snapshot(){return {schemaVersion:1,siteId,at:store.clock(),policyVersion:policy.version,state:store.read(),accounts:db.prepare('SELECT * FROM accounts WHERE site_id=?').all(siteId),mail:db.prepare('SELECT * FROM mail_outbox WHERE site_id=?').all(siteId),jobs:db.prepare('SELECT * FROM notification_jobs WHERE site_id=?').all(siteId)};}
 function backup({force=false}={}){return store.transaction(()=>{
  active();const now=store.clock();db.prepare('DELETE FROM retention_backup_chunks WHERE site_id=? AND id IN (SELECT id FROM retention_backups WHERE site_id=? AND expires_at<=?)').run(siteId,siteId,now);db.prepare('DELETE FROM retention_backups WHERE site_id=? AND expires_at<=?').run(siteId,now);
  const old=db.prepare('SELECT id,created_at FROM retention_backups WHERE site_id=? ORDER BY created_at DESC LIMIT 1').get(siteId);if(!force&&old&&old.created_at>now-day)return old;
  const raw=Buffer.from(json(snapshot())),payload=protect(raw);if(raw.length>24*1024*1024)reject('CAPACITY','Duomenų kopija viršija patikrintą ribą.',503);
  const used=db.prepare('SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) AS bytes FROM retention_backup_chunks WHERE site_id=?').get(siteId).bytes;if(used+Buffer.byteLength(payload)>256*1024*1024)reject('CAPACITY','Kopijų saugyklos talpa pasiekta.',503);
  const id=randomId('backup'),sha256=createHash('sha256').update(raw).digest('hex'),envelope=JSON.parse(payload),encrypted=envelope.encrypted,chunkSize=512*1024;delete envelope.encrypted;envelope.parts=Math.ceil(encrypted.length/chunkSize);
  db.prepare('INSERT INTO retention_backups VALUES(?,?,?,?,?,?)').run(siteId,id,now,now+policy.backupDays*day,sha256,json(envelope));for(let offset=0,part=0;offset<encrypted.length;offset+=chunkSize,part++)db.prepare('INSERT INTO retention_backup_chunks VALUES(?,?,?,?)').run(siteId,id,part,encrypted.slice(offset,offset+chunkSize));return {id,createdAt:now,expiresAt:now+policy.backupDays*day,sha256};
 });}
 function decodeBackup(id){const b=db.prepare('SELECT * FROM retention_backups WHERE site_id=? AND id=?').get(siteId,id);if(!b||b.expires_at<=store.clock())reject('NOT_FOUND','Kopija nebegalioja.',404);const e=JSON.parse(b.payload);if(e.parts!==undefined){if(!Number.isSafeInteger(e.parts)||e.parts<1||e.parts>65)throw Error('Backup chunk limit');const chunks=db.prepare('SELECT part,data FROM retention_backup_chunks WHERE site_id=? AND id=? ORDER BY part LIMIT 66').all(siteId,id);if(chunks.length!==e.parts||chunks.some((c,n)=>c.part!==n||c.data.length>512*1024))throw Error('Backup chunks incomplete');e.encrypted=chunks.map(c=>c.data).join('');delete e.parts;}const raw=unprotect(json(e));if(createHash('sha256').update(raw).digest('hex')!==b.sha256)throw Error('Backup checksum mismatch');return JSON.parse(raw);}
 function inspect(user){active();fresh(store,user);const account=db.prepare('SELECT * FROM accounts WHERE site_id=? AND id=?').get(siteId,user.id);if(!account||get(user.id))reject('UNAUTHENTICATED','Paskyra uždaryta.',401);
  if(account.operator||store.clientRecords('memberships',user.id).length)reject('PROFESSIONAL_ACCOUNT','Veiklos paskyrai reikia atskiro prieigų ir veiklos tęstinumo sprendimo. Kliento paskyros trynimas meistro prieigų nekeičia.',409);
  return {policy:policyPublic(),activeRequests:[...store.clientRecords('inquiries',user.id).filter(r=>r.status==='new'),...store.clientRecords('waitlist',user.id).filter(r=>!['closed','expired'].includes(r.state))].map(({id,organizationId})=>({id,organizationId})),futureBookings:store.clientRecords('bookings',user.id).filter(b=>b.status==='confirmed'&&Date.parse(b.endAt)>store.clock()).map(({id,organizationId,startAt,endAt})=>({id,organizationId,startAt,endAt})),executionEnabled:true};
 }
 function preview(user){const result=inspect(user);store.limit('erasure-preview:'+user.id,20,86400);const receiptToken=randomBytes(32).toString('base64url');db.prepare('INSERT INTO retention_receipt_access VALUES(?,?,?,?)').run(siteId,store.hash(receiptToken),user.id,store.clock()+day);return {...result,receiptToken};}
 function clearDormantState(){if(!store.rowStats().legacyMirrored){const v=db.prepare('SELECT version FROM platform_state WHERE site_id=?').get(siteId).version;db.prepare('INSERT INTO state_writer_permits VALUES(?)').run(siteId);try{db.prepare('UPDATE platform_state SET data=? WHERE site_id=?').run(json(initialState()),siteId);}finally{db.prepare('DELETE FROM state_writer_permits WHERE site_id=?').run(siteId);}db.prepare('UPDATE state_row_metadata SET legacy_version=? WHERE site_id=?').run(v,siteId);}db.prepare('DELETE FROM state_migration_checkpoints WHERE site_id=?').run(siteId);}
 function scrub(clientId,aliasId){
  // Called only in a synchronous, signed maintenance transaction. Permits never
  // survive a commit and contain exact existing keys, not a tenant-wide bypass.
  const d=store.read(),counts={},owned=r=>r?.clientId===clientId||r?.accountId===clientId||r?.id===clientId;
  const bookingIds=new Set((d.bookings||[]).filter(owned).map(b=>b.id)),removedIds=new Set([clientId]),relatedOrganizations=new Set(Object.values(d).filter(Array.isArray).flat().filter(owned).map(r=>r.organizationId).filter(Boolean));
  const future=(d.bookings||[]).some(b=>owned(b)&&b.status==='confirmed'&&Date.parse(b.endAt)>store.clock());
  for(const name of ['messages','inquiries','waitlist','clientCards','clientLinks','reviews','reports','holds','preferences','dataRequests','clients']){
   const rows=d[name];if(!Array.isArray(rows))continue;const removed=rows.filter(owned);counts[name]=removed.length;for(const r of removed)removedIds.add(r.id);d[name]=rows.filter(r=>!owned(r));
  }
  for(const b of d.bookings||[])if(owned(b)){
   counts.bookings=(counts.bookings||0)+1;b.clientId=aliasId;delete b.accountId;delete b.name;delete b.email;delete b.phone;delete b.note;delete b.reason;delete b.cancelReason;delete b.cancellationReason;delete b.changeReason;
   // Existing nested snapshots describe provider/service, while visit notes may
   // be arbitrary client text. Remove notes at every segment as well.
   for(const s of b.segments||[]){delete s.note;delete s.reason;delete s.clientName;delete s.clientEmail;}b.erased=true;
  }
  if(future){d.clients.push({id:aliasId,accountId:aliasId,name:'Pašalinta paskyra',email:'',version:1,erased:true});d.preferences.push({id:aliasId+'-preferences',clientId:aliasId,service:false,marketing:false,reminderLeadMin:1440,updatedAt:new Date(store.clock()).toISOString()});}
  if(d.idempotency)for(const [k,v]of Object.entries(d.idempotency))if(k.startsWith(clientId+':')||bookingIds.has(v?.bookingId)||removedIds.has(v?.holdId)||removedIds.has(v?.waitlistId)||removedIds.has(v?.reportId))delete d.idempotency[k];
  if(d.events)d.events=d.events.filter(e=>!removedIds.has(e.entityId)&&!bookingIds.has(e.entityId));
  for(const r of d.reports||[])if(removedIds.has(r.target)){r.target='removed';r.note='Objektas pašalintas pagal duomenų saugojimo tvarką.';delete r.reason;r.actions=[];r.status='resolved';r.version=(r.version||0)+1;}
  const before=db.prepare('SELECT collection,record_key FROM state_rows WHERE site_id=?').all(siteId),permit=db.prepare('INSERT OR IGNORE INTO retention_writer_permits VALUES(?,?,?)');
  // Array compaction changes positions, so existing keys are permitted inside
  // this one precomputed privacy rewrite. No ordinary business call runs here.
  for(const r of before)permit.run(siteId,r.collection,r.record_key);permit.run(siteId,'accounts',clientId);if(future)permit.run(siteId,'preferences','id:'+aliasId+'-preferences');
  try{
   store.write(d);
   // Oversized state can retain a stale legacy envelope; remove that dormant
   // envelope and migration checkpoint so an old JSON reader cannot leak it.
   clearDormantState();
   db.prepare('DELETE FROM sessions WHERE site_id=? AND account_id=?').run(siteId,clientId);
   const account=db.prepare('SELECT email FROM accounts WHERE site_id=? AND id=?').get(siteId,clientId);
   if(account)db.prepare('DELETE FROM email_challenges WHERE site_id=? AND email=?').run(siteId,account.email);
   const mails=db.prepare('SELECT id,booking_id FROM mail_outbox WHERE site_id=? AND (account_id=?'+(account?' OR recipient=?':'')+')').all(siteId,clientId,...(account?[account.email]:[]));
   for(const m of mails){db.prepare('INSERT OR IGNORE INTO retention_mail_permits VALUES(?,?)').run(siteId,m.id);if(tables(store).has('organization_mail_claims'))db.prepare('DELETE FROM organization_mail_claims WHERE site_id=? AND mail_id=?').run(siteId,m.id);db.prepare('DELETE FROM mail_outbox WHERE site_id=? AND id=?').run(siteId,m.id);}
   for(const j of db.prepare('SELECT id,booking_id FROM notification_jobs WHERE site_id=?').all(siteId))if(bookingIds.has(j.booking_id)){db.prepare('INSERT OR IGNORE INTO retention_mail_permits VALUES(?,?)').run(siteId,j.id);db.prepare('DELETE FROM notification_jobs WHERE site_id=? AND id=?').run(siteId,j.id);}
   db.prepare('DELETE FROM accounts WHERE site_id=? AND id=?').run(siteId,clientId);db.prepare('DELETE FROM retention_activity WHERE site_id=? AND account_id=?').run(siteId,clientId);
   const available=tables(store);
   // Historical read-only transfer payloads are retired, not re-signed as a
   // different snapshot. Their hash/epoch audit remains; replay must refuse.
   const retired=db.prepare("SELECT organization_id,handoff_id FROM organization_handoffs WHERE site_id=? AND state='sealed'").all(siteId);
   for(const h of retired)if(relatedOrganizations.has(h.organization_id)){db.prepare('DELETE FROM organization_handoff_rows WHERE site_id=? AND handoff_id=?').run(siteId,h.handoff_id);if(available.has('organization_handoff_context'))db.prepare('DELETE FROM organization_handoff_context WHERE site_id=? AND organization_id=?').run(siteId,h.organization_id);db.prepare('INSERT OR IGNORE INTO retention_retired_handoffs VALUES(?,?,?)').run(siteId,h.organization_id,store.clock());}
   const authority=db.prepare('SELECT organization_id FROM organization_target_authority WHERE site_id=?').get(siteId);if(authority)db.prepare('INSERT OR IGNORE INTO retention_retired_handoffs VALUES(?,?,?)').run(siteId,authority.organization_id,store.clock());
   if(available.has('organization_stage_rows'))db.prepare('DELETE FROM organization_stage_rows WHERE site_id=?').run(siteId);
   if(available.has('organization_directory_identity_effects'))db.prepare('DELETE FROM organization_directory_identity_effects WHERE site_id=? AND account_id=?').run(siteId,clientId);
   if(available.has('directory_client_admissions'))db.prepare('DELETE FROM directory_client_admissions WHERE site_id=? AND account_id=?').run(siteId,clientId);
   if(available.has('organization_client_admissions'))db.prepare("DELETE FROM organization_client_admissions WHERE site_id=? AND (json_extract(result,'$.id')=? OR json_extract(result,'$.clientId')=?)").run(siteId,clientId,clientId);
   if(available.has('directory_customer_controls'))db.prepare('DELETE FROM directory_customer_controls WHERE site_id=? AND client_id=?').run(siteId,clientId);
   // Short-lived command results can contain old client names/notes. Clearing
   // them never rewinds writer authority or durable booking idempotency.
   if(available.has('organization_directory_commands'))db.prepare('DELETE FROM organization_directory_commands WHERE site_id=?').run(siteId);
  }finally{db.prepare('DELETE FROM retention_writer_permits WHERE site_id=?').run(siteId);db.prepare('DELETE FROM retention_mail_permits WHERE site_id=?').run(siteId);}
  return counts;
 }
 function begin(user,input,targets=[],reason='account_erasure'){return store.transaction(()=>{
  active();fresh(store,user);const old=get(user.id);if(old)return receipt(old);
  inspect(user);if(input?.confirmEmail!==user.email||input?.policyVersion!==policy.version)reject('INVALID_INPUT','Patvirtinkite el. paštą ir dabartinę saugojimo tvarką.');
  if(targets.some(t=>t.state!=='sealed'))reject('ORGANIZATION_UNAVAILABLE','Organizacijos perkėlimas dar nebaigtas. Bandykite vėliau.',503);
  const available=tables(store);
  if(db.prepare("SELECT id FROM mail_outbox WHERE site_id=? AND account_id=? AND state='sending'").get(siteId,user.id)||available.has('directory_organization_mail')&&db.prepare("SELECT mail_id FROM directory_organization_mail WHERE site_id=? AND account_id=? AND phase='reserved'").get(siteId,user.id))reject('ERASURE_BUSY','Pradėtas pranešimo pristatymas. Po akimirkos pakartokite pašalinimą.',409);
  backup({force:true});const now=store.clock(),requestId=randomId('erasure'),aliasId='erased_'+randomId('client').slice(7);
  db.prepare('INSERT INTO retention_tombstones VALUES(?,?,?,?,?,?,0,?,?)').run(siteId,user.id,requestId,aliasId,policy.version,now,'processing','{}');
  for(const t of targets)db.prepare('INSERT INTO retention_target_queue VALUES(?,?,?,?,?)').run(siteId,user.id,t.organization_id,t.epoch,'pending');
  accountErasure({clientId:user.id,requestId,occurredAt:now,reason});
  const counts=scrub(user.id,aliasId);db.prepare('UPDATE retention_tombstones SET counts=? WHERE site_id=? AND client_id=?').run(json(counts),siteId,user.id);
  if(!targets.length)complete(user.id);return receipt(get(user.id));
 });}
 function apply(input){return store.transaction(()=>{active();if(!valid(input?.clientId)||!valid(input?.requestId)||!valid(input?.aliasId)||input.policyVersion!==policy.version)reject('INVALID_INPUT','Netinkamas duomenų pašalinimo patvirtinimas.');const old=get(input.clientId);if(old){if(old.request_id!==input.requestId||old.alias_id!==input.aliasId)reject('VERSION_CONFLICT','Pašalinimo tapatybė pasikeitė.',409);return receipt(old);}backup({force:true});db.prepare('INSERT INTO retention_tombstones VALUES(?,?,?,?,?,?,0,?,?)').run(siteId,input.clientId,input.requestId,input.aliasId,policy.version,store.clock(),'processing','{}');accountErasure({clientId:input.clientId,requestId:input.requestId,occurredAt:store.clock(),reason:'account_erasure'});const counts=scrub(input.clientId,input.aliasId);db.prepare('UPDATE retention_tombstones SET counts=? WHERE site_id=? AND client_id=?').run(json(counts),siteId,input.clientId);complete(input.clientId);return receipt(get(input.clientId));});}
 function complete(clientId){db.prepare("UPDATE retention_tombstones SET state='completed',completed_at=? WHERE site_id=? AND client_id=?").run(store.clock(),siteId,clientId);}
 function sweep({confirmedSourceCopies=[]}={}){return store.transaction(()=>{
  active();backup();const now=store.clock(),d=store.read(),historyBefore=monthsBefore(now,policy.historyMonths),textBefore=monthsBefore(now,policy.messagesMonths),allowed=o=>!o||store.organizationWritable(o)||confirmedSourceCopies.includes(o),ended=b=>Date.parse(b.cancelledAt||b.endAt),futureClient=new Set(d.bookings.filter(b=>b.status==='confirmed'&&Date.parse(b.endAt)>now).map(b=>b.organizationId+':'+b.clientId)),expiredBookings=new Set(),changedOrganizations=new Set();let removed=0;
  db.prepare('DELETE FROM retention_receipt_access WHERE site_id=? AND expires_at<=?').run(siteId,now);
  const expired=b=>allowed(b.organizationId)&&Number.isFinite(ended(b))&&ended(b)<historyBefore;
  for(const b of d.bookings)if(expired(b)){expiredBookings.add(b.id);changedOrganizations.add(b.organizationId);removed++;}d.bookings=d.bookings.filter(b=>!expiredBookings.has(b.id));
  const latest=new Map();for(const b of d.bookings)if(Date.parse(b.endAt)<=now){const k=b.organizationId+':'+b.clientId;latest.set(k,Math.max(latest.get(k)||0,ended(b)));}
  for(const name of ['messages','clientCards','inquiries','waitlist'])if(Array.isArray(d[name]))d[name]=d[name].filter(r=>{
   if(!allowed(r.organizationId)||futureClient.has(r.organizationId+':'+r.clientId))return true;
   const last=Math.max(latest.get(r.organizationId+':'+r.clientId)||0,Date.parse(r.closedAt||r.updatedAt||r.createdAt)||now);
   if(last>=textBefore)return true;changedOrganizations.add(r.organizationId);removed++;return false;
  });
  // Public reviews may remain until their author removes them; sever a purged
  // visit reference so the author's review cannot identify retained history.
  d.reviews=d.reviews.filter(r=>{if(!expiredBookings.has(r.bookingId))return true;if(!r.approved){removed++;return false;}delete r.bookingId;return true;});
  for(const [k,v]of Object.entries(d.idempotency||{}))if(expiredBookings.has(v?.bookingId))delete d.idempotency[k];
  d.events=d.events.filter(e=>!expiredBookings.has(e.entityId));
  if(removed){const permit=db.prepare('INSERT OR IGNORE INTO retention_writer_permits VALUES(?,?,?)');for(const r of db.prepare('SELECT collection,record_key FROM state_rows WHERE site_id=?').all(siteId))permit.run(siteId,r.collection,r.record_key);try{store.write(d);clearDormantState();}finally{db.prepare('DELETE FROM retention_writer_permits WHERE site_id=?').run(siteId);}
   const available=tables(store);for(const h of db.prepare("SELECT organization_id,handoff_id FROM organization_handoffs WHERE site_id=? AND state='sealed'").all(siteId))if(changedOrganizations.has(h.organization_id)){db.prepare('DELETE FROM organization_handoff_rows WHERE site_id=? AND handoff_id=?').run(siteId,h.handoff_id);if(available.has('organization_handoff_context'))db.prepare('DELETE FROM organization_handoff_context WHERE site_id=? AND organization_id=?').run(siteId,h.organization_id);db.prepare('INSERT OR IGNORE INTO retention_retired_handoffs VALUES(?,?,?)').run(siteId,h.organization_id,now);}
   const a=db.prepare('SELECT organization_id FROM organization_target_authority WHERE site_id=?').get(siteId);if(a&&available.has('organization_stage_rows')){db.prepare('DELETE FROM organization_stage_rows WHERE site_id=?').run(siteId);db.prepare('INSERT OR IGNORE INTO retention_retired_handoffs VALUES(?,?,?)').run(siteId,a.organization_id,now);}
  }
  const completed=db.prepare("SELECT client_id FROM retention_tombstones WHERE site_id=? AND state='completed' AND completed_at<?").all(siteId,monthsBefore(now,policy.receiptMonths));for(const r of completed){db.prepare('DELETE FROM retention_target_queue WHERE site_id=? AND client_id=?').run(siteId,r.client_id);db.prepare('DELETE FROM retention_tombstones WHERE site_id=? AND client_id=?').run(siteId,r.client_id);}
  // Start a conservative activity window for legacy accounts lacking evidence.
  // No inferred historical login date triggers immediate mass account deletion.
  if(!db.prepare('SELECT site_id FROM organization_target_authority WHERE site_id=?').get(siteId))for(const a of db.prepare('SELECT id FROM accounts WHERE site_id=?').all(siteId))db.prepare('INSERT OR IGNORE INTO retention_activity(site_id,account_id,touched_at,notice_at) VALUES(?,?,?,0)').run(siteId,a.id,now);
  return {removed,policyVersion:policy.version};
 });}
 function inactiveCandidates(){active();return db.prepare('SELECT a.*,x.touched_at,x.notice_at,x.notice_mail_id FROM accounts a JOIN retention_activity x ON x.site_id=a.site_id AND x.account_id=a.id WHERE a.site_id=? AND a.operator=0 AND x.touched_at<=? ORDER BY x.touched_at,a.id LIMIT 10').all(siteId,monthsBefore(store.clock()+policy.noticeDays*day,policy.inactiveMonths));}
 function notifyInactive(account){return store.transaction(()=>{
  const now=store.clock(),row=db.prepare('SELECT * FROM retention_activity WHERE site_id=? AND account_id=?').get(siteId,account.id);if(!row||row.notice_at||row.touched_at>monthsBefore(now+policy.noticeDays*day,policy.inactiveMonths))return;
  const id=store.mail({accountId:account.id,recipient:account.email,type:'account-closure-notice',payload:{policyVersion:policy.version,earliestClosureAt:new Date(now+policy.noticeDays*day).toISOString()}});db.prepare('UPDATE retention_activity SET notice_at=?,notice_mail_id=? WHERE site_id=? AND account_id=?').run(now,id,siteId,account.id);
 });}
 function closeInactive(account,targets){
  const current=db.prepare('SELECT * FROM retention_activity WHERE site_id=? AND account_id=?').get(siteId,account.id);if(!current||!current.notice_at||current.notice_at>store.clock()-policy.noticeDays*day||current.touched_at>monthsBefore(store.clock(),policy.inactiveMonths)||db.prepare('SELECT state FROM mail_outbox WHERE site_id=? AND id=?').get(siteId,current.notice_mail_id)?.state!=='accepted')return null;
  return begin({...account,verifiedAt:store.clock()},{confirmEmail:account.email,policyVersion:policy.version},targets,'retention_erasure');
 }
 function restoreEmpty(snapshot,journal,expectedJournalSha256){return store.transaction(()=>{
  active();if(!Array.isArray(journal)||createHash('sha256').update(json(journal)).digest('hex')!==expectedJournalSha256)reject('RESTORE_JOURNAL','Atkūrimui reikia naujausio patvirtinto pašalinimų žurnalo.',409);
  if(snapshot?.schemaVersion!==1||snapshot.siteId!==siteId||snapshot.policyVersion!==policy.version||snapshot.at<=store.clock()-policy.backupDays*day||snapshot.at>store.clock())reject('RESTORE_SCOPE','Kopijos tapatybė arba terminas netinka.',409);
  if(db.prepare('SELECT id FROM accounts WHERE site_id=?').get(siteId)||db.prepare('SELECT organization_id FROM organization_handoffs WHERE site_id=?').get(siteId)||db.prepare('SELECT site_id FROM organization_target_authority WHERE site_id=?').get(siteId)||store.readCollections(['organizations']).organizations.length)reject('RESTORE_NOT_EMPTY','Importas leidžiamas tik į izoliuotą tuščią saugyklą. Aktyvūs rašytojai neatsukami.',409);
  store.write(snapshot.state);for(const a of snapshot.accounts)db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(a.id,siteId,a.email,a.name,a.operator,a.created_at);
  // Restore never imports sessions, OTP, unsent mail or notification jobs. The
  // current alarm regenerates only genuinely future notifications after replay.
  for(const t of journal){if(!valid(t.client_id)||!valid(t.request_id)||!valid(t.alias_id)||t.policy_version!==policy.version)reject('RESTORE_JOURNAL','Netinkamas pašalinimų žurnalo įrašas.',409);apply({clientId:t.client_id,requestId:t.request_id,aliasId:t.alias_id,policyVersion:t.policy_version});}
  sweep();return {restored:true,tombstonesReplayed:journal.length,mailImported:0,sessionsImported:0};
 });}
 const receipt=r=>({id:r.request_id,state:r.state,policyVersion:r.policy_version,createdAt:r.created_at,completedAt:r.completed_at||null,counts:JSON.parse(r.counts),profileRemoved:true,signInRevoked:true});
 const status=token=>{if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))reject('NOT_FOUND','Pašalinimo kvitas nerastas.',404);const access=db.prepare('SELECT client_id FROM retention_receipt_access WHERE site_id=? AND token_hash=? AND expires_at>?').get(siteId,store.hash(token),store.clock()),r=access&&get(access.client_id);if(!r)reject('NOT_FOUND','Pašalinimo kvitas dar neįrašytas arba prieiga nebegalioja.',404);return {id:r.request_id,state:r.state,policyVersion:r.policy_version,createdAt:r.created_at,completedAt:r.completed_at||null,profileRemoved:true,signInRevoked:true};};
 return {inspect,preview,begin,apply,backup,decodeBackup,snapshot,sweep,inactiveCandidates,notifyInactive,closeInactive,restoreEmpty,status,get,blocked:id=>!!get(id),policy:policyPublic,
  pending:()=>db.prepare("SELECT q.*,t.request_id,t.alias_id,t.policy_version FROM retention_target_queue q JOIN retention_tombstones t ON t.site_id=q.site_id AND t.client_id=q.client_id WHERE q.site_id=? AND q.state='pending' ORDER BY t.created_at,q.organization_id LIMIT 32").all(siteId),
  acknowledge:row=>store.transaction(()=>{db.prepare("UPDATE retention_target_queue SET state='completed' WHERE site_id=? AND client_id=? AND organization_id=? AND epoch=?").run(siteId,row.client_id,row.organization_id,row.epoch);if(!db.prepare("SELECT client_id FROM retention_target_queue WHERE site_id=? AND client_id=? AND state='pending'").get(siteId,row.client_id))complete(row.client_id);}),
  journal:()=>db.prepare('SELECT client_id,request_id,alias_id,policy_version,created_at,completed_at,state,counts FROM retention_tombstones WHERE site_id=? ORDER BY created_at,client_id').all(siteId),
  unprotect,
 };
}
