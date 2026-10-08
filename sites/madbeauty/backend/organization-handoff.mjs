import {createHash,timingSafeEqual} from 'node:crypto';
import {randomId,reject} from './primitives.mjs';

export const organizationCollections=['organizations','locations','practitioners','resources','services','schedules','busyBlocks','bookings','reviews','inquiries','waitlist','holds','messages','revisions','reports','memberships','media','offers','qualifications','procedureRequests','menuGroups','clientLinks','clientCards','accessChanges'];
const tenant=new Set(organizationCollections),maxRows=10000,maxBytes=8*1024*1024,pageBytes=512*1024;
const bytes=value=>Buffer.byteLength(value,'utf8'),rowKey=r=>JSON.stringify([r.collection,r.key]);
const proof=(store,type,value)=>store.hash('organization-handoff-v1:'+type+':'+JSON.stringify(value));
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const digest=rows=>{const hash=createHash('sha256');for(const row of rows)hash.update(JSON.stringify(row)+'\n');return hash.digest('hex');};
export {proof as organizationTransferProof,equal as sameTransferProof,digest as organizationRowsDigest};
const schema=`CREATE TABLE IF NOT EXISTS organization_handoffs(site_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,state TEXT NOT NULL,request_key TEXT NOT NULL,handoff_id TEXT NOT NULL,target_name TEXT NOT NULL,manifest TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(site_id,organization_id));
CREATE TABLE IF NOT EXISTS organization_handoff_rows(site_id TEXT NOT NULL,handoff_id TEXT NOT NULL,ordinal INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(site_id,handoff_id,ordinal));`;

