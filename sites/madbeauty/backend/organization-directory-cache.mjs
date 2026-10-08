import {reject} from './primitives.mjs';
import {organizationTransferProof as proof} from './organization-handoff.mjs';
import {REMINDER_LEADS} from './notifications.mjs';

const json=JSON.stringify,maxBytes=1024*1024;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k));
const invalid=()=>reject('DIRECTORY_CONTEXT_INVALID','Centrinės paskyros duomenys nepatvirtinti.',403);

// Private source cache issuer. The authenticated caller supplies an account ID,
// never account data. Sequence allocation and the SQL snapshot are synchronous.
export function createDirectoryCacheIssuer(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS directory_cache_issues(site_id TEXT PRIMARY KEY,sequence INTEGER NOT NULL);');
 return {issue:(accountId,recipientId=null)=>store.transaction(()=>{
  const accounts=[],clients=[],preferences=[];
  if(recipientId&&(!accountId||!validId(recipientId)))invalid();
  for(const id of new Set([accountId,recipientId].filter(Boolean))){
   const account=db.prepare('SELECT id,site_id,email,name,created_at FROM accounts WHERE site_id=? AND id=?').get(siteId,id),client=store.recordById('clients',id);
   if(!account||!client||client.accountId!==account.id||client.email!==account.email)invalid();
   accounts.push({...account,operator:0});clients.push({id:client.id,accountId:client.accountId,email:client.email,name:client.name,version:client.version});
   preferences.push(...store.clientRecords('preferences',id));
  }
  const sequence=(db.prepare('SELECT sequence FROM directory_cache_issues WHERE site_id=?').get(siteId)?.sequence||0)+1;
  if(!Number.isSafeInteger(sequence))reject('CAPACITY','Centrinės paskyros versijų riba pasiekta.',503);
  const cache={schemaVersion:1,siteId,sequence,accounts,clients,preferences,...(recipientId?{recipientId}:{}),taxonomy:store.readCollections(['taxonomy','taxonomyChanges','taxonomyVersion'])};
  if(Buffer.byteLength(json(cache))>maxBytes)reject('CAPACITY','Centrinių duomenų paketas per didelis.',503);
  db.prepare('INSERT INTO directory_cache_issues VALUES(?,?) ON CONFLICT(site_id) DO UPDATE SET sequence=excluded.sequence').run(siteId,sequence);
  return JSON.parse(json(cache));
 })};
}

// This is a cache of source-owned data, admitted only inside a verified command
// and its calendar transaction. It cannot create sessions or operator accounts.
export function createDirectoryCacheReceiver(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS organization_directory_cache(site_id TEXT PRIMARY KEY,epoch INTEGER NOT NULL,sequence INTEGER NOT NULL,hash TEXT NOT NULL);');
 return {apply:(cache,actor,epoch,{method,input={}}={})=>{
  const identity=['createClient','grantMembership'].includes(method),recipientId=cache?.recipientId;
  if(identity&&(!actor||!validId(recipientId))||!identity&&recipientId!==undefined)invalid();
  const ids=new Set([actor?.id,recipientId].filter(Boolean));
  if(!keys(cache,['schemaVersion','siteId','sequence','accounts','clients','preferences','recipientId','taxonomy'])||cache.schemaVersion!==1||cache.siteId!==siteId||!Number.isSafeInteger(cache.sequence)||cache.sequence<1||Buffer.byteLength(json(cache))>maxBytes||!Array.isArray(cache.accounts)||!Array.isArray(cache.clients)||!Array.isArray(cache.preferences)||cache.accounts.length!==ids.size||cache.clients.length!==cache.accounts.length||cache.preferences.length>ids.size||!keys(cache.taxonomy,['taxonomy','taxonomyChanges','taxonomyVersion'])||!Array.isArray(cache.taxonomy.taxonomy)||cache.taxonomy.taxonomyChanges!==undefined&&!Array.isArray(cache.taxonomy.taxonomyChanges))invalid();
  const selected=new Set();
  for(let n=0;n<cache.accounts.length;n++){
   const account=cache.accounts[n],client=cache.clients[n];
   if(!keys(account,['id','site_id','email','name','operator','created_at'])||!validId(account.id)||!ids.has(account.id)||selected.has(account.id)||account.site_id!==siteId||typeof account.email!=='string'||typeof account.name!=='string'||account.name.length>80||account.operator!==0||!Number.isSafeInteger(account.created_at)||!keys(client,['id','accountId','email','name','version'])||client.id!==account.id||client.accountId!==account.id||client.email!==account.email||typeof client.name!=='string'||client.name.length>80||!Number.isSafeInteger(client.version)||client.version<1)invalid();
   if(account.id===actor?.id&&(account.email!==actor.email||account.name!==actor.name))invalid();
   if(account.id===recipientId&&(typeof input.email!=='string'||account.email!==input.email.trim().toLowerCase()))invalid();
   selected.add(account.id);
  }
  const preferenceIds=new Set();
  for(const p of cache.preferences){
   if(!keys(p,['id','clientId','service','marketing','reminderLeadMin','updatedAt'])||!ids.has(p.clientId)||preferenceIds.has(p.clientId)||p.id!==p.clientId+'-preferences'||typeof p.service!=='boolean'||typeof p.marketing!=='boolean'||!REMINDER_LEADS.includes(p.reminderLeadMin))invalid();
   preferenceIds.add(p.clientId);
  }
  const hash=proof(store,'directory-cache',cache),old=db.prepare('SELECT epoch,sequence,hash FROM organization_directory_cache WHERE site_id=?').get(siteId);
  if(old&&(old.epoch!==epoch||old.sequence>cache.sequence||old.sequence===cache.sequence&&old.hash!==hash))reject('STALE_DIRECTORY_CONTEXT','Centrinės paskyros duomenys pasikeitė. Pakartokite užklausą.',409);
  if(old?.sequence===cache.sequence)return;
  const data=store.readDirectoryCache([...ids]);
  Object.assign(data,cache.taxonomy,{clients:cache.clients,preferences:cache.preferences});
  store.writeDirectoryCache(data,cache.accounts);
  db.prepare('INSERT INTO organization_directory_cache VALUES(?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET epoch=excluded.epoch,sequence=excluded.sequence,hash=excluded.hash').run(siteId,epoch,cache.sequence,hash);
 }};
}

