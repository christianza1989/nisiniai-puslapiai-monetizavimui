// Transactional appointment reminders. This module never performs network I/O.
export const REMINDER_LEADS=[0,120,1440];
export function synchronizeReminders(store,d){
 const {db,siteId}=store,now=store.clock(),current=new Map();
 for(const b of d.bookings){
  const pref=d.preferences.find(p=>p.clientId===b.clientId),lead=pref?.reminderLeadMin??1440;
  if(b.status!=='confirmed'||Date.parse(b.startAt)<=now||pref?.service===false||!lead)continue;
  const due=Date.parse(b.startAt)-lead*60000,id='notice_'+store.hash(`${b.id}:${b.version}:${lead}`),created=Date.parse(b.createdAt||'');
  current.set(id,{b,lead,due});
  const initial=!Number.isFinite(created)||created>due?'missed':'planned';
  db.prepare('INSERT OR IGNORE INTO notification_jobs(id,site_id,organization_id,booking_id,booking_version,lead_min,due_at,state,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,siteId,b.organizationId,b.id,b.version,lead,due,initial,now);
 }
 const jobs=d.organizationContext?db.prepare("SELECT * FROM notification_jobs WHERE site_id=? AND organization_id=? AND state IN ('planned','queued','suppressed')").all(siteId,d.organizationContext):db.prepare("SELECT * FROM notification_jobs WHERE site_id=? AND state IN ('planned','queued','suppressed')").all(siteId);
 for(const job of jobs){
  const value=current.get(job.id);
  if(!value){db.prepare("UPDATE notification_jobs SET state='suppressed' WHERE id=? AND site_id=?").run(job.id,siteId);continue;}
  if(job.state==='suppressed'&&!job.outbox_id){db.prepare("UPDATE notification_jobs SET state='planned' WHERE id=? AND site_id=?").run(job.id,siteId);job.state='planned';}
  if(job.state!=='planned'||job.due_at>now)continue;
  if(now>job.due_at+30*60000){db.prepare("UPDATE notification_jobs SET state='missed' WHERE id=? AND site_id=?").run(job.id,siteId);continue;}
  const {b,lead}=value,client=d.clients.find(c=>c.id===b.clientId);if(!client)continue;
  const outboxId=store.mail({accountId:client.id,organizationId:b.organizationId,bookingId:b.id,recipient:client.email,type:'reminder',payload:{notificationId:job.id,bookingId:b.id,bookingVersion:b.version,leadMin:lead,startAt:b.startAt,endAt:b.endAt,status:b.status}});
  db.prepare("UPDATE notification_jobs SET state='queued',outbox_id=? WHERE id=? AND site_id=?").run(outboxId,job.id,siteId);
 }
}
export function reminderValid(store,row,payload){
 if(row.type!=='reminder')return true;
 const job=store.db.prepare('SELECT state,outbox_id FROM notification_jobs WHERE id=? AND site_id=?').get(payload.notificationId,store.siteId);
 const b=store.recordById('bookings',row.booking_id),pref=b?store.clientRecords('preferences',b.clientId)[0]:null;
 return !!job&&job.state==='queued'&&job.outbox_id===row.id&&!!b&&b.status==='confirmed'&&b.version===payload.bookingVersion&&b.startAt===payload.startAt&&Date.parse(b.startAt)>store.clock()&&pref?.service!==false&&(pref?.reminderLeadMin??1440)===payload.leadMin;
}
export function nextReminderAt(store){return store.db.prepare("SELECT MIN(due_at) AS due FROM notification_jobs AS jobs WHERE site_id=? AND state='planned' AND NOT EXISTS (SELECT 1 FROM organization_handoffs AS h WHERE h.site_id=jobs.site_id AND h.organization_id=jobs.organization_id AND h.state!='aborted')").get(store.siteId)?.due||null;}
