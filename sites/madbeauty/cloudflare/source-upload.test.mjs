import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const runtime=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),{build}=await import(pathToFileURL(path.join(runtime,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(runtime,'node_modules/miniflare/dist/src/index.js'))),hash=b=>createHash('sha256').update(b).digest('hex'),plain=value=>JSON.parse(JSON.stringify(value)),stats=async object=>plain(await object.stats());
test('Actual Worker source upload recovers a lost HTTP reply through source restart, physical organization transfer and target restart without another asset',async()=>{
 const bundle=await build({stdin:{resolveDir:import.meta.dirname,sourcefile:'isolated-source-upload-workers.mjs',contents:`
  import actualWorker from './worker.mjs';
  import {MadbeautyPlatform} from './platform-object.mjs';
  import {MadbeautyOrganizationStaging} from './organization-object.mjs';
  import {createPlatform} from '../backend/platform.mjs';
  import {createAuth} from '../backend/auth.mjs';
  export class SourceUpload extends MadbeautyPlatform{
   constructor(ctx,env){super(ctx,env);this.store.db.exec('CREATE TABLE IF NOT EXISTS qa_source_upload(key TEXT PRIMARY KEY,value TEXT NOT NULL);');}
   async setup(){const old=this.store.db.prepare("SELECT value FROM qa_source_upload WHERE key='fixture'").get();if(old)return JSON.parse(old.value);
    const owner={id:'source-workers-owner',email:'source-workers-owner@example.com',name:'Isolated source owner'},auth=createAuth(this.store);this.store.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,1,?)').run(owner.id,this.store.siteId,owner.email,owner.name,Date.now());this.store.ensureClient(owner.id);const session=auth.session(null);this.store.db.prepare('UPDATE sessions SET account_id=? WHERE token_hash=?').run(owner.id,session.token_hash);
    const api=createPlatform(this.store),org=api.createOrganization(owner,{name:'Isolated source then target upload',kind:'solo',city:'Vilnius',bio:'Actual isolated raster'}),info={owner,org,token:session.token,csrf:session.csrf};this.store.db.prepare("INSERT INTO qa_source_upload VALUES('fixture',?)").run(JSON.stringify(info));this.store.db.prepare("INSERT INTO qa_source_upload VALUES('lose-reply','1')").run();return info;
   }
   async fetch(request){const response=await super.fetch(request);if(new URL(request.url).pathname==='/api/madbeauty/upload'&&response.ok&&this.store.db.prepare("SELECT value FROM qa_source_upload WHERE key='lose-reply'").get()?.value==='1'){this.store.db.prepare("UPDATE qa_source_upload SET value='0' WHERE key='lose-reply'").run();return Response.json({error:{code:'ISOLATED_LOST_REPLY',message:'Controlled test transport loss'}},{status:503});}return response;}
   async stats(){return {assets:this.store.readCollections(['media']).media.map(a=>({id:a.id,originalSha256:a.source.sha256,variants:a.variants})),bucket:this.mediaBucket.stats(),intents:this.store.db.prepare('SELECT COUNT(*) AS n FROM directory_media_uploads').get().n,receipts:this.store.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n,pending:this.store.db.prepare('SELECT COUNT(*) AS n FROM directory_media_uploads WHERE result IS NULL').get().n};}
  }
  export class TargetUpload extends MadbeautyOrganizationStaging{
   async stats(){const receipts=this.store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organization_media_uploads'").get()?this.store.db.prepare('SELECT COUNT(*) AS n FROM organization_media_uploads').get().n:0;return {assets:this.store.readCollections(['media']).media.map(a=>({id:a.id,originalSha256:a.source.sha256,variants:a.variants})),bucket:this.mediaBucket.stats(),sessions:this.store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,receipts};}
  }
  export default actualWorker;
 `},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'}}),dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-source-upload-workers-')),origin='https://source-upload-workers.test',start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'SourceUpload',useSQLite:true},ORGANIZATION_STAGING:{className:'TargetUpload',useSQLite:true}},durableObjectsPersist:dir,images:{binding:'IMAGES'},bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',SESSION_SECRET:'isolated-source-upload-workers-secret'}});let mf=start();
 const source=async()=>{const ns=await mf.getDurableObjectNamespace('PLATFORM');return ns.get(ns.idFromName('madbeauty-pilot-v1'));};
 try{
  const info=plain(await(await source()).setup()),require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json')),{default:sharp}=await import(pathToFileURL(require.resolve('sharp'))),bytes=await sharp({create:{width:640,height:480,channels:3,background:'#9b60ad'}}).png().toBuffer(),headers={'cookie':'__Host-madbeauty_sid='+info.token,origin,'x-csrf-token':info.csrf};
  const upload=async(extra={})=>{const response=await mf.dispatchFetch(origin+'/api/madbeauty/upload',{method:'POST',headers:{...headers,'content-type':'image/png','x-organization-id':info.org.id,'x-asset-operation':'source-workers-stable-intent','x-asset-alt':'Real source isolated raster','x-asset-rights':'Created for isolated source acceptance','x-asset-rights-confirmed':'true','x-asset-usage':'gallery',...extra},body:bytes});return {status:response.status,value:await response.json()};};
  assert.equal((await upload()).status,503);const committed=await stats(await source());assert.equal(committed.assets.length,1);assert.equal(committed.pending,0);assert.equal(committed.receipts,1);assert.equal(committed.intents,1);assert.equal(committed.assets[0].originalSha256,hash(bytes));assert.equal(committed.bucket.objects,3);const asset=committed.assets[0];
  await mf.dispose();mf=start();assert.equal((await upload()).value.result.id,asset.id);assert.deepEqual(await stats(await source()),committed);assert.equal((await upload({'x-asset-alt':'Different intent'})).value.error.code,'IDEMPOTENCY_CONFLICT');
  const original=await source(),frozen=plain(await original.freezeOrganization({operatorAccountId:info.owner.id,organizationId:info.org.id,epoch:0,requestKey:'source-upload-physical-handoff'})),control={operatorAccountId:info.owner.id,organizationId:info.org.id,epoch:frozen.epoch,handoffId:frozen.handoffId},targets=await mf.getDurableObjectNamespace('ORGANIZATION_STAGING'),target=targets.get(targets.idFromName(frozen.targetName));let offset=0;
  for(;;){const page=await original.organizationHandoffPage({...control,offset});await target.stage(page);if(page.done)break;offset=page.nextOffset;}
  const context=await original.organizationHandoffContext(control);assert.equal(context.mediaManifest.objects.length,3);for(const object of context.mediaManifest.objects)for(let part=0;part<Math.ceil(object.bytes/(256*1024));part++)await target.stageOrganizationMedia(await original.organizationMediaHandoffPage({...control,key:object.key,part}));
  const receipt=await target.prepareAuthority(context);await target.activateAuthority(await original.sealOrganizationHandoff({...control,targetReceipt:receipt}));
  const targetBefore=await stats(target);assert.equal(targetBefore.assets.length,1);assert.equal(targetBefore.receipts,0);assert.equal(targetBefore.sessions,0);assert.deepEqual(targetBefore.assets,committed.assets);
  assert.equal((await upload()).value.result.id,asset.id);assert.deepEqual(await stats(target),targetBefore);assert.deepEqual(await stats(original),committed);
  await mf.dispose();mf=start();assert.equal((await upload()).value.result.id,asset.id);const currentTargets=await mf.getDurableObjectNamespace('ORGANIZATION_STAGING'),current=currentTargets.get(currentTargets.idFromName(frozen.targetName));assert.deepEqual(await stats(current),targetBefore);
  const file=asset.variants[0].storageFile,guest=await mf.dispatchFetch(origin+'/api/madbeauty/media/'+file);assert.equal(guest.status,404);const image=await mf.dispatchFetch(origin+'/api/madbeauty/media/'+file,{headers});assert.equal(image.status,200);const optimized=Buffer.from(await image.arrayBuffer());assert.equal(hash(optimized),asset.variants[0].sha256);assert.equal((await sharp(optimized).metadata()).format,'webp');assert.equal((await upload({'x-asset-rights':'Different rights'})).value.error.code,'IDEMPOTENCY_CONFLICT');
 }finally{await mf.dispose();const absolute=path.resolve(dir);if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-source-upload-workers-'))await rm(absolute,{recursive:true,force:true});}
});
