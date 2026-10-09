import {openRowState} from '../backend/row-state.mjs';
import {createHmac,createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {SITE_ID,initialState,randomId,reject} from '../backend/primitives.mjs';
import schema from '../backend/schema.sql';

export function openDurableStore(ctx,secret,{clock=()=>Date.now(),fixturePreview=false}={}){
 if(typeof secret!=='string'||secret.length<32)throw Error('Production session secret required');
 const sql=ctx.storage.sql;
 const execute=(query,args=[])=>{const cursor=sql.exec(query,...args);const rows=cursor.toArray();return {rows,changes:cursor.rowsWritten};};
 const db={exec:query=>execute(query),prepare:query=>({get:(...args)=>execute(query,args).rows[0],all:(...args)=>execute(query,args).rows,run:(...args)=>({changes:execute(query,args).changes})})};
 ctx.storage.transactionSync(()=>{
  db.exec(schema.replace('PRAGMA foreign_keys = ON;',''));
  db.exec('CREATE TABLE IF NOT EXISTS release_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  if(!db.prepare("SELECT value FROM release_metadata WHERE key='outbox-v1'").get()){
   db.exec('ALTER TABLE mail_outbox ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0; ALTER TABLE mail_outbox ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;');
   db.prepare('INSERT INTO release_metadata(key,value) VALUES(?,?)').run('outbox-v1','1');
  }
  db.prepare('INSERT OR IGNORE INTO platform_state(site_id,version,data) VALUES(?,1,?)').run(SITE_ID,JSON.stringify(initialState()));
 });
 let transactionDepth=0;
 const transaction=fn=>{const invoke=()=>{const value=fn();if(value?.then)throw Error('Synchronous transaction required');return value;};if(transactionDepth)return invoke();return ctx.storage.transactionSync(()=>{transactionDepth++;try{return invoke();}finally{transactionDepth--;}});};
 const rows=openRowState({db,siteId:SITE_ID,clock,transaction});
 const key=createHash('sha256').update(secret+':outbox').digest();
 const seal=data=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);return JSON.stringify({v:1,iv:iv.toString('base64'),tag:null,encrypted:Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]).toString('base64'),...{tag:cipher.getAuthTag().toString('base64')}});};
 const unseal=raw=>{const data=JSON.parse(raw);if(data.v!==1)throw Error('Unrecognized outbox payload');const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(data.iv,'base64'));cipher.setAuthTag(Buffer.from(data.tag,'base64'));return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data.encrypted,'base64')),cipher.final()]).toString('utf8'));};
 if(rows.collections(['isDemo']).isDemo===true&&!fixturePreview)throw Error('Fixture storage cannot be opened as real');
 const validate=data=>{const fictional=data.isDemo!==false||data.organizations.some(o=>o.isDemo||o.id.startsWith('demo-'));if(fictional&&!(fixturePreview===true&&data.isDemo===true&&data.fixtureRuntime==='server-preview-v1'))throw Error('Fixture data forbidden');};
 const store={db,siteId:SITE_ID,clock,fixturePreview:fixturePreview===true,rowStats:rows.stats,organizationRecords:rows.rows,hash:value=>createHmac('sha256',secret).update(String(value)).digest('hex'),
  read:rows.read,readCollections:rows.collections,recordById:rows.recordById,clientRecords:rows.clientRecords,ensureClient:id=>rows.ensureClient(id,validate),readClient:rows.readClient,writeClient:data=>{validate(data);rows.writeClient(data);},readOrganization:rows.readOrganization,writeOrganization:data=>{validate(data);rows.writeOrganization(data);},readCatalogue:rows.readCatalogue,writeCatalogue:data=>{validate(data);rows.writeCatalogue(data);},readDirectoryCache:rows.readDirectoryCache,writeDirectoryCache:(data,accounts)=>{validate(data);rows.writeDirectoryCache(data,accounts);},
  write:data=>{
   validate(data);
   rows.write(data);
  },
  transaction,assertOrganizationWritable:rows.assertOrganizationWritable,organizationWritable:rows.organizationWritable,
  mail:({accountId=null,organizationId=null,bookingId=null,challengeId=null,recipient,type,payload})=>{
   rows.assertOrganizationWritable(organizationId);
   const id=randomId('mail');db.prepare('INSERT INTO mail_outbox(id,site_id,account_id,organization_id,booking_id,challenge_id,recipient,type,payload,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,SITE_ID,accountId,organizationId,bookingId,challengeId,recipient,type,seal(payload),'pending',clock());return id;
  },
  limit:(bucket,max,seconds)=>{
   const now=clock(),key=store.hash(SITE_ID+':'+bucket);const row=db.prepare('INSERT INTO rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN rate_limits.expires_at>? THEN rate_limits.count+1 ELSE 1 END,expires_at=CASE WHEN rate_limits.expires_at>? THEN rate_limits.expires_at ELSE excluded.expires_at END RETURNING count').get(key,now+seconds*1000,now,now);
   if(row.count>max)reject('RATE_LIMITED','Per daug bandymų. Palaukite ir bandykite dar kartą.',429);
  },retryMail:row=>{
   rows.assertOrganizationWritable(row.organization_id);
   if(row.state==='accepted'||row.state==='sending')reject('INVALID_STATE','Priimto arba siunčiamo pranešimo kartoti negalima.',409);
   db.prepare("UPDATE mail_outbox SET state='pending',attempts=0,next_attempt_at=0,lease_until=0 WHERE id=? AND site_id=?").run(row.id,SITE_ID);
   return {id:row.id,state:'pending',attempts:0};
  },unseal,close:()=>{},
 };
 return store;
}
