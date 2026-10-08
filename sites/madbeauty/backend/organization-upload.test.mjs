import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
import {createOrganizationHandoff,createOrganizationStaging} from './organization-handoff.mjs';
import {createOrganizationCommit,createOrganizationAuthority} from './organization-authority.mjs';
import {createOrganizationDirectory,createOrganizationCommand} from './organization-directory.mjs';
import {createSqlMediaBucket} from '../cloudflare/media-bucket.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),now=Date.parse('2026-10-08T10:00:00Z');
function fixture(){
 const options={filename:':memory:',secret:'isolated-upload-fixture-'.repeat(4),clock:()=>now},source=openStore(options),target=openStore(options),api=createPlatform(source),users={};
 for(const role of ['owner','manager','reception','foreign']){const user={id:'upload-'+role,email:role+'@example.com',name:role};users[role]=user;source.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,?,?)').run(user.id,source.siteId,user.email,user.name,role==='owner'?1:0,now);source.ensureClient(user.id);}
 const org=api.createOrganization(users.owner,{name:'Isolated target upload',kind:'solo',city:'Vilnius',bio:'Private binary acceptance.'}),scope={role:'professional',organizationId:org.id};
 const manager=api.grantMembership(users.owner,{organizationId:org.id,email:users.manager.email,role:'manager',version:0});api.grantMembership(users.owner,{organizationId:org.id,email:users.reception.email,role:'reception',version:0});
 const handoff=createOrganizationHandoff(source),frozen=handoff.freeze({operatorAccountId:users.owner.id,organizationId:org.id,epoch:0,requestKey:'upload-handoff'}),control={operatorAccountId:users.owner.id,organizationId:org.id,epoch:frozen.epoch,handoffId:frozen.handoffId},stage=createOrganizationStaging(target,{targetName:frozen.targetName});
 let offset=0;for(;;){const page=handoff.page({...control,offset});stage.accept(page);if(page.done)break;offset=page.nextOffset;}
 const commit=createOrganizationCommit(source),authority=createOrganizationAuthority(target,{targetName:frozen.targetName}),receipt=authority.prepare(commit.context(control));authority.activate(commit.seal({...control,targetReceipt:receipt}));
 const bucket=createSqlMediaBucket(target),command=createOrganizationCommand(target,{targetName:frozen.targetName,writeMediaObjects:entries=>bucket.putManySync(entries)});let lost=false,failWrite=false,tamper=false,transforms=0,afterTransform=null;
 const directory=createOrganizationDirectory(source,{getTarget:()=>({executeDirectoryCommand:packet=>command.execute(packet),storeOrganizationMedia:(packet,objects)=>{if(tamper)objects[0].value[0]^=1;const response=command.execute(packet,objects);if(lost&&!response.error){lost=false;throw Error('Lost committed upload reply');}return response;}})});
 const input={organizationId:org.id,idempotencyKey:'upload-same-intent',mime:'image/png',usage:'gallery',alt:'Isolated synthetic bytes',rights:'Only isolated fixture',bytes:Buffer.from([1,2,3])};
 async function transform(store,metadata){
  transforms++;const id=metadata.id,variant=Buffer.from([5,6,7]),asset={id,organizationId:org.id,usage:metadata.usage,alt:metadata.alt,rights:metadata.rights,rightsConfirmedAt:metadata.rightsConfirmedAt,rightsConfirmedBy:metadata.rightsConfirmedBy,source:{original:'originals/'+id,mime:metadata.mime,bytes:metadata.bytes.length,sha256:hash(metadata.bytes)},variants:[{storageFile:id+'-32.webp',width:32,height:48,bytes:variant.length,sha256:hash(variant)}]},objects=[{key:asset.source.original,value:Buffer.from(metadata.bytes),httpMetadata:{contentType:metadata.mime}},{key:'variants/'+asset.variants[0].storageFile,value:variant,httpMetadata:{contentType:'image/webp'}}];
  if(afterTransform)afterTransform();if(failWrite){const prepare=target.db.prepare.bind(target.db);target.db.prepare=q=>{const statement=prepare(q);return q.startsWith('INSERT INTO media_chunks')?{...statement,run:()=>{throw Error('Chunk commit failure');}}:statement;};}
  return {asset,objects};
 }
 const upload=(role='owner',changes={})=>directory.uploadMedia(users[role],{...input,...changes},{transformMedia:transform,uploadSource:()=>{throw Error('Sealed source fallback is forbidden');}});
 return {source,target,api,org,scope,users,manager,bucket,directory,upload,input,setLost:()=>{lost=true;},setTamper:value=>{tamper=value;},after:fn=>{afterTransform=fn;},transforms:()=>transforms,setFailWrite:()=>{failWrite=true;},close:()=>{source.close();target.close();}};
}
const fails=(code,fn)=>assert.rejects(fn,e=>e.code===code);

