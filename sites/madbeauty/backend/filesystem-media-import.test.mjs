import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
import {prepareMedia,mediaRoot,readMedia} from './media.mjs';
import {mediaPublic} from './primitives.mjs';
import {importFilesystemMedia} from './filesystem-media-import.mjs';
import {createSqlMediaBucket} from '../cloudflare/media-bucket.mjs';
import {createOrganizationHandoff,createOrganizationStaging} from './organization-handoff.mjs';
import {createOrganizationCommit,createOrganizationAuthority} from './organization-authority.mjs';
import {createOrganizationMediaSource,createOrganizationMediaStage} from './organization-media.mjs';
const secret='isolated-filesystem-media-import-'.repeat(3),hash=b=>createHash('sha256').update(b).digest('hex');
const exec=promisify(execFile);
async function fixture(){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'madbeauty-filesystem-import-')),filename=path.join(dir,'source.sqlite'),owner={id:'filesystem-import-owner',email:'filesystem-import-owner@example.com',name:'Isolated owner'},other={id:'filesystem-import-other',email:'filesystem-import-other@example.com',name:'Isolated other'};let store=openStore({filename,secret});
 await fs.writeFile(filename+'.secret',secret,{mode:0o600});for(const user of [owner,other]){store.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,?,?)').run(user.id,store.siteId,user.email,user.name,user===owner?1:0,Date.now());store.ensureClient(user.id);}
 const api=createPlatform(store),org=api.createOrganization(owner,{name:'Isolated filesystem import',kind:'solo',city:'Vilnius',bio:'Real private files to exact SQL objects'}),require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json')),{default:sharp}=await import(pathToFileURL(require.resolve('sharp'))),bytes=await sharp({create:{width:32,height:48,channels:3,background:'#9b60ad'}}).png().toBuffer(),assets=[];
 for(const usage of ['gallery','portrait']){const asset=await prepareMedia(store,{organizationId:org.id,usage,bytes,mime:'image/png',alt:'Isolated '+usage,rights:'Created only for isolated acceptance',rightsConfirmedAt:new Date().toISOString(),rightsConfirmedBy:owner.id});api.attachMedia(owner,asset);assets.push(asset);}
 const input={organizationId:org.id,operatorAccountId:owner.id},restart=()=>{store.close();store=openStore({filename,secret});return store;};
 return {dir,filename,owner,other,org,assets,input,get store(){return store;},restart,close:async()=>{store.close();const absolute=path.resolve(dir);if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-filesystem-import-'))await fs.rm(absolute,{recursive:true,force:true});}};
}
async function diskProof(f){const root=mediaRoot(f.store),proof={};for(const asset of f.assets)for(const name of [asset.source.original,...asset.variants.map(v=>v.storageFile)])proof[name]=hash(await fs.readFile(path.join(root,name)));return proof;}
test('Real filesystem originals and variants import with stable public IDs/URLs and survive source/target restart plus physical authority handoff',async()=>{
 const f=await fixture();let target;try{
  const before=await diskProof(f),publicBefore=f.assets.map(mediaPublic),version=f.store.recordById('organizations',f.org.id).version,firstHandoff=createOrganizationHandoff(f.store),blocked=firstHandoff.freeze({...f.input,epoch:0,requestKey:'legacy-files-before-import'}),oldControl={...f.input,epoch:blocked.epoch,handoffId:blocked.handoffId};assert.throws(()=>createOrganizationCommit(f.store).context(oldControl),e=>e.code==='HANDOFF_DEPENDENCY');firstHandoff.abort(oldControl);
  const imported=await importFilesystemMedia(f.store,f.input);assert.equal(imported.imported,2);assert.equal(imported.filesystemWrites,0);assert.equal(f.store.recordById('organizations',f.org.id).version,version);assert.deepEqual(f.store.organizationRecords('media',f.org.id).map(mediaPublic),publicBefore);assert.deepEqual(await diskProof(f),before);
  f.restart();assert.equal((await importFilesystemMedia(f.store,f.input)).alreadyImported,2);assert.equal((await readMedia(f.store,f.assets[0].variants[0].storageFile,f.owner,createPlatform(f.store))).length,f.assets[0].variants[0].bytes);
  const handoff=createOrganizationHandoff(f.store),frozen=handoff.freeze({...f.input,epoch:1,requestKey:'filesystem-after-import'}),control={...f.input,epoch:frozen.epoch,handoffId:frozen.handoffId};target=openStore({filename:path.join(f.dir,'target.sqlite'),secret});let bucket=createSqlMediaBucket(target),staging=createOrganizationStaging(target,{targetName:frozen.targetName}),offset=0;
  for(;;){const page=handoff.page({...control,offset});staging.accept(page);if(page.done)break;offset=page.nextOffset;}
  const commit=createOrganizationCommit(f.store),context=commit.context(control),exporter=createOrganizationMediaSource(f.store),mediaStage=createOrganizationMediaStage(target,{targetName:frozen.targetName});for(const object of context.mediaManifest.objects)for(let part=0;part<Math.ceil(object.bytes/(256*1024));part++)mediaStage.accept(exporter.page({...control,key:object.key,part}));
  const authority=createOrganizationAuthority(target,{targetName:frozen.targetName}),receipt=authority.prepare(context);authority.activate(commit.seal({...control,targetReceipt:receipt}));target.close();target=openStore({filename:path.join(f.dir,'target.sqlite'),secret});bucket=createSqlMediaBucket(target);f.restart();
  for(const object of context.mediaManifest.objects)assert.equal(hash(new Uint8Array(await(await bucket.get(object.key)).arrayBuffer())),object.sha256);assert.deepEqual(target.organizationRecords('media',f.org.id).map(mediaPublic),publicBefore);assert.deepEqual(await diskProof(f),before);await assert.rejects(()=>importFilesystemMedia(f.store,f.input),e=>e.code==='ORGANIZATION_MIGRATING');
 }finally{if(target)target.close();await f.close();}
});
test('Filesystem import checks canonical operator before reading and rejects missing/corrupt/private path escape files without committing bytes',async()=>{
 for(const reason of ['unauthorized','missing','corrupt','path']){const f=await fixture();try{
  let reads=0;const io={...fs,readFile:async(...args)=>{reads++;return fs.readFile(...args);}},input={...f.input,operatorAccountId:reason==='unauthorized'?f.other.id:f.owner.id};
  if(reason==='missing')await fs.unlink(path.join(mediaRoot(f.store),f.assets[0].source.original));if(reason==='corrupt')await fs.writeFile(path.join(mediaRoot(f.store),f.assets[0].source.original),Buffer.alloc(f.assets[0].source.bytes,3));
  if(reason==='path')f.store.transaction(()=>{const view=f.store.readOrganization(f.org.id);view.media[0].source.original='../outside-private';f.store.writeOrganization(view);});
  await assert.rejects(()=>importFilesystemMedia(f.store,input,{io}),e=>e.code===(reason==='unauthorized'?'FORBIDDEN':'MEDIA_IMPORT_INTEGRITY'));if(['unauthorized','path','missing'].includes(reason))assert.equal(reads,0);
  const exists=f.store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_objects'").get();assert.equal(exists?f.store.db.prepare('SELECT COUNT(*) AS n FROM media_objects').get().n:0,0);
 }finally{await f.close();}}
});
test('A later filesystem asset chunk failure rolls back that asset, preserves earlier import and resumes after database restart',async()=>{
 const f=await fixture(),prepare=f.store.db.prepare.bind(f.store.db);try{
  const before=await diskProof(f),second=f.assets[1].id;f.store.db.prepare=q=>{const statement=prepare(q);return q.startsWith('INSERT INTO media_chunks')?{run:(...args)=>{if(String(args[0]).includes(second))throw Error('Isolated later asset failure');return statement.run(...args);}}:statement;};
  await assert.rejects(()=>importFilesystemMedia(f.store,f.input),/Isolated later asset failure/);f.store.db.prepare=prepare;assert.equal(f.store.recordById('media',f.assets[0].id).source.original,'originals/'+f.assets[0].id);assert.equal(f.store.recordById('media',second).source.original,f.assets[1].source.original);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM media_objects WHERE key LIKE ?').get('%'+second+'%').n,0);
  f.restart();const resumed=await importFilesystemMedia(f.store,f.input);assert.equal(resumed.imported,1);assert.equal(resumed.alreadyImported,1);assert.deepEqual(await diskProof(f),before);assert.equal((await importFilesystemMedia(f.store,f.input)).imported,0);
 }finally{await f.close();}
});
test('A concurrent gallery version edit, freeze or operator revocation during filesystem reads prevents the asset commit',async()=>{
 for(const reason of ['version','frozen','revoked']){const f=await fixture();try{
  let changed=false;const io={...fs,readFile:async(...args)=>{const bytes=await fs.readFile(...args);if(!changed){changed=true;if(reason==='version')createPlatform(f.store).saveGallery(f.owner,{organizationId:f.org.id,version:f.store.recordById('organizations',f.org.id).version,galleryEntries:[],staffPortraits:[],avatarImageId:null});else if(reason==='frozen')createOrganizationHandoff(f.store).freeze({...f.input,epoch:0,requestKey:'freeze-during-filesystem-read'});else f.store.db.prepare('UPDATE accounts SET operator=0 WHERE id=?').run(f.owner.id);}return bytes;}};
  await assert.rejects(()=>importFilesystemMedia(f.store,f.input,{io}),e=>e.code===({version:'VERSION_CONFLICT',frozen:'ORGANIZATION_MIGRATING',revoked:'FORBIDDEN'}[reason]));assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM media_objects').get().n,0);assert.equal(f.store.recordById('media',f.assets[0].id).source.original,f.assets[0].source.original);
 }finally{await f.close();}}
});
test('The explicit local import CLI refuses missing database/secret files and imports the named existing database without exposing credentials',async()=>{
 const f=await fixture();try{
  const cli=path.resolve(import.meta.dirname,'import-filesystem-media.mjs'),missing=path.join(f.dir,'missing.sqlite'),args=file=>[cli,'--db',file,'--organization',f.org.id,'--operator',f.owner.id];await assert.rejects(()=>exec(process.execPath,args(missing)),e=>/Existing named local database and secret file required/.test(e.stderr));await assert.rejects(()=>fs.access(missing));await assert.rejects(()=>fs.access(missing+'.secret'));
  await fs.rename(f.filename+'.secret',f.filename+'.secret-held');await assert.rejects(()=>exec(process.execPath,args(f.filename)),e=>/Existing named local database and secret file required/.test(e.stderr));await fs.rename(f.filename+'.secret-held',f.filename+'.secret');
  const response=await exec(process.execPath,args(f.filename)),result=JSON.parse(response.stdout);assert.equal(result.imported,2);assert.equal(result.filesystemWrites,0);assert.ok(!response.stdout.includes(secret));assert.equal(JSON.parse((await exec(process.execPath,args(f.filename))).stdout).alreadyImported,2);
 }finally{await f.close();}
});