// A confirmed booking may change the name entered by its authenticated client.
// Persist that effect with the booking so a lost directory reply can recover it.
export function createDirectoryIdentityEffects(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS organization_directory_identity_effects(site_id TEXT NOT NULL,booking_id TEXT NOT NULL,account_id TEXT NOT NULL,base_version INTEGER NOT NULL,name TEXT NOT NULL,version INTEGER NOT NULL,PRIMARY KEY(site_id,booking_id)); CREATE TABLE IF NOT EXISTS directory_identity_receipts(site_id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,booking_id TEXT NOT NULL,state TEXT NOT NULL,PRIMARY KEY(site_id,organization_id,epoch,booking_id));');
 return {
  capture:(bookingId,before,after)=>{
   if(before&&after&&before.version!==after.version)db.prepare('INSERT INTO organization_directory_identity_effects VALUES(?,?,?,?,?,?) ON CONFLICT(site_id,booking_id) DO NOTHING').run(siteId,bookingId,after.id,before.version,after.name,after.version);
   const row=db.prepare('SELECT account_id,base_version,name,version FROM organization_directory_identity_effects WHERE site_id=? AND booking_id=?').get(siteId,bookingId);
   return row?{bookingId,accountId:row.account_id,baseVersion:row.base_version,name:row.name,version:row.version}:null;
  },
  accept:(transfer,effect,actor,result)=>{
   if(!effect)return;
   if(!keys(effect,['bookingId','accountId','baseVersion','name','version'])||effect.bookingId!==result?.id||effect.accountId!==actor?.id||!Number.isSafeInteger(effect.baseVersion)||effect.baseVersion<1||effect.version!==effect.baseVersion+1||typeof effect.name!=='string'||!effect.name.trim()||effect.name.length>80)invalid();
   if(db.prepare('SELECT state FROM directory_identity_receipts WHERE site_id=? AND organization_id=? AND epoch=? AND booking_id=?').get(siteId,transfer.organization_id,transfer.epoch,effect.bookingId))return;
   const data=store.readClient(effect.accountId),client=data.clients[0];if(!client)invalid();
   let state='superseded';
   if(client.version===effect.baseVersion){client.name=effect.name;client.version=effect.version;db.prepare('UPDATE accounts SET name=? WHERE site_id=? AND id=?').run(effect.name,siteId,effect.accountId);store.writeClient(data);state='applied';}
   db.prepare('INSERT INTO directory_identity_receipts VALUES(?,?,?,?,?)').run(siteId,transfer.organization_id,transfer.epoch,effect.bookingId,state);
  }
 };
}