test('A lost target upload reply recovers the same asset without a second transform or blob, while sealed source media remains unchanged',async()=>{
 const f=fixture();try{
  const before=f.source.organizationRecords('organizations',f.org.id);f.setLost();await fails('ORGANIZATION_UNAVAILABLE',()=>f.upload());
  const target=f.target.organizationRecords('media',f.org.id);assert.equal(target.length,1);assert.equal(f.bucket.stats().objects,2);assert.equal(f.source.db.prepare('SELECT result FROM directory_media_uploads').get().result,null);
  const result=await f.upload();assert.equal(result.id,target[0].id);assert.equal(f.transforms(),1);assert.equal(f.target.organizationRecords('media',f.org.id).length,1);assert.equal(f.bucket.stats().objects,2);assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,1);assert.ok(f.source.db.prepare('SELECT result FROM directory_media_uploads').get().result);assert.deepEqual(f.source.organizationRecords('organizations',f.org.id),before);assert.equal(f.source.organizationRecords('media',f.org.id).length,0);
  await fails('IDEMPOTENCY_CONFLICT',()=>f.upload('owner',{bytes:Buffer.from([7,8,9])}));assert.equal(f.transforms(),1);
 }finally{f.close();}
});

test('Foreign, reception and forged operator uploads cannot reserve a central intent or run image optimization',async()=>{
 const f=fixture();try{f.users.foreign.operator=true;for(const role of ['foreign','reception'])await fails('FORBIDDEN',()=>f.upload(role));assert.equal(f.transforms(),0);assert.equal(f.source.db.prepare('SELECT COUNT(*) AS n FROM directory_media_uploads').get().n,0);assert.equal(f.bucket.stats().objects,0);}finally{f.close();}
});

test('Raw binary tampering rolls back cache, command nonce, physical bytes, metadata and target receipt; a retry retains the reserved ID',async()=>{
 const f=fixture();try{
  f.setTamper(true);await fails('MEDIA_INTEGRITY',()=>f.upload());assert.equal(f.bucket.stats().objects,0);assert.equal(f.bucket.stats().bytes,0);assert.equal(f.target.organizationRecords('media',f.org.id).length,0);assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,0);assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM organization_directory_commands').get().n,0);
  const reserved=JSON.parse(f.source.db.prepare('SELECT metadata FROM directory_media_uploads').get().metadata);f.setTamper(false);const result=await f.upload();assert.equal(result.id,reserved.id);assert.equal(f.transforms(),2);assert.equal(f.bucket.stats().objects,2);
 }finally{f.close();}
});

test('A capability revoked while the image is being optimized is rechecked before the atomic target commit',async()=>{
 const f=fixture();try{f.after(()=>createPlatform(f.target).revokeMembership(f.users.owner,{id:f.manager.id,version:f.manager.version}));await fails('FORBIDDEN',()=>f.upload('manager'));assert.equal(f.transforms(),1);assert.equal(f.bucket.stats().objects,0);assert.equal(f.target.organizationRecords('media',f.org.id).length,0);assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,0);}finally{f.close();}
});

test('A physical chunk failure rolls back the whole image metadata transaction and preserves the central retry intent',async()=>{
 const f=fixture(),prepare=f.target.db.prepare;try{f.setFailWrite();await fails('SERVER_ERROR',()=>f.upload());f.target.db.prepare=prepare;assert.equal(f.bucket.stats().objects,0);assert.equal(f.target.organizationRecords('media',f.org.id).length,0);assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,0);assert.equal(f.source.db.prepare('SELECT result FROM directory_media_uploads').get().result,null);}finally{f.target.db.prepare=prepare;f.close();}
});
