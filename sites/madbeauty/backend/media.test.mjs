import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {createApiHandler} from './http.mjs';
import {prepareMedia,discardMedia,mediaRoot,readMedia} from './media.mjs';
const input=async()=>({bytes:await fs.readFile(new URL('../prototype/public/images/nails-neutral-360.webp',import.meta.url)),mime:'image/webp',usage:'gallery',alt:'Isolated illustration',rights:'Original isolated fixture',organizationId:'fixture-org'});
test('Local media failure removes incomplete private files, failed attachment cleans files, and corrupt derivative fails closed',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'madbeauty-media-failure-')),store=openStore({filename:path.join(dir,'db.sqlite'),secret:'isolated-media-failure-'.repeat(3)});let server;
 try{
  let writes=0;const io={...fs,writeFile:async(...args)=>{if(++writes===2){await fs.writeFile(...args);throw Error('Injected partial write failure');}return fs.writeFile(...args);}};
  const meta=await input();await assert.rejects(()=>prepareMedia(store,meta,{io}),e=>e.code==='MEDIA_UNAVAILABLE');assert.deepEqual(await fs.readdir(mediaRoot(store)),[]);
  const auth=createAuth(store),api=createPlatform(store),session=auth.session(null),challenge=auth.start(session,'media-owner@example.com','127.0.0.1'),verified=auth.verify(session,challenge.challengeId,store.capture(challenge.challengeId).code,'127.0.0.1'),owner=verified.user,org=api.createOrganization(owner,{name:'Isolated media fixture',city:'Vilnius',kind:'solo',bio:'Private storage failure fixture.'});
  let handler;server=createServer((req,res)=>handler.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;handler=createApiHandler(store,{origin});
  const state=store.read();state.media=Array.from({length:24},(_,i)=>({id:'fixture-existing-'+i,organizationId:org.id,usage:'gallery',alt:'Fixture',rights:'Original',source:{original:'fixture-private-'+i},variants:[]}));store.write(state);
  const response=await fetch(origin+'/api/madbeauty/upload',{method:'POST',headers:{Origin:origin,cookie:'madbeauty_sid='+verified.session.token,'x-csrf-token':verified.session.csrf,'Content-Type':meta.mime,'x-organization-id':org.id,'x-asset-usage':'gallery','x-asset-alt':encodeURIComponent(meta.alt),'x-asset-rights':encodeURIComponent(meta.rights),'x-asset-rights-confirmed':'true'},body:meta.bytes});assert.equal((await response.json()).error.code,'LIMIT');assert.deepEqual(await fs.readdir(mediaRoot(store)),[]);assert.equal(store.read().media.length,24);
  state.media=[];store.write(state);const asset=await prepareMedia(store,{...meta,organizationId:org.id});api.attachMedia(owner,asset);await fs.writeFile(path.join(mediaRoot(store),asset.variants[0].storageFile),Buffer.from('corrupt'));await assert.rejects(()=>readMedia(store,asset.variants[0].storageFile,owner,api),e=>e.code==='MEDIA_UNAVAILABLE');await assert.rejects(()=>readMedia(store,asset.source.original,owner,api),e=>e.code==='NOT_FOUND');await assert.rejects(()=>discardMedia(store,{...asset,source:{original:'../outside'}}),/Invalid prepared media path/);
 }finally{if(server)await new Promise(r=>server.close(r));store.close();if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-media-failure-'))await fs.rm(dir,{recursive:true,force:true});}
});
