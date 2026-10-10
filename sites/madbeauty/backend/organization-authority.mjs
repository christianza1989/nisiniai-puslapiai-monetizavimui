import {createHash} from 'node:crypto';
import {initialState,randomId,reject} from './primitives.mjs';
import {createOrganizationHandoff,createOrganizationStaging,organizationTransferProof as proof,sameTransferProof as equal,organizationRowsDigest} from './organization-handoff.mjs';
import {organizationMediaManifest,assertOrganizationMediaReady,discardOrganizationMediaStage} from './organization-media.mjs';

const maxContextBytes=1024*1024,maxContextRows=1024;
const raw=v=>JSON.stringify(v),hash=v=>createHash('sha256').update(raw(v)).digest('hex');
const schema=`CREATE TABLE IF NOT EXISTS organization_handoff_context(site_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,packet TEXT NOT NULL,PRIMARY KEY(site_id,organization_id,epoch));
CREATE TABLE IF NOT EXISTS organization_handoff_commits(site_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,token TEXT NOT NULL,PRIMARY KEY(site_id,organization_id,epoch));`;
const signed=(store,type,body)=>({...body,proof:proof(store,type,body)});
function verified(store,type,packet){const {proof:signature,...body}=packet||{};if(!equal(signature,proof(store,type,body)))reject('FORBIDDEN','Perdavimo patvirtinimas netinkamas.',403);return body;}
function relatedIds(records){const ids=new Set();for(const r of records){const v=JSON.parse(r.raw);for(const id of [v?.clientId,v?.accountId,v?.ownerId])if(typeof id==='string')ids.add(id);}return ids;}

