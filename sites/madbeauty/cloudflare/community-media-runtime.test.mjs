import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core,pinCore} from '../release-20261010/pinned-core.mjs';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js'))),require=createRequire(path.resolve(import.meta.dirname,'../../../content-studio/package.json')),sharp=require('sharp');
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore]});

test('Native community image pipeline: audiences, private attachments, ownership, restart and blocked image reads',async()=>{
 const origin='https://community-images.test',storage=await mkdtemp(path.join(os.tmpdir(),'madbeauty-community-images-')),mails=[],image=await sharp({create:{width:80,height:100,channels:3,background:'#7542f5'}}).withExif({IFD0:{Artist:'Private source metadata'}}).png().toBuffer();
 const start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true}},durableObjectsPersist:storage,images:{binding:'IMAGES'},bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',COMMUNITY_ENABLED:'true',SESSION_SECRET:'local-community-images-no-production-access'},serviceBindings:{ASSETS:()=>new Response('Not found',{status:404}),MAIL_TRANSPORT:async r=>{mails.push(await r.json());return new Response('Accepted');}}});
 let mf=start();
 const browser=()=>{let cookie='',csrf='';const raw=async(route,body,headers={},method)=>{const r=await mf.dispatchFetch(origin+'/api/madbeauty/'+route,{method:method|| (body===undefined?'GET':'POST'),headers:{Cookie:cookie,...body===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf},...headers},...body===undefined?{}:{body:body instanceof Uint8Array?body:JSON.stringify(body)}});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return r;};const json=async(...args)=>{const r=await raw(...args),v=await r.json();csrf=v.csrf||csrf;return {status:r.status,...v};};return {raw,json,call:(method,input={})=>json('community',{method,input}),upload:(mode,target,operation=randomUUID(),headers={})=>json('community-upload',image,{'Content-Type':'image/png','X-Community-Mode':mode,...target?{'X-Community-Target':target}:{},'X-Asset-Alt':encodeURIComponent('Testinė violetinė nuotrauka'),'X-Asset-Rights':encodeURIComponent('Sintetinis vietinio bandymo vaizdas'),'X-Asset-Rights-Confirmed':'true','X-Asset-Operation':operation,...headers}),async login(email){await json('session');const c=await json('auth/start',{email});assert.equal((await json('auth/verify',{challengeId:c.challengeId,code:mails.at(-1).text.match(/\b\d{6}\b/)[0]})).status,200);}};};
 try{
  const a=browser(),b=browser(),c=browser();for(const [user,email,name] of [[a,'image-a@example.com','Testinė A'],[b,'image-b@example.com','Testinė B'],[c,'image-c@example.com','Testinė C']]){await user.login(email);await user.call('settings',{version:0,name,discoverable:true,messagePolicy:'requests'});}
  const A=(await a.call('session')).result.actor,B=(await b.call('session')).result.actor;
  assert.equal((await a.upload('post',null,randomUUID(),{'X-CSRF-Token':'forged'})).status,403);
  assert.equal((await a.upload('post',null,randomUUID(),{'X-Asset-Rights-Confirmed':'false'})).status,400);
  assert.equal((await a.upload('post',null,randomUUID(),{'Content-Type':'image/svg+xml'})).status,400);
  const operation=randomUUID(),uploaded=await a.upload('post',null,operation);assert.equal(uploaded.status,200,JSON.stringify(uploaded));const asset=uploaded.result;
  assert.equal((await a.upload('post',null,operation)).result.id,asset.id);assert.equal(asset.source,undefined);
  assert.equal((await b.call('publish',{text:'Foreign asset',media:[asset.id],operation:randomUUID()})).status,404);
  const post=(await a.call('publish',{text:'Privati nuotrauka',media:[asset.id],audience:'private',operation:randomUUID()})).result;
  const postUrl='community-media?'+new URLSearchParams({author:A,post:post.id,id:asset.id});
  assert.equal((await b.raw(postUrl)).status,404);const read=await a.raw(postUrl);assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'no-store');assert.equal(read.headers.get('cross-origin-resource-policy'),'same-origin');const variant=Buffer.from(await read.arrayBuffer());assert.equal((await sharp(variant).metadata()).format,'webp');assert.equal((await sharp(variant).metadata()).exif,undefined);
  await a.call('edit',{id:post.id,version:1,text:'Vieša nuotrauka',audience:'public'});assert.equal((await b.raw(postUrl)).status,200);
  assert.equal((await b.raw(postUrl,undefined,{'Sec-Fetch-Site':'cross-site'})).status,403);
  await mf.dispose();mf=start();assert.equal((await a.raw(postUrl)).status,200);
  await a.call('request',{target:B});assert.equal((await a.upload('message',B)).status,403);await b.call('respond',{target:A,version:1,accept:true});
  const privateImage=await a.upload('message',B);assert.equal(privateImage.status,200,JSON.stringify(privateImage));const message=await a.call('send',{target:B,text:'Privatus priedas',media:[privateImage.result.id],operation:randomUUID()});assert.equal(message.status,200,JSON.stringify(message));
  const msgUrl=(target,id=privateImage.result.id)=>'community-media?'+new URLSearchParams({target,message:message.result.id,id});
  assert.equal((await b.raw(msgUrl(A))).status,200);assert.equal((await c.raw(msgUrl(A))).status,404);assert.equal((await b.raw(msgUrl(A,asset.id))).status,404);
  await a.call('block',{target:B,blocked:true});assert.equal((await b.raw(msgUrl(A))).status,404);assert.equal((await b.raw(postUrl)).status,404);
  await a.call('edit',{id:post.id,version:2,delete:true});assert.equal((await a.raw(postUrl)).status,404);
  await c.json('logout',{});assert.equal((await c.raw(postUrl)).status,401);
 }finally{await mf.dispose();}
});
