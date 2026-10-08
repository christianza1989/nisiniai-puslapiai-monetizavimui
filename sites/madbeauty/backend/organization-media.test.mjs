import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
import {createSqlMediaBucket,SQL_MEDIA_POLICY} from '../cloudflare/media-bucket.mjs';
import {createOrganizationHandoff,createOrganizationStaging,organizationTransferProof} from './organization-handoff.mjs';
import {createOrganizationCommit,createOrganizationAuthority} from './organization-authority.mjs';
import {createOrganizationMediaSource,createOrganizationMediaStage} from './organization-media.mjs';
const secret='isolated-media-transfer-'.repeat(3),now=Date.parse('2026-10-08T06:00:00Z'),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(){
 const source=openStore({filename:':memory:',secret,clock:()=>now}),target=openStore({filename:':memory:',secret,clock:()=>now}),sourceBucket=createSqlMediaBucket(source),targetBucket=createSqlMediaBucket(target),owner={id:'media-transfer-owner',email:'owner@example.com',name:'Owner',operator:true};
 source.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,1,?)').run(owner.id,source.siteId,owner.email,owner.name,now);source.ensureClient(owner.id);const api=createPlatform(source),org=api.createOrganization(owner,{name:'Isolated media transfer',bio:'Private fixture.',kind:'solo',city:'Vilnius'}),id='asset_12345678-0000-0000-0000-000000000000',original=new Uint8Array(300000).fill(51),variant=new Uint8Array([1,2,3,4]),asset={id,organizationId:org.id,usage:'gallery',alt:'Private synthetic storage fixture',rights:'Isolated acceptance',source:{original:'originals/'+id,mime:'image/jpeg',bytes:original.length,sha256:digest(original)},variants:[{storageFile:id+'-640.webp',width:640,height:480,bytes:variant.length,sha256:digest(variant)}]};
 await sourceBucket.putMany([{key:asset.source.original,value:original,httpMetadata:{contentType:asset.source.mime}},{key:'variants/'+asset.variants[0].storageFile,value:variant,httpMetadata:{contentType:'image/webp'}}]);api.attachMedia(owner,asset);
 const handoff=createOrganizationHandoff(source),frozen=handoff.freeze({operatorAccountId:owner.id,organizationId:org.id,epoch:0,requestKey:'media-transfer'}),control={operatorAccountId:owner.id,organizationId:org.id,epoch:frozen.epoch,handoffId:frozen.handoffId},stage=createOrganizationStaging(target,{targetName:frozen.targetName});let offset=0;do{const page=handoff.page({...control,offset});stage.accept(page);offset=page.nextOffset;if(page.done)break;}while(true);
 return {source,target,sourceBucket,targetBucket,org,owner,asset,original,variant,frozen,control,handoff,commit:createOrganizationCommit(source),authority:createOrganizationAuthority(target,{targetName:frozen.targetName}),exporter:createOrganizationMediaSource(source),importer:createOrganizationMediaStage(target,{targetName:frozen.targetName}),close:()=>{source.close();target.close();}};
}
const page=(f,key,part=0)=>f.exporter.page({...f.control,key,part});
function copy(f){const context=f.commit.context(f.control);for(const o of context.mediaManifest.objects)for(let part=0;part<Math.ceil(o.bytes/SQL_MEDIA_POLICY.chunkBytes);part++)f.importer.accept(page(f,o.key,part));return context;}

test('Media descriptors bind the frozen asset IDs; partial/reordered/repeated chunks are private and authority waits for exact complete bytes',async()=>{
 const f=await fixture();try{
  const context=f.commit.context(f.control);assert.equal(context.mediaManifest.objects.length,2);assert.throws(()=>f.authority.prepare(context),e=>e.code==='HANDOFF_DEPENDENCY');
  const second=page(f,f.asset.source.original,1),partial=f.importer.accept(second);assert.equal(partial.state,'receiving');assert.deepEqual(f.importer.accept(second),partial);assert.equal(f.targetBucket.stats().bytes,300004);assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM media_chunks').get().n,1);assert.equal((f.target.readCollections(['media']).media||[]).length,0);assert.throws(()=>f.authority.prepare(context),e=>e.code==='HANDOFF_DEPENDENCY');
  f.importer.accept(page(f,'variants/'+f.asset.variants[0].storageFile));assert.equal(f.importer.accept(page(f,f.asset.source.original)).state,'ready');const receipt=f.authority.prepare(context);assert.deepEqual(f.target.recordById('media',f.asset.id),f.asset);assert.throws(()=>f.target.db.prepare('DELETE FROM media_chunks WHERE key=?').run(f.asset.source.original),/ORGANIZATION_TARGET_FENCED/);
  const token=f.commit.seal({...f.control,targetReceipt:receipt});assert.equal(f.authority.activate(token).writeAuthority,true);assert.deepEqual(new Uint8Array(await (await f.targetBucket.get(f.asset.source.original)).arrayBuffer()),f.original);assert.deepEqual(new Uint8Array(await (await f.targetBucket.get('variants/'+f.asset.variants[0].storageFile)).arrayBuffer()),f.variant);assert.deepEqual(f.source.recordById('media',f.asset.id),f.asset);assert.equal(f.importer.accept(second).state,'ready');assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
 }finally{f.close();}
});