// Private control plane, absent from the browser dispatcher. Global identity,
// preferences and taxonomy stay authoritative at the directory/source. The
// target receives only the bounded caches needed for its own retained records.
export function createOrganizationCommit(store){
 const {db,siteId}=store;db.exec(schema);const handoff=createOrganizationHandoff(store);
 db.exec('CREATE INDEX IF NOT EXISTS outbox_organization_transfer ON mail_outbox(site_id,organization_id,id); CREATE INDEX IF NOT EXISTS notification_organization_transfer ON notification_jobs(site_id,organization_id,id);');
 function current(input){const status=handoff.status(input);if(status.epoch!==input.epoch||status.handoffId!==input.handoffId||!['frozen','sealed'].includes(status.state))reject('VERSION_CONFLICT','Perdavimo būsena pasikeitė.',409);return status;}
 function contents(status){
  const records=db.prepare('SELECT data FROM organization_handoff_rows WHERE site_id=? AND handoff_id=? ORDER BY ordinal').all(siteId,status.handoffId).map(r=>JSON.parse(r.data)),ids=relatedIds(records),clients=[],preferences=[],accounts=[];
  if(ids.size>maxContextRows)reject('CAPACITY','Perdavimo tapatybių apimtis per didelė.',503);
  for(const id of [...ids].sort()){
   const c=store.recordById('clients',id),a=db.prepare('SELECT id,site_id,email,name,created_at FROM accounts WHERE site_id=? AND id=?').get(siteId,id);
   if(c)clients.push({id:c.id,accountId:c.accountId||c.id,email:c.email,name:c.name,version:c.version});
   if(a)accounts.push({...a,operator:0});
   preferences.push(...store.clientRecords('preferences',id));
  }
  const outbox=db.prepare('SELECT * FROM mail_outbox WHERE site_id=? AND organization_id=? ORDER BY id LIMIT 1025').all(siteId,status.organizationId),notificationJobs=db.prepare('SELECT * FROM notification_jobs WHERE site_id=? AND organization_id=? ORDER BY id LIMIT 1025').all(siteId,status.organizationId);
  if(outbox.length>maxContextRows||notificationJobs.length>maxContextRows||preferences.length>maxContextRows)reject('CAPACITY','Perdavimo pranešimų apimtis per didelė.',503);
  if(outbox.some(r=>r.state==='sending'||r.type==='login-code'))reject('HANDOFF_BUSY','Pradėtas pranešimo siuntimas dar nebaigtas.',409);
  const mediaManifest=organizationMediaManifest(store,status.manifest);
  return {manifest:status.manifest,clients,preferences,accounts,taxonomy:store.readCollections(['taxonomy','taxonomyChanges','taxonomyVersion']),outbox,notificationJobs,...(mediaManifest?{mediaManifest}:{})};
 }
 function context(input){return store.transaction(()=>{
  if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='retention_retired_handoffs'").get()&&db.prepare('SELECT organization_id FROM retention_retired_handoffs WHERE site_id=? AND organization_id=?').get(siteId,input.organizationId))reject('RETENTION_RETIRED','Istorinis tapatybės paketas pašalintas.',409);
  const status=current(input),existing=db.prepare('SELECT packet FROM organization_handoff_context WHERE site_id=? AND organization_id=? AND epoch=?').get(siteId,status.organizationId,status.epoch);if(existing)return JSON.parse(existing.packet);
  if(status.state!=='frozen')reject('INVALID_STATE','Užbaigto perdavimo kontekstas nerastas.',409);
  const content=JSON.parse(raw(contents(status))),packet=signed(store,'context',{schemaVersion:1,...content,sha256:hash(content)});if(Buffer.byteLength(raw(packet))>maxContextBytes)reject('CAPACITY','Perdavimo kontekstas viršija 1 MiB ribą.',503);
  db.prepare('INSERT INTO organization_handoff_context VALUES(?,?,?,?)').run(siteId,status.organizationId,status.epoch,raw(packet));return packet;
 });}
 function seal(input){return store.transaction(()=>{
  const status=current(input),receipt=verified(store,'target-prepared',input.targetReceipt),m=status.manifest,packet=context(input);
  if(receipt.siteId!==siteId||receipt.organizationId!==status.organizationId||receipt.epoch!==status.epoch||receipt.handoffId!==status.handoffId||receipt.targetName!==status.targetName||receipt.manifestHash!==m.sha256||receipt.contextHash!==packet.sha256||receipt.state!=='prepared')reject('HANDOFF_SCOPE','Parengtos kopijos patvirtinimas nesutampa.',409);
  const prior=db.prepare('SELECT token FROM organization_handoff_commits WHERE site_id=? AND organization_id=? AND epoch=?').get(siteId,status.organizationId,status.epoch);if(prior){const token=JSON.parse(prior.token);if(raw(token.targetReceipt)!==raw(input.targetReceipt))reject('VERSION_CONFLICT','Perdavimo patvirtinimas jau išsaugotas.',409);return token;}
  if(status.state!=='frozen'||hash(contents(status))!==packet.sha256)reject('HANDOFF_CONTEXT_CHANGED','Perdavimo kontekstas pasikeitė. Paruoškite naują kopiją.',409);
  const token=signed(store,'source-commit',{schemaVersion:1,siteId,organizationId:status.organizationId,epoch:status.epoch,handoffId:status.handoffId,targetName:status.targetName,targetReceipt:input.targetReceipt,committedAt:store.clock()});
  db.prepare('INSERT INTO organization_handoff_commits VALUES(?,?,?,?)').run(siteId,status.organizationId,status.epoch,raw(token));
  db.prepare("UPDATE organization_handoffs SET state='sealed',updated_at=? WHERE site_id=? AND organization_id=?").run(store.clock(),siteId,status.organizationId);return token;
 });}
 function abort(input){return store.transaction(()=>{const status=handoff.abort(input);return signed(store,'source-abort',{schemaVersion:1,siteId,organizationId:input.organizationId,epoch:status.epoch,handoffId:status.handoffId,targetName:status.targetName,state:'aborted'});});}
 return {context,seal,abort};
}

