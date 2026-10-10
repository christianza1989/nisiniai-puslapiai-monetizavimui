import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
import {createSourceUpload,createOrganizationUploadReceiver} from './organization-upload.mjs';
import {createOrganizationHandoff} from './organization-handoff.mjs';
import {createSqlMediaBucket} from '../cloudflare/media-bucket.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fails=(code,fn)=>assert.rejects(fn,e=>e.code===code);
function fixture(){
 const store=openStore({filename:':memory:',secret:'isolated-source-upload-only'.repeat(3)}),api=createPlatform(store),owner={id:'source-upload-owner',email:'source-owner@example.com',name:'Isolated owner'},manager={id:'source-upload-manager',email:'source-manager@example.com',name:'Isolated manager'},foreign={id:'source-upload-foreign',email:'source-foreign@example.com',name:'Isolated foreign'};
 for(const user of [owner,manager,foreign]){store.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,?,?)').run(user.id,store.siteId,user.email,user.name,user===owner?1:0,Date.now());store.ensureClient(user.id);}
 const org=api.createOrganization(owner,{name:'Isolated source upload',kind:'solo',city:'Vilnius',bio:'Atomic source upload acceptance'}),membership=api.grantMembership(owner,{organizationId:org.id,email:manager.email,role:'manager',version:0}),bucket=createSqlMediaBucket(store),input={organizationId:org.id,idempotencyKey:'source-stable-intent',bytes:Buffer.from([1,2,3]),mime:'image/png',usage:'gallery',alt:'Synthetic bytes',rights:'Only isolated fixture'};let transforms=0,after=null;
 const uploader=createSourceUpload(store,{writeObjects:entries=>bucket.putManySync(entries),attach:(user,asset)=>api.attachMedia(user,asset),transformMedia:async(_store,metadata)=>{
  transforms++;const id=metadata.id,variant=Buffer.from([5,6,7]),asset={id,organizationId:org.id,usage:metadata.usage,alt:metadata.alt,rights:metadata.rights,rightsConfirmedAt:metadata.rightsConfirmedAt,rightsConfirmedBy:metadata.rightsConfirmedBy,source:{original:'originals/'+id,mime:metadata.mime,bytes:metadata.bytes.length,sha256:hash(metadata.bytes)},variants:[{storageFile:id+'-32.webp',width:32,height:48,bytes:variant.length,sha256:hash(variant)}]};if(after)after();return {asset,objects:[{key:asset.source.original,value:metadata.bytes,httpMetadata:{contentType:metadata.mime}},{key:'variants/'+asset.variants[0].storageFile,value:variant,httpMetadata:{contentType:'image/webp'}}]};
 }});
 return {store,api,owner,manager,foreign,org,membership,bucket,input,upload:(user=owner,changes={})=>uploader.upload(user,{...input,...changes}),after:fn=>{after=fn;},transforms:()=>transforms};
}
test('Source upload retry recovers one atomic asset, including at the full gallery limit, and rejects changed content and revoked actors',async()=>{
 const f=fixture();try{
  await fails('FORBIDDEN',()=>f.upload(f.foreign));assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM directory_media_uploads').get().n,0);
  const first=await f.upload(f.manager);assert.equal((await f.upload(f.manager)).id,first.id);assert.equal(f.transforms(),1);assert.equal(f.bucket.stats().objects,2);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,1);assert.ok(f.store.db.prepare('SELECT result FROM directory_media_uploads').get().result);
  for(let i=1;i<24;i++)await f.upload(f.manager,{idempotencyKey:'source-fill-gallery-'+i});
  assert.equal(f.bucket.stats().objects,48);assert.equal((await f.upload(f.manager)).id,first.id);await fails('LIMIT',()=>f.upload(f.manager,{idempotencyKey:'source-new-at-limit'}));await fails('IDEMPOTENCY_CONFLICT',()=>f.upload(f.manager,{alt:'Other image intent'}));assert.equal(f.transforms(),24);
  f.api.revokeMembership(f.owner,{id:f.membership.id,version:f.membership.version});await fails('FORBIDDEN',()=>f.upload(f.manager));
 }finally{f.store.close();}
});
test('Source physical-write failure rolls back blobs, profile version, asset and receipt; retry uses the same reserved ID',async()=>{
 const f=fixture(),prepare=f.store.db.prepare.bind(f.store.db);try{
  const version=f.store.recordById('organizations',f.org.id).version;
  f.store.db.prepare=q=>{const statement=prepare(q);return q.startsWith('INSERT INTO media_chunks')?{run:()=>{throw Error('Isolated chunk failure');}}:statement;};
  await assert.rejects(()=>f.upload(),/Isolated chunk failure/);f.store.db.prepare=prepare;assert.equal(f.bucket.stats().objects,0);assert.equal(f.store.organizationRecords('media',f.org.id).length,0);assert.equal(f.store.recordById('organizations',f.org.id).version,version);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,0);assert.equal(f.store.db.prepare('SELECT result FROM directory_media_uploads').get().result,null);
  const reserved=JSON.parse(f.store.db.prepare('SELECT metadata FROM directory_media_uploads').get().metadata);assert.equal((await f.upload()).id,reserved.id);assert.equal(f.bucket.stats().objects,2);
 }finally{f.store.db.prepare=prepare;f.store.close();}
});
test('Source optimization rechecks capability and freeze fence before storing any physical bytes',async()=>{
 for(const reason of ['revoked','frozen']){const f=fixture();try{
  f.after(()=>reason==='revoked'?f.api.revokeMembership(f.owner,{id:f.membership.id,version:f.membership.version}):createOrganizationHandoff(f.store).freeze({operatorAccountId:f.owner.id,organizationId:f.org.id,epoch:0,requestKey:'freeze-upload-pending'}));
  await fails(reason==='revoked'?'FORBIDDEN':'ORGANIZATION_MIGRATING',()=>f.upload(f.manager));assert.equal(f.bucket.stats().objects,0);assert.equal(f.store.organizationRecords('media',f.org.id).length,0);assert.equal(f.store.db.prepare('SELECT result FROM directory_media_uploads').get().result,null);
 }finally{f.store.close();}}
});
test('A transferred asset recovers from its exact private metadata without carrying the source receipt table',async()=>{
 const f=fixture();try{
  const first=await f.upload(f.manager),asset=f.store.recordById('media',first.id),metadata=JSON.parse(f.store.db.prepare('SELECT metadata FROM directory_media_uploads').get().metadata),requestHash=f.store.db.prepare('SELECT fingerprint FROM directory_media_uploads').get().fingerprint;
  f.store.db.prepare('DELETE FROM organization_media_uploads').run();const receiver=createOrganizationUploadReceiver(f.store);
  assert.equal(receiver.access(f.manager,{organizationId:f.org.id,id:metadata.id,requestHash}).result.id,first.id);
  assert.throws(()=>receiver.access(f.owner,{organizationId:f.org.id,id:metadata.id,requestHash}),e=>e.code==='IDEMPOTENCY_CONFLICT');
  f.store.transaction(()=>{const d=f.store.readOrganization(f.org.id);d.media.find(a=>a.id===asset.id).rights='Different private rights';f.store.writeOrganization(d);});assert.throws(()=>receiver.access(f.manager,{organizationId:f.org.id,id:metadata.id,requestHash}),e=>e.code==='IDEMPOTENCY_CONFLICT');
 }finally{f.store.close();}
});
