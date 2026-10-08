import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const {build}=await import(pathToFileURL(path.join(runtime,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(runtime,'node_modules/miniflare/dist/src/index.js')));

test('Actual Workers transfer original and variant chunks across two-object restart, guard physical target identity and activate only complete exact media',async()=>{
 const bundle=await build({stdin:{resolveDir:import.meta.dirname,sourcefile:'isolated-organization-media-fixture.mjs',contents:`
  import {createHash} from 'node:crypto';
  import {MadbeautyPlatform} from './platform-object.mjs';
  import {MadbeautyOrganizationStaging} from './organization-object.mjs';
  import {createPlatform} from '../backend/platform.mjs';
  const hash=b=>createHash('sha256').update(b).digest('hex');
  export class SourceFixture extends MadbeautyPlatform{
   async setup(){const exists=this.store.db.prepare("SELECT value FROM release_metadata WHERE key='media-transfer-fixture'").get();if(exists)return JSON.parse(exists.value);const owner={id:'workers-media-owner',email:'media-owner@example.com',name:'Owner',operator:true};this.store.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,1,?)').run(owner.id,this.store.siteId,owner.email,owner.name,Date.now());this.store.ensureClient(owner.id);const api=createPlatform(this.store),org=api.createOrganization(owner,{name:'Isolated Worker media',kind:'solo',city:'Vilnius',bio:'Private byte-preservation test.'}),id='asset_11111111-0000-0000-0000-000000000000',original=new Uint8Array(300000).fill(61),variant=new Uint8Array([3,5,7]),asset={id,organizationId:org.id,usage:'gallery',alt:'Synthetic storage fixture',rights:'Isolated test',source:{original:'originals/'+id,mime:'image/jpeg',bytes:original.length,sha256:hash(original)},variants:[{storageFile:id+'-640.webp',width:640,height:480,bytes:variant.length,sha256:hash(variant)}]};await this.mediaBucket.putMany([{key:asset.source.original,value:original,httpMetadata:{contentType:'image/jpeg'}},{key:'variants/'+asset.variants[0].storageFile,value:variant,httpMetadata:{contentType:'image/webp'}}]);api.attachMedia(owner,asset);const info={owner,org,asset};this.store.db.prepare('INSERT INTO release_metadata VALUES(?,?)').run('media-transfer-fixture',JSON.stringify(info));return info;}
   async control(){const f=await this.setup(),status=await this.organizationHandoffStatus({operatorAccountId:f.owner.id,organizationId:f.org.id});return {operatorAccountId:f.owner.id,organizationId:f.org.id,epoch:status.epoch,handoffId:status.handoffId};}
   async sourceHashes(){const f=await this.setup();return {original:hash(new Uint8Array(await (await this.mediaBucket.get(f.asset.source.original)).arrayBuffer())),variant:hash(new Uint8Array(await (await this.mediaBucket.get('variants/'+f.asset.variants[0].storageFile)).arrayBuffer()))};}
  }
  export class TargetFixture extends MadbeautyOrganizationStaging{
   async snapshot(){const media=this.store.readCollections(['media']).media||[],result={state:this.authorityStatus(),media,storage:this.mediaBucket.stats(),sessions:this.store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n};if(media.length){result.original=hash(new Uint8Array(await (await this.mediaBucket.get(media[0].source.original)).arrayBuffer()));result.variant=hash(new Uint8Array(await (await this.mediaBucket.get('variants/'+media[0].variants[0].storageFile)).arrayBuffer()));}return result;}
  }
  export default {async fetch(request,env){try{const source=env.SOURCE.getByName('madbeauty-pilot-v1'),f=await source.setup(),route=new URL(request.url).pathname,target=env.ORGANIZATION_STAGING.getByName('madbeauty:organization:v1:'+f.org.id);let result;
   if(route==='/setup')result=f;
   else if(route==='/freeze'){const frozen=await source.freezeOrganization({operatorAccountId:f.owner.id,organizationId:f.org.id,epoch:0,requestKey:'workers-media-transfer'}),control=await source.control();let offset=0;do{const page=await source.organizationHandoffPage({...control,offset});await target.stage(page);offset=page.nextOffset;if(page.done)break;}while(true);result=frozen;}
   else if(route==='/original-0'||route==='/original-1'||route==='/variant'){const packet=await source.organizationMediaHandoffPage({...await source.control(),key:route==='/variant'?'variants/'+f.asset.variants[0].storageFile:f.asset.source.original,part:route==='/original-1'?1:0});result=await target.stageOrganizationMedia(packet);}
   else if(route==='/wrong-target'){const packet=await source.organizationMediaHandoffPage({...await source.control(),key:f.asset.source.original,part:0});result=await env.ORGANIZATION_STAGING.getByName('wrong-object').stageOrganizationMedia(packet);}
   else if(route==='/prepare')result=await target.prepareAuthority(await source.organizationHandoffContext(await source.control()));
   else if(route==='/activate'){const control=await source.control(),receipt=await target.prepareAuthority(await source.organizationHandoffContext(control)),token=await source.sealOrganizationHandoff({...control,targetReceipt:receipt});result=await target.activateAuthority(token);}
   else if(route==='/target')result=await target.snapshot();
   else if(route==='/source')result=await source.sourceHashes();else return new Response('Not found',{status:404});return Response.json(result);
  }catch(error){return Response.json({error:error.code||error.message},{status:error.status||500});}}};
 `},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'}});
 const dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-media-transfer-workers-')),start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{SOURCE:{className:'SourceFixture',useSQLite:true},ORGANIZATION_STAGING:{className:'TargetFixture',useSQLite:true}},durableObjectsPersist:dir,bindings:{SESSION_SECRET:'isolated-workers-media-secret-'.repeat(3)}});let mf=start();
 try{
  const get=async route=>{const response=await mf.dispatchFetch('https://media-fixture.test'+route);return {status:response.status,value:await response.json()};},f=(await get('/setup')).value,before=(await get('/source')).value;assert.equal(before.original,f.asset.source.sha256);assert.equal((await get('/freeze')).status,200);assert.equal((await get('/prepare')).value.error,'HANDOFF_DEPENDENCY');assert.ok((await get('/wrong-target')).value.error.includes('identity mismatch'));assert.equal((await get('/original-1')).value.state,'receiving');assert.equal((await get('/original-1')).value.completed,0);assert.equal((await get('/target')).value.media.length,0);
  await mf.dispose();mf=start();assert.equal((await get('/prepare')).value.error,'HANDOFF_DEPENDENCY');assert.equal((await get('/variant')).value.completed,1);assert.equal((await get('/original-0')).value.state,'ready');assert.equal((await get('/prepare')).value.state,'prepared');assert.equal((await get('/activate')).value.writeAuthority,true);const target=(await get('/target')).value;assert.deepEqual(target.media,[f.asset]);assert.equal(target.original,before.original);assert.equal(target.variant,before.variant);assert.equal(target.sessions,0);assert.equal(target.storage.bytes,300003);
  await mf.dispose();mf=start();assert.deepEqual((await get('/source')).value,before);assert.deepEqual((await get('/target')).value,target);assert.equal((await get('/original-1')).value.state,'ready');
 }finally{await mf.dispose();const absolute=path.resolve(dir);if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-media-transfer-workers-'))await rm(absolute,{recursive:true,force:true});}
});