// Materializing the copy does not enable writes. The source commits its fence
// first; only that exact signed token may activate the target. There is no
// production binding, HTTP routing, global-auth API or mail alarm here yet.
export function createOrganizationAuthority(store,{targetName}){
 const {db,siteId}=store;const get=()=>db.prepare('SELECT * FROM organization_target_authority WHERE site_id=?').get(siteId);
 function insertRows(table,rows,organizationId){const columns=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(r=>r.name));for(const r of rows){const keys=Object.keys(r);if(r.site_id!==siteId||r.organization_id!==organizationId||keys.some(k=>!columns.has(k)))reject('HANDOFF_SCOPE','Pranešimo apimtis nesutampa.',409);db.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>r[k]));}}
 function prepare(packet){return store.transaction(()=>{
  const body=verified(store,'context',packet),{schemaVersion,sha256,...content}=body,m=content.manifest,staging=createOrganizationStaging(store,{targetName}).summary();
  if(schemaVersion!==1||Buffer.byteLength(raw(packet))>maxContextBytes||hash(content)!==sha256||m?.siteId!==siteId||m.targetName!==targetName||staging.state!=='ready-read-only'||staging.handoffId!==m.handoffId||staging.epoch!==m.epoch||staging.sha256!==m.sha256)reject('HANDOFF_INTEGRITY','Organizacijos kopija dar neparengta.',409);
  if(db.prepare('SELECT manifest FROM organization_stage WHERE site_id=?').get(siteId)?.manifest!==raw(m))reject('HANDOFF_INTEGRITY','Kopijos manifestas pasikeitė.',409);
  const prior=get();if(prior){if(prior.manifest!==raw(m)||prior.context_hash!==sha256)reject('VERSION_CONFLICT','Saugykla jau turi kitą perdavimą.',409);return JSON.parse(prior.receipt);}
  if(db.prepare("SELECT record_key FROM state_rows WHERE site_id=? AND collection NOT IN ('taxonomy','taxonomyChanges','taxonomyVersion','isDemo') LIMIT 1").get(siteId)||store.readCollections(['isDemo']).isDemo!==false||db.prepare('SELECT id FROM accounts LIMIT 1').get()||db.prepare('SELECT id FROM mail_outbox LIMIT 1').get())reject('INVALID_STATE','Tik tuščia organizacijos saugykla priima kopiją.',409);
  const records=db.prepare('SELECT data FROM organization_stage_rows WHERE site_id=? ORDER BY ordinal').all(siteId).map(r=>JSON.parse(r.data));
  if(records.length!==m.rows||new Set(records.map(r=>raw([r.collection,r.key]))).size!==records.length||records.reduce((n,r)=>n+Buffer.byteLength(raw(r)+'\n'),0)!==m.bytes||organizationRowsDigest(records)!==m.sha256)reject('HANDOFF_INTEGRITY','Kopijos įrašai pasikeitė.',409);
  assertOrganizationMediaReady(store,m,records,content.mediaManifest);
  const ids=relatedIds(records);if(!Array.isArray(content.clients)||!Array.isArray(content.accounts)||!Array.isArray(content.preferences)||!Array.isArray(content.outbox)||!Array.isArray(content.notificationJobs)||[content.clients,content.accounts,content.preferences,content.outbox,content.notificationJobs].some(a=>a.length>maxContextRows)||content.clients.some(c=>!ids.has(c.id))||content.accounts.some(a=>!ids.has(a.id)||a.site_id!==siteId||a.operator!==0)||content.preferences.some(p=>!ids.has(p.clientId)))reject('HANDOFF_SCOPE','Perdavimo tapatybės nesutampa.',409);
  if(!content.taxonomy||Object.keys(content.taxonomy).some(k=>!['taxonomy','taxonomyChanges','taxonomyVersion'].includes(k)))reject('HANDOFF_SCOPE','Katalogo kopijos apimtis netinkama.',409);
  const clientIds=new Set(content.clients.map(c=>c.id));for(const r of records){const v=JSON.parse(r.raw),active=r.collection==='bookings'&&v.status==='confirmed'&&Date.parse(v.endAt)>store.clock()||r.collection==='holds'&&v.state==='held'&&Date.parse(v.expiresAt)>store.clock()||r.collection==='waitlist'&&v.criteria&&!['closed','expired'].includes(v.state);if(active&&!clientIds.has(v.clientId||v.accountId))reject('HANDOFF_DEPENDENCY','Trūksta aktyvaus vizito kliento tapatybės.',409);}
  const data=initialState();for(const f of m.fields)data[f.collection]=f.kind==='array'?[]:f.kind==='object'?{}:undefined;
  const kinds=new Map(m.fields.map(f=>[f.collection,f.kind]));for(const r of records){const value=JSON.parse(r.raw);if(kinds.get(r.collection)==='array')data[r.collection].push(value);else if(kinds.get(r.collection)==='object')Object.defineProperty(data[r.collection],r.key,{value,enumerable:true,writable:true,configurable:true});else data[r.collection]=value;}
  Object.assign(data,content.taxonomy,{clients:content.clients,preferences:content.preferences,isDemo:false});
  store.write(data);
  for(const a of content.accounts)db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,0,?)').run(a.id,a.site_id,a.email,a.name,a.created_at);
  insertRows('mail_outbox',content.outbox,m.organizationId);insertRows('notification_jobs',content.notificationJobs,m.organizationId);
  const receipt=signed(store,'target-prepared',{schemaVersion:1,siteId,organizationId:m.organizationId,epoch:m.epoch,handoffId:m.handoffId,targetName,manifestHash:m.sha256,contextHash:sha256,state:'prepared',nonce:randomId('prepared')});
  db.prepare('INSERT INTO organization_target_authority VALUES(?,?,?,?,?,?,?,NULL)').run(siteId,m.organizationId,m.epoch,'prepared',raw(m),sha256,raw(receipt));return receipt;
 });}
 function activate(token){return store.transaction(()=>{
  const body=verified(store,'source-commit',token),row=get();if(!row||body.schemaVersion!==1||body.siteId!==siteId||body.organizationId!==row.organization_id||body.epoch!==row.epoch||body.targetName!==targetName||raw(body.targetReceipt)!==row.receipt||body.handoffId!==JSON.parse(row.manifest).handoffId)reject('HANDOFF_SCOPE','Perdavimo teisė nesutampa su kopija.',409);
  if(row.state==='active'){if(row.activation!==raw(token))reject('VERSION_CONFLICT','Perdavimo teisė pasikeitė.',409);return status();}
  if(row.state!=='prepared')reject('INVALID_STATE','Saugykla dar neparengta.',409);
  db.prepare("UPDATE organization_target_authority SET state='active',activation=? WHERE site_id=?").run(raw(token),siteId);return status();
 });}
 function status(){const row=get();return row?{state:row.state,organizationId:row.organization_id,epoch:row.epoch,handoffId:JSON.parse(row.manifest).handoffId,writeAuthority:row.state==='active',mailAuthority:false}:{state:'empty',writeAuthority:false,mailAuthority:false};}
 function discard(token){return store.transaction(()=>{
  const body=verified(store,'source-abort',token),row=get();if(body.schemaVersion!==1||body.siteId!==siteId||body.targetName!==targetName||body.state!=='aborted')reject('HANDOFF_SCOPE','Atšaukimo apimtis nesutampa.',409);
  if(!row){
   const exists=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organization_media_stage'").get(),stage=exists&&db.prepare('SELECT manifest FROM organization_media_stage WHERE site_id=?').get(siteId);
   if(stage){const m=JSON.parse(stage.manifest);if(m.organizationId!==body.organizationId||m.epoch!==body.epoch||m.handoffId!==body.handoffId)reject('HANDOFF_SCOPE','Atšaukimo apimtis nesutampa.',409);discardOrganizationMediaStage(store);}
   return status();
  }
  if(row.state!=='prepared'||row.organization_id!==body.organizationId||row.epoch!==body.epoch||JSON.parse(row.manifest).handoffId!==body.handoffId)reject('INVALID_STATE','Aktyvios arba kitos kopijos atšaukti negalima.',409);
  db.prepare('DELETE FROM organization_target_authority WHERE site_id=?').run(siteId);
  discardOrganizationMediaStage(store);
  store.write(initialState());for(const table of ['mail_outbox','notification_jobs','accounts','organization_stage_rows','organization_stage'])db.prepare('DELETE FROM '+table+' WHERE site_id=?').run(siteId);
  return status();
 });}
 return {prepare,activate,status,discard};
}
