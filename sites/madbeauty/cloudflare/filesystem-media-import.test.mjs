import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {openStore} from '../backend/store.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {prepareMedia,mediaRoot} from '../backend/media.mjs';
import {mediaPublic} from '../backend/primitives.mjs';
import {importFilesystemMedia} from '../backend/filesystem-media-import.mjs';
import {createOrganizationHandoff} from '../backend/organization-handoff.mjs';
import {createOrganizationCommit} from '../backend/organization-authority.mjs';
import {createOrganizationMediaSource} from '../backend/organization-media.mjs';
import {createOrganizationDirectory} from '../backend/organization-directory.mjs';
const runtime=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),{build}=await import(pathToFileURL(path.join(runtime,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(runtime,'node_modules/miniflare/dist/src/index.js'))),hash=b=>createHash('sha256').update(b).digest('hex'),plain=v=>JSON.parse(JSON.stringify(v));
test('Real Node filesystem media crosses the existing signed transfer into a native Workers SQL object and current private reads survive both runtimes restarting',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'madbeauty-filesystem-workers-')),secret='isolated-node-to-workers-media-secret',filename=path.join(dir,'source.sqlite');let source=openStore({filename,secret}),mf;
 try{
  const owner={id:'filesystem-workers-owner',email:'filesystem-workers-owner@example.com',name:'Isolated owner'};source.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,1,?)').run(owner.id,source.siteId,owner.email,owner.name,Date.now());source.ensureClient(owner.id);const api=createPlatform(source),org=api.createOrganization(owner,{name:'Isolated filesystem Workers transfer',kind:'solo',city:'Vilnius',bio:'Real isolated private raster'}),require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json')),{default:sharp}=await import(pathToFileURL(require.resolve('sharp'))),bytes=await sharp({create:{width:32,height:48,channels:3,background:'#9b60ad'}}).png().toBuffer(),asset=await prepareMedia(source,{organizationId:org.id,usage:'gallery',bytes,mime:'image/png',alt:'Isolated real filesystem raster',rights:'Created only for isolated acceptance',rightsConfirmedAt:new Date().toISOString(),rightsConfirmedBy:owner.id});api.attachMedia(owner,asset);
  const originalHash=hash(await fs.readFile(path.join(mediaRoot(source),asset.source.original))),publicBefore=mediaPublic(asset);assert.equal((await importFilesystemMedia(source,{operatorAccountId:owner.id,organizationId:org.id})).imported,1);
  const bundle=await build({stdin:{resolveDir:import.meta.dirname,sourcefile:'isolated-filesystem-target-workers.mjs',contents:`
   import {MadbeautyOrganizationStaging} from './organization-object.mjs';
   import {createHash} from 'node:crypto';
   export class FilesystemTarget extends MadbeautyOrganizationStaging{
    async facts(){const rows=this.store.db.prepare('SELECT key,bytes,mime,sha256 FROM media_objects ORDER BY key').all(),objects=[];for(const row of rows){const object=await this.mediaBucket.get(row.key),bytes=new Uint8Array(await object.arrayBuffer());objects.push({...row,actualSha256:createHash('sha256').update(bytes).digest('hex')});}return {media:this.store.readCollections(['media']).media,objects,sessions:this.store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n};}
   }
   export default {async fetch(request,env){const input=await request.json(),target=env.ORGANIZATION_STAGING.get(env.ORGANIZATION_STAGING.idFromName(input.targetName));if(new URL(request.url).pathname==='/read'){const value=await target.readOrganizationMedia(input.packet);return Response.json({response:value.response,bytes:value.bytes?Buffer.from(value.bytes).toString('base64'):null});}return Response.json(await target.executeDirectoryCommand(input.packet));}};
  `},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text'}}),start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{ORGANIZATION_STAGING:{className:'FilesystemTarget',useSQLite:true}},durableObjectsPersist:path.join(dir,'worker-storage'),bindings:{SESSION_SECRET:secret}});mf=start();
  const handoff=createOrganizationHandoff(source),frozen=handoff.freeze({operatorAccountId:owner.id,organizationId:org.id,epoch:0,requestKey:'filesystem-native-target'}),control={operatorAccountId:owner.id,organizationId:org.id,epoch:frozen.epoch,handoffId:frozen.handoffId},ns=await mf.getDurableObjectNamespace('ORGANIZATION_STAGING'),target=ns.get(ns.idFromName(frozen.targetName));let offset=0;
  for(;;){const page=handoff.page({...control,offset});await target.stage(page);if(page.done)break;offset=page.nextOffset;}
  const commit=createOrganizationCommit(source),context=commit.context(control),exporter=createOrganizationMediaSource(source);for(const object of context.mediaManifest.objects)for(let part=0;part<Math.ceil(object.bytes/(256*1024));part++)await target.stageOrganizationMedia(exporter.page({...control,key:object.key,part}));
  const receipt=plain(await target.prepareAuthority(context));await target.activateAuthority(commit.seal({...control,targetReceipt:receipt}));const before=plain(await target.facts());assert.equal(before.sessions,0);assert.deepEqual(mediaPublic(before.media[0]),publicBefore);for(const object of before.objects)assert.equal(object.actualSha256,object.sha256);assert.equal(before.media[0].source.sha256,originalHash);
  const directory=()=>createOrganizationDirectory(source,{getTarget:targetName=>({executeDirectoryCommand:async packet=>await(await mf.dispatchFetch('https://filesystem-transfer.test/command',{method:'POST',body:JSON.stringify({targetName,packet})})).json(),readOrganizationMedia:async packet=>{const value=await(await mf.dispatchFetch('https://filesystem-transfer.test/read',{method:'POST',body:JSON.stringify({targetName,packet})})).json();return {response:value.response,...(value.bytes?{bytes:Uint8Array.from(Buffer.from(value.bytes,'base64')).buffer}:{})};}})}),file=asset.variants[0].storageFile;
  await assert.rejects(()=>directory().readMedia(file,null,()=>{throw Error('Sealed source fallback forbidden');}),e=>e.code==='NOT_FOUND');let privateImage=await directory().readMedia(file,owner,()=>{throw Error('Sealed source fallback forbidden');});assert.equal(hash(privateImage),asset.variants[0].sha256);assert.equal((await sharp(privateImage).metadata()).format,'webp');
  source.close();source=openStore({filename,secret});await mf.dispose();mf=start();const currentNs=await mf.getDurableObjectNamespace('ORGANIZATION_STAGING'),current=currentNs.get(currentNs.idFromName(frozen.targetName));assert.deepEqual(plain(await current.facts()),before);privateImage=await directory().readMedia(file,owner,()=>{throw Error('Sealed source fallback forbidden');});assert.equal(hash(privateImage),asset.variants[0].sha256);assert.equal(hash(await fs.readFile(path.join(mediaRoot(source),asset.source.original))),originalHash);
 }finally{if(mf)await mf.dispose();source.close();const absolute=path.resolve(dir);if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-filesystem-workers-'))await fs.rm(absolute,{recursive:true,force:true});}
});