test('Source blob fencing covers direct SQL changes and old deletion paths, while a signed abort resumes the same original bytes',async()=>{
 const f=await fixture();try{
  for(const change of [()=>f.source.db.prepare('UPDATE media_objects SET sha256=? WHERE key=?').run('0'.repeat(64),f.asset.source.original),()=>f.source.db.prepare('UPDATE media_chunks SET key=? WHERE key=?').run('other-key',f.asset.source.original),()=>f.source.db.prepare('DELETE FROM media_chunks WHERE key=?').run(f.asset.source.original)])assert.throws(change,/ORGANIZATION_MIGRATING/);
  await assert.rejects(()=>f.sourceBucket.delete(f.asset.source.original),/ORGANIZATION_MIGRATING/);assert.deepEqual(new Uint8Array(await (await f.sourceBucket.get(f.asset.source.original)).arrayBuffer()),f.original);
  f.commit.abort(f.control);await f.sourceBucket.delete(f.asset.source.original);assert.equal(await f.sourceBucket.get(f.asset.source.original),null);assert.equal(f.targetBucket.stats().bytes,0);
 }finally{f.close();}
});

test('Tampering and signed wrong bytes never complete transfer; post-chunk failure rolls back reservation and retry safely repairs one part',async()=>{
 const f=await fixture();try{
  const first=page(f,f.asset.source.original);assert.throws(()=>f.importer.accept({...first,part:1}),e=>e.code==='FORBIDDEN');assert.throws(()=>f.exporter.page({...f.control,operatorAccountId:'foreign',key:f.asset.source.original,part:0}),e=>e.code==='FORBIDDEN');
  const prepare=f.target.db.prepare.bind(f.target.db);let fail=true;f.target.db.prepare=q=>{const st=prepare(q);return q==='INSERT INTO media_chunks VALUES(?,?,?)'&&fail?{...st,run:(...a)=>{fail=false;st.run(...a);throw Error('Post-chunk transaction failure');}}:st;};assert.throws(()=>f.importer.accept(first),/Post-chunk/);f.target.db.prepare=prepare;assert.equal(f.targetBucket.stats().bytes,0);assert.equal(f.importer.summary().state,'empty');
  f.importer.accept(first);const second=page(f,f.asset.source.original,1),{proof,...bad}=second;bad.data=Buffer.alloc(f.original.length-SQL_MEDIA_POLICY.chunkBytes,99).toString('base64');assert.throws(()=>f.importer.accept({...bad,proof:organizationTransferProof(f.source,'media-page',bad)}),e=>e.code==='HANDOFF_MEDIA_INTEGRITY');assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM media_chunks').get().n,1);assert.equal(f.importer.accept(second).completed,1);
  const context=copy(f);const actual=f.target.db.prepare('SELECT data FROM media_chunks WHERE key=? AND part=0').get(f.asset.source.original).data,corrupt=new Uint8Array(actual);corrupt[0]++;f.target.db.prepare('UPDATE media_chunks SET data=? WHERE key=? AND part=0').run(corrupt,f.asset.source.original);assert.throws(()=>f.authority.prepare(context),e=>e.code==='HANDOFF_MEDIA_INTEGRITY');assert.equal(f.authority.status().state,'empty');
 }finally{f.close();}
});

test('Prepared abort removes only staged blobs and capacity reservation; a foreign object cannot be smuggled into the frozen media manifest',async()=>{
 const f=await fixture();try{
  const first=page(f,f.asset.source.original),{proof,...body}=first;body.manifest={...body.manifest,objects:[...body.manifest.objects,{key:'originals/asset_99999999-0000-0000-0000-000000000000',bytes:1,mime:'image/jpeg',sha256:digest(new Uint8Array([1]))}]};assert.throws(()=>f.importer.accept({...body,proof:organizationTransferProof(f.source,'media-page',body)}),e=>e.code==='HANDOFF_DEPENDENCY');assert.equal(f.targetBucket.stats().bytes,0);
  const context=copy(f);f.authority.prepare(context);const abort=f.commit.abort(f.control);assert.equal(f.authority.discard(abort).state,'empty');assert.equal(f.targetBucket.stats().bytes,0);assert.equal(f.importer.summary().state,'empty');assert.deepEqual(new Uint8Array(await (await f.sourceBucket.get(f.asset.source.original)).arrayBuffer()),f.original);
 }finally{f.close();}
});

test('Aborting an unprepared partial media import requires the exact epoch token and frees its reservation without touching the original',async()=>{
 const f=await fixture();try{
  f.importer.accept(page(f,f.asset.source.original,1));const abort=f.commit.abort(f.control),{proof,...wrong}=abort;wrong.epoch++;
  assert.throws(()=>f.authority.discard({...wrong,proof:organizationTransferProof(f.source,'source-abort',wrong)}),e=>e.code==='HANDOFF_SCOPE');assert.equal(f.targetBucket.stats().bytes,300004);
  assert.equal(f.authority.discard(abort).state,'empty');assert.equal(f.targetBucket.stats().bytes,0);assert.equal(f.importer.summary().state,'empty');assert.equal(f.target.db.prepare('SELECT COUNT(*) AS n FROM media_chunks').get().n,0);assert.deepEqual(new Uint8Array(await (await f.sourceBucket.get(f.asset.source.original)).arrayBuffer()),f.original);
 }finally{f.close();}
});