// The source fence is below both legacy/full and indexed writers. An old application
// path cannot keep writing a calendar while its immutable transfer is being read.
export function organizationFence({db,siteId}){
 db.exec(schema);
 db.exec('CREATE TABLE IF NOT EXISTS organization_target_authority(site_id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,state TEXT NOT NULL,manifest TEXT NOT NULL,context_hash TEXT NOT NULL,receipt TEXT NOT NULL,activation TEXT);');
 for(const table of ['mail_outbox','notification_jobs'])for(const [event,row] of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS source_${table}_${event.toLowerCase()} BEFORE ${event} ON ${table}
 WHEN EXISTS(SELECT 1 FROM organization_handoffs WHERE site_id=${row}.site_id AND organization_id=${row}.organization_id AND state!='aborted')
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_MIGRATING'); END;`);
 db.exec(`CREATE TABLE IF NOT EXISTS state_writer_permits(site_id TEXT PRIMARY KEY);
 CREATE TRIGGER IF NOT EXISTS legacy_organization_fence BEFORE UPDATE ON platform_state
 WHEN EXISTS(SELECT 1 FROM organization_handoffs WHERE site_id=NEW.site_id AND state!='aborted') AND NOT EXISTS(SELECT 1 FROM state_writer_permits WHERE site_id=NEW.site_id)
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_MIGRATING'); END;
 CREATE TRIGGER IF NOT EXISTS inserted_organization_fence BEFORE INSERT ON state_rows
 WHEN EXISTS(SELECT 1 FROM organization_handoffs WHERE site_id=NEW.site_id AND state!='aborted' AND (organization_id=NEW.organization_id OR NEW.collection='selectionVersions' AND organization_id=NEW.record_key))
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_MIGRATING'); END;
 CREATE TRIGGER IF NOT EXISTS updated_organization_fence BEFORE UPDATE ON state_rows
 WHEN EXISTS(SELECT 1 FROM organization_handoffs WHERE site_id=NEW.site_id AND state!='aborted' AND (organization_id=NEW.organization_id OR organization_id=OLD.organization_id OR NEW.collection='selectionVersions' AND organization_id=NEW.record_key OR OLD.collection='selectionVersions' AND organization_id=OLD.record_key))
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_MIGRATING'); END;
 CREATE TRIGGER IF NOT EXISTS deleted_organization_fence BEFORE DELETE ON state_rows
 WHEN EXISTS(SELECT 1 FROM organization_handoffs WHERE site_id=OLD.site_id AND state!='aborted' AND (organization_id=OLD.organization_id OR OLD.collection='selectionVersions' AND organization_id=OLD.record_key))
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_MIGRATING'); END;`);
 // A materialized target remains fenced until a signed source commit is accepted.
 // After that it can never become another organization's writer or edit global preferences.
 for(const [event,row] of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS target_state_${event.toLowerCase()} BEFORE ${event} ON state_rows
 WHEN EXISTS(SELECT 1 FROM organization_target_authority AS a WHERE a.site_id=${row}.site_id AND (a.state!='active' OR ${row}.organization_id IS NOT NULL AND ${row}.organization_id!=a.organization_id OR ${row}.collection='selectionVersions' AND ${row}.record_key!=a.organization_id OR ${row}.collection IN ('preferences','taxonomy','taxonomyChanges','taxonomyVersion','dataRequests')))
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_TARGET_FENCED'); END;`);
 db.exec(`CREATE TRIGGER IF NOT EXISTS target_legacy_fence BEFORE UPDATE ON platform_state
 WHEN EXISTS(SELECT 1 FROM organization_target_authority WHERE site_id=NEW.site_id) AND NOT EXISTS(SELECT 1 FROM state_writer_permits WHERE site_id=NEW.site_id)
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_TARGET_FENCED'); END;`);
 for(const [event,row] of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS target_mail_${event.toLowerCase()} BEFORE ${event} ON mail_outbox
 WHEN EXISTS(SELECT 1 FROM organization_target_authority AS a WHERE a.site_id=${row}.site_id AND (a.state!='active' OR ${row}.organization_id IS NULL OR ${row}.organization_id!=a.organization_id))
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_TARGET_FENCED'); END;`);
 for(const [event,row] of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS target_job_${event.toLowerCase()} BEFORE ${event} ON notification_jobs
 WHEN EXISTS(SELECT 1 FROM organization_target_authority AS a WHERE a.site_id=${row}.site_id AND (a.state!='active' OR ${row}.organization_id!=a.organization_id))
 BEGIN SELECT RAISE(ABORT,'ORGANIZATION_TARGET_FENCED'); END;`);
 for(const [event,row] of [['INSERT','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS target_account_${event.toLowerCase()} BEFORE ${event} ON accounts
 WHEN EXISTS(SELECT 1 FROM organization_target_authority WHERE site_id=${row}.site_id)
 BEGIN SELECT RAISE(ABORT,'GLOBAL_IDENTITY_REQUIRED'); END;`);
 db.exec(`CREATE TRIGGER IF NOT EXISTS target_account_update BEFORE UPDATE ON accounts
 WHEN EXISTS(SELECT 1 FROM organization_target_authority AS a WHERE a.site_id=OLD.site_id AND (a.state!='active' OR NEW.operator!=0 OR NEW.id!=OLD.id OR NEW.email!=OLD.email OR NEW.site_id!=OLD.site_id))
 BEGIN SELECT RAISE(ABORT,'GLOBAL_IDENTITY_REQUIRED'); END;`);
 const status=id=>db.prepare('SELECT state FROM organization_handoffs WHERE site_id=? AND organization_id=?').get(siteId,id)?.state;
 const target=()=>db.prepare('SELECT organization_id,state FROM organization_target_authority WHERE site_id=?').get(siteId);
 const assertWritable=id=>{const own=target();if(own&&(id!==own.organization_id||own.state!=='active'))reject('ORGANIZATION_MIGRATING','Ši organizacijos saugykla dar nepriima pakeitimų.',503);const state=id&&status(id);if(state&&state!=='aborted')reject('ORGANIZATION_MIGRATING','Organizacijos duomenys perkeliami. Bandykite dar kartą vėliau.',503);};
 const organizationOf=(collection,key,raw)=>{
  const v=JSON.parse(raw);if(collection==='organizations')return v?.id;if(v?.organizationId)return v.organizationId;
  if(collection==='selectionVersions')return key;
  if(collection==='idempotency')return replayOrganizations(db,siteId,v);
  return null;
 };
 const assertRows=(changes,removed)=>{
  if(!target()&&!db.prepare("SELECT organization_id FROM organization_handoffs WHERE site_id=? AND state!='aborted' LIMIT 1").get(siteId))return;
  const ids=new Set();for(const row of [...changes,...removed])for(const shape of [row,row.prior].filter(Boolean)){
   const id=organizationOf(shape.collection,shape.key??shape.record_key,shape.raw??shape.data);for(const value of Array.isArray(id)?id:[id])if(value)ids.add(value);
  }for(const id of ids)assertWritable(id);
 };
 // Only row-capable writers reach this after validating the complete patch.
 // The permit is inserted/deleted within that same synchronous transaction,
 // so an older JSON writer never observes a committed bypass permission.
 const mirrorWrite=fn=>{db.prepare('INSERT INTO state_writer_permits VALUES(?)').run(siteId);try{return fn();}finally{db.prepare('DELETE FROM state_writer_permits WHERE site_id=?').run(siteId);}};
 return {assertWritable,assertRows,mirrorWrite,isWritable:id=>{const own=target(),state=id&&status(id);return (!own||own.organization_id===id&&own.state==='active')&&(!state||state==='aborted');}};
}

// Old replay records have no organizationId. Resolve their stored entity references
// through primary keys; never copy all of a shared owner's cross-salon replays.
function replayOrganizations(db,siteId,value){
 const ids=new Set(value?.organizationId?[value.organizationId]:[]);
 const refs=[['bookings',value?.bookingId],['holds',value?.holdId],['waitlist',value?.waitlistId],['reports',value?.reportId],...(value?.offerIds||[]).map(id=>['offers',id]),...(value?.result?.offers||[]).map(o=>['offers',o.id])];
 for(const [collection,id] of refs)if(typeof id==='string'){const row=db.prepare('SELECT organization_id FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').get(siteId,collection,'id:'+id);if(row?.organization_id)ids.add(row.organization_id);}
 return [...ids];
}
const requireOperator=(store,input)=>{const actor=store.db.prepare('SELECT id FROM accounts WHERE site_id=? AND id=? AND operator=1').get(store.siteId,input?.operatorAccountId);if(!actor)reject('FORBIDDEN','Operatoriaus prieiga neleidžiama.',403);};
const identity=input=>{if(typeof input?.organizationId!=='string'||!input.organizationId||input.organizationId.length>160||!Number.isSafeInteger(input.epoch)||input.epoch<0)reject('INVALID_INPUT','Netinkama perkėlimo tapatybė.');};

// Control-plane only. This exports a fenced, bounded calendar snapshot. It grants
// no target write authority and is deliberately absent from the browser API.
export function createOrganizationHandoff(store){
 const {db,siteId}=store;db.exec(schema);
 const get=id=>db.prepare('SELECT * FROM organization_handoffs WHERE site_id=? AND organization_id=?').get(siteId,id);
 const publicStatus=row=>row?{organizationId:row.organization_id,epoch:row.epoch,state:row.state,handoffId:row.handoff_id,targetName:row.target_name,manifest:JSON.parse(row.manifest)}:{epoch:0,state:'source'};
 const current=input=>{requireOperator(store,input);identity(input);const row=get(input.organizationId);if(!row||row.epoch!==input.epoch||row.handoff_id!==input.handoffId)reject('VERSION_CONFLICT','Perkėlimo versija pasikeitė.',409);return row;};
 function freeze(input){return store.transaction(()=>{
  requireOperator(store,input);identity(input);if(typeof input.requestKey!=='string'||!input.requestKey.trim()||input.requestKey.length>160)reject('INVALID_INPUT','Netinkamas perkėlimo raktas.');
  const prior=get(input.organizationId);if(prior?.state==='frozen'&&prior.request_key===input.requestKey)return publicStatus(prior);
  if((prior?.epoch||0)!==input.epoch||prior&&prior.state!=='aborted')reject('VERSION_CONFLICT','Perkėlimo versija pasikeitė.',409);
  if(!store.recordById('organizations',input.organizationId))reject('NOT_FOUND','Organizacija nerasta.',404);
  if(db.prepare("SELECT id FROM mail_outbox WHERE site_id=? AND organization_id=? AND state='sending' LIMIT 1").get(siteId,input.organizationId))reject('HANDOFF_BUSY','Palaukite, kol baigsis pradėtas laiško siuntimas.',409);
  const metadata=db.prepare('SELECT fields,version FROM state_row_metadata WHERE site_id=?').get(siteId),fields=JSON.parse(metadata.fields),rows=[],accounts=new Set(),seen=new Set();let totalBytes=0;
  const add=r=>{const value={collection:r.collection,key:r.record_key,position:r.position,raw:r.data},key=rowKey(value);if(seen.has(key))return;seen.add(key);const length=bytes(JSON.stringify(value)+'\n');if(rows.length>=maxRows||totalBytes+length>maxBytes)reject('CAPACITY','Perkėlimo apimtis viršija vieno paketo ribą.',503);rows.push(value);totalBytes+=length;const data=JSON.parse(r.data);for(const id of [data?.clientId,data?.accountId,data?.ownerId])if(typeof id==='string')accounts.add(id);};
  for(const collection of [...organizationCollections,'events']){
   let position=-1;while(true){const batch=db.prepare('SELECT collection,record_key,position,data FROM state_rows WHERE site_id=? AND collection=? AND organization_id=? AND position>? ORDER BY position LIMIT 128').all(siteId,collection,input.organizationId,position);for(const r of batch)add(r);if(batch.length<128)break;position=batch.at(-1).position;}
  }
  for(const r of db.prepare('SELECT collection,record_key,position,data FROM state_rows WHERE site_id=? AND collection=? AND record_key=?').all(siteId,'selectionVersions',input.organizationId))add(r);
  for(const accountId of accounts){
   let key=accountId+':';while(true){const batch=db.prepare('SELECT collection,record_key,position,data FROM state_rows WHERE site_id=? AND collection=? AND record_key>? AND record_key<? ORDER BY record_key LIMIT 128').all(siteId,'idempotency',key,accountId+':\uffff');for(const r of batch){const owners=replayOrganizations(db,siteId,JSON.parse(r.data));if(owners.includes(input.organizationId)){if(owners.some(id=>id!==input.organizationId))reject('HANDOFF_SCOPE','Pakartojimo įrašas sieja kelias organizacijas.',409);add(r);}}if(batch.length<128)break;key=batch.at(-1).record_key;}
  }
  rows.sort((a,b)=>a.collection.localeCompare(b.collection)||a.position-b.position||a.key.localeCompare(b.key));
  const handoffId=randomId('handoff'),epoch=input.epoch+1,targetName='madbeauty:organization:v1:'+input.organizationId;
  const body={schemaVersion:1,siteId,sourceName:'madbeauty-pilot-v1',organizationId:input.organizationId,epoch,handoffId,targetName,sourceVersion:metadata.version,fields:fields.filter(f=>tenant.has(f.collection)||['events','idempotency','selectionVersions'].includes(f.collection)),rows:rows.length,bytes:totalBytes,sha256:digest(rows),mode:'read-only-staging'};
  const manifest={...body,proof:proof(store,'manifest',body)},now=store.clock();
  db.prepare('INSERT INTO organization_handoffs(site_id,organization_id,epoch,state,request_key,handoff_id,target_name,manifest,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(site_id,organization_id) DO UPDATE SET epoch=excluded.epoch,state=excluded.state,request_key=excluded.request_key,handoff_id=excluded.handoff_id,target_name=excluded.target_name,manifest=excluded.manifest,created_at=excluded.created_at,updated_at=excluded.updated_at').run(siteId,input.organizationId,epoch,'frozen',input.requestKey,handoffId,targetName,JSON.stringify(manifest),now,now);
  const insert=db.prepare('INSERT INTO organization_handoff_rows VALUES(?,?,?,?)');for(let ordinal=0;ordinal<rows.length;ordinal++)insert.run(siteId,handoffId,ordinal,JSON.stringify(rows[ordinal]));
  return publicStatus(get(input.organizationId));
 });}
 function page(input){return store.transaction(()=>{
  const row=current(input);if(!['frozen','sealed'].includes(row.state))reject('INVALID_STATE','Perkėlimas neaktyvus.',409);if(!Number.isSafeInteger(input.offset)||input.offset<0)reject('INVALID_INPUT','Netinkamas paketo poslinkis.');const manifest=JSON.parse(row.manifest);if(input.offset>manifest.rows)reject('INVALID_INPUT','Paketo poslinkis per didelis.');
  const records=db.prepare('SELECT ordinal,data FROM organization_handoff_rows WHERE site_id=? AND handoff_id=? AND ordinal>=? ORDER BY ordinal LIMIT 128').all(siteId,row.handoff_id,input.offset),rows=[];let size=0;
  for(const record of records){const length=bytes(record.data);if(rows.length&&size+length>pageBytes)break;rows.push(JSON.parse(record.data));size+=length;}
  const body={manifest,offset:input.offset,nextOffset:input.offset+rows.length,done:input.offset+rows.length===manifest.rows,rows};return {...body,proof:proof(store,'page',body)};
 });}
 function abort(input){return store.transaction(()=>{const row=current(input);if(row.state==='aborted')return publicStatus(row);if(row.state!=='frozen')reject('INVALID_STATE','Perduotos rašymo teisės grąžinti negalima.',409);db.prepare("UPDATE organization_handoffs SET state='aborted',updated_at=? WHERE site_id=? AND organization_id=?").run(store.clock(),siteId,input.organizationId);return publicStatus(get(input.organizationId));});}
 return {status:input=>{requireOperator(store,input);if(typeof input?.organizationId!=='string')reject('INVALID_INPUT','Nenurodyta organizacija.');return publicStatus(get(input.organizationId));},freeze,page,abort};
}

// A separate SQLite object may stage authenticated packets and inspect integrity.
// It cannot confirm, cancel, alter or send mail; routing/authority activation must
// be implemented before this can become a production calendar writer.
export function createOrganizationStaging(store,{targetName}){
 const {db,siteId}=store;db.exec('CREATE TABLE IF NOT EXISTS organization_stage(site_id TEXT PRIMARY KEY,manifest TEXT NOT NULL,state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS organization_stage_rows(site_id TEXT NOT NULL,ordinal INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(site_id,ordinal));');
 const get=()=>db.prepare('SELECT * FROM organization_stage WHERE site_id=?').get(siteId);
 function accept(packet){return store.transaction(()=>{
  const {proof:signature,...body}=packet||{},manifest=body.manifest,{proof:manifestProof,...unsigned}=manifest||{};
  if(!equal(signature,proof(store,'page',body))||!equal(manifestProof,proof(store,'manifest',unsigned)))reject('FORBIDDEN','Perkėlimo paketas nepatvirtintas.',403);
  if(manifest.schemaVersion!==1||manifest.mode!=='read-only-staging'||manifest.siteId!==siteId||manifest.targetName!==targetName||targetName!=='madbeauty:organization:v1:'+manifest.organizationId||!Number.isSafeInteger(manifest.epoch)||manifest.epoch<1||!Number.isSafeInteger(manifest.rows)||manifest.rows<1||manifest.rows>maxRows||!Number.isSafeInteger(manifest.bytes)||manifest.bytes>maxBytes||!Array.isArray(body.rows)||body.rows.length>128||!Number.isSafeInteger(body.offset)||body.offset<0||body.nextOffset!==body.offset+body.rows.length||body.nextOffset>manifest.rows||body.done!==(body.nextOffset===manifest.rows))reject('HANDOFF_SCOPE','Perkėlimo paketo tapatybė netinkama.',409);
  const authority=db.prepare('SELECT manifest FROM organization_target_authority WHERE site_id=?').get(siteId);if(authority&&authority.manifest!==JSON.stringify(manifest))reject('VERSION_CONFLICT','Parengtos organizacijos kopijos pakeisti negalima.',409);
  let existing=get();if(existing&&existing.manifest!==JSON.stringify(manifest)){
   const prior=JSON.parse(existing.manifest);if(!['receiving','ready-read-only'].includes(existing.state)||prior.organizationId!==manifest.organizationId||manifest.epoch<=prior.epoch)reject('VERSION_CONFLICT','Ši saugykla jau turi kitą perkėlimo versiją.',409);
   db.prepare('DELETE FROM organization_stage_rows WHERE site_id=?').run(siteId);db.prepare('DELETE FROM organization_stage WHERE site_id=?').run(siteId);existing=null;
  }
  if(!existing)db.prepare('INSERT INTO organization_stage VALUES(?,?,?)').run(siteId,JSON.stringify(manifest),'receiving');
  const insert=db.prepare('INSERT INTO organization_stage_rows VALUES(?,?,?)'),fields=new Map(manifest.fields.map(f=>[f.collection,f.kind]));let pageSize=0;
  for(let n=0;n<body.rows.length;n++){
   const row=body.rows[n],value=JSON.parse(row.raw),ordinal=body.offset+n,raw=JSON.stringify(row);pageSize+=bytes(raw);
   if(!fields.has(row.collection)||!Number.isSafeInteger(row.position)||row.position<0||typeof row.key!=='string'||bytes(row.raw)>128*1024||tenant.has(row.collection)&&(row.collection==='organizations'?value?.id:value?.organizationId)!==manifest.organizationId||row.collection==='selectionVersions'&&row.key!==manifest.organizationId||!tenant.has(row.collection)&&!['events','idempotency','selectionVersions'].includes(row.collection))reject('HANDOFF_SCOPE','Paketo įrašas priklauso kitai apimčiai.',409);
   const prior=db.prepare('SELECT data FROM organization_stage_rows WHERE site_id=? AND ordinal=?').get(siteId,ordinal);if(prior){if(prior.data!==raw)reject('VERSION_CONFLICT','Pakartotas paketas pasikeitė.',409);}else insert.run(siteId,ordinal,raw);
  }
  if(pageSize>pageBytes+256*1024)reject('CAPACITY','Perkėlimo paketas per didelis.',503);
  const count=db.prepare('SELECT COUNT(*) AS n FROM organization_stage_rows WHERE site_id=?').get(siteId).n;
  if(count===manifest.rows){const rows=db.prepare('SELECT data FROM organization_stage_rows WHERE site_id=? ORDER BY ordinal').all(siteId).map(r=>JSON.parse(r.data));const keys=new Set(rows.map(rowKey)),size=rows.reduce((n,r)=>n+bytes(JSON.stringify(r)+'\n'),0);if(keys.size!==rows.length||size!==manifest.bytes||digest(rows)!==manifest.sha256)reject('HANDOFF_INTEGRITY','Perkėlimo kontrolinė suma nesutampa.',409);db.prepare("UPDATE organization_stage SET state='ready-read-only' WHERE site_id=?").run(siteId);}
  return summary();
 });}
 function summary(){const row=get();if(!row)return {state:'empty',writeAuthority:false,rows:0};const manifest=JSON.parse(row.manifest);return {state:row.state,writeAuthority:false,organizationId:manifest.organizationId,epoch:manifest.epoch,handoffId:manifest.handoffId,sha256:manifest.sha256,rows:db.prepare('SELECT COUNT(*) AS n FROM organization_stage_rows WHERE site_id=?').get(siteId).n};}
 return {accept,summary};
}
