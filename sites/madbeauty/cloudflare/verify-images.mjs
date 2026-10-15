import fs from 'node:fs/promises';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const main=path.resolve(import.meta.dirname,'../../..'),core=path.resolve(main,'../dovanos-memorycasting'),output=path.join(import.meta.dirname,'output/image-acceptance');
const require=createRequire(main+'/content-studio/package.json');const{default:sharp}=await import(pathToFileURL(require.resolve('sharp')));
const config=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'wrangler.json'),'utf8')),worker='madbeauty-image-acceptance-20261006';
await fs.mkdir(output,{recursive:true});
if(process.argv[2]==='prepare'){
 const {build}=await import(pathToFileURL(core+'/node_modules/esbuild/lib/main.js'));
 const fixtures=[
  {id:'phone-exif',mime:'image/jpeg',bytes:[...await sharp({create:{width:32,height:48,channels:3,background:'#ba3456'}}).jpeg().withMetadata({orientation:6}).toBuffer()]},
  {id:'transparent',mime:'image/png',bytes:[...await sharp({create:{width:32,height:48,channels:4,background:{r:180,g:40,b:90,alpha:0.8}}}).png().toBuffer()]},
  {id:'tall',mime:'image/png',bytes:[...await sharp({create:{width:16,height:3200,channels:3,background:'#ba3456'}}).png().toBuffer()]},
 ];
 const entry=`import{optimizeRasterWithImages}from'${main.replaceAll('\\','/')}/content-studio/src/cloudflare-image-pipeline.mjs';export default{async fetch(request,env){if(new URL(request.url).pathname!=='/image-acceptance')return new Response('Not found',{status:404});try{const checks=[];for(const f of ${JSON.stringify(fixtures)}){const result=await optimizeRasterWithImages(env.IMAGES,Uint8Array.from(f.bytes),f.mime);checks.push({id:f.id,source:result.source,variants:result.variants.map(v=>({width:v.width,height:v.height,bytes:[...v.bytes]}))});}return Response.json(checks);}catch(e){return Response.json({error:e.message},{status:503});}}};`;
 await build({stdin:{contents:entry,resolveDir:main,sourcefile:'image-probe.mjs'},bundle:true,platform:'neutral',format:'esm',outfile:output+'/worker.mjs'});
 await fs.writeFile(output+'/wrangler.json',JSON.stringify({name:worker,account_id:config.account_id,main:'worker.mjs',compatibility_date:config.compatibility_date,workers_dev:true,images:{binding:'IMAGES'}}));
 console.log(JSON.stringify({state:'bounded-stateless-fixture-prepared',config:output+'/wrangler.json',worker}));
}else if(process.argv[2]==='check'){
 const response=await fetch(`https://${worker}.phonebridger-app.workers.dev/image-acceptance`);assert.equal(response.status,200);const results=await response.json(),proof=[];
 for(const result of results){const variant=result.variants[0],bytes=Buffer.from(variant.bytes),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);assert.ok(Math.max(meta.width,meta.height)<=1600);
  if(result.id==='phone-exif'){assert.equal(meta.width,48);assert.equal(meta.height,32);}
  if(result.id==='transparent'){assert.ok(meta.hasAlpha);const raw=await sharp(bytes).ensureAlpha().raw().toBuffer();for(let n=3;n<raw.length;n+=4)assert.equal(raw[n],204);}
  if(result.id==='tall'){assert.equal(meta.width,8);assert.equal(meta.height,1600);}
  proof.push({id:result.id,source:result.source,width:meta.width,height:meta.height,metadataRemoved:true,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 assert.deepEqual(proof.map(p=>p.id),['phone-exif','transparent','tall']);
 const receipt={at:new Date().toISOString(),runtime:'actual-cloudflare-images',checks:proof};await fs.writeFile(output+'/proof.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}else throw Error('Use prepare, deploy its exact temporary configuration, check, then remove the temporary Worker.');
