import {openRowState} from './row-state.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,existsSync,writeFileSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,createHmac} from 'node:crypto';
import {SITE_ID,initialState,randomId,reject} from './primitives.mjs';
export {SITE_ID,initialState,randomId,reject,ApiError} from './primitives.mjs';
export function openStore({filename=path.resolve(import.meta.dirname,'../runtime/platform.sqlite'),secret=null,clock=()=>Date.now(),siteId=SITE_ID,fixturePreview=false}={}){
  if(siteId!==SITE_ID)reject('SITE_SCOPE','Nežinoma svetainė.',403);
  if(fixturePreview&&(filename===':memory:'||path.basename(filename)!=='platform-preview.sqlite'))throw Error('Fixture API requires its named private preview database');
  if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});
  const secretPath=filename+'.secret';
  if(!secret){if(filename===':memory:')secret=randomBytes(32).toString('hex');else{if(!existsSync(secretPath)){try{writeFileSync(secretPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});chmodSync(secretPath,0o600);}catch(e){if(e.code!=='EEXIST')throw e;}}secret=readFileSync(secretPath,'utf8').trim();}}
  if(secret.length<32)throw Error('Server secret too short');
  const db=new DatabaseSync(filename);try{db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
    db.prepare('INSERT OR IGNORE INTO platform_state(site_id,version,data) VALUES(?,1,?)').run(siteId,JSON.stringify(initialState()));
    const existing=JSON.parse(db.prepare('SELECT data FROM platform_state WHERE site_id=?').get(siteId).data);
    if(existing.isDemo&&!fixturePreview)throw Error('Fixture preview database cannot be opened as real storage');
  }catch(e){db.close();throw e;}
  let transactionDepth=0;
  const transaction=fn=>{const invoke=()=>{const value=fn();if(value?.then)throw Error('SQLite transaction callback must be synchronous');return value;};if(transactionDepth)return invoke();db.exec('BEGIN IMMEDIATE');transactionDepth++;try{const value=invoke();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}finally{transactionDepth--;}};
  let rows;try{rows=openRowState({db,siteId,clock,transaction});}catch(e){db.close();throw e;}
  const validate=data=>{const fictional=data.isDemo!==false||data.organizations.some(o=>o.isDemo||o.id.startsWith('demo-'));if(fictional&&!(fixturePreview&&data.isDemo===true&&data.fixtureRuntime==='server-preview-v1'))throw Error('Fixture data forbidden');};
  const store={db,siteId,clock,filename,fixturePreview,rowStats:rows.stats,organizationRecords:rows.rows,hash:value=>createHmac('sha256',secret).update(String(value)).digest('hex'),
    read:rows.read,readCollections:rows.collections,recordById:rows.recordById,clientRecords:rows.clientRecords,ensureClient:id=>rows.ensureClient(id,validate),readClient:rows.readClient,writeClient:data=>{validate(data);rows.writeClient(data);},readOrganization:rows.readOrganization,writeOrganization:data=>{validate(data);rows.writeOrganization(data);},
    write:data=>{const fictional=data.isDemo!==false||data.organizations.some(o=>o.isDemo||o.id.startsWith('demo-'));if(fictional&&!(fixturePreview&&data.isDemo===true&&data.fixtureRuntime==='server-preview-v1'))throw Error('Fiction cannot enter real storage');rows.write(data);},
    transaction,assertOrganizationWritable:rows.assertOrganizationWritable,organizationWritable:rows.organizationWritable,
    close:()=>db.close(),
    mail:({accountId=null,organizationId=null,bookingId=null,challengeId=null,recipient,type,payload})=>{rows.assertOrganizationWritable(organizationId);const id=randomId('mail');db.prepare('INSERT INTO mail_outbox(id,site_id,account_id,organization_id,booking_id,challenge_id,recipient,type,payload,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,siteId,accountId,organizationId,bookingId,challengeId,recipient,type,JSON.stringify(payload),'captured',clock());return id;},
    capture:challengeId=>{const r=db.prepare('SELECT payload FROM mail_outbox WHERE site_id=? AND challenge_id=? AND type=?').get(siteId,challengeId,'login-code');return r?JSON.parse(r.payload):null;},
    limit:(bucket,max,seconds)=>{const key=store.hash(siteId+':'+bucket),now=clock();const r=db.prepare('INSERT INTO rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN rate_limits.expires_at>? THEN rate_limits.count+1 ELSE 1 END,expires_at=CASE WHEN rate_limits.expires_at>? THEN rate_limits.expires_at ELSE excluded.expires_at END RETURNING count').get(key,now+seconds*1000,now,now);if(r.count>max)reject('RATE_LIMITED','Per daug bandymų. Palaukite ir bandykite dar kartą.',429);},
  };return store;
}
