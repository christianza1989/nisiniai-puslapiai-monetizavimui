import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import sharp from 'sharp';
import {IMAGE_POLICY} from '../src/image-pipeline.mjs';
import {pngAtBytes} from './fixtures/png-bytes.mjs';
const parent=path.resolve(import.meta.dirname,'../tmp');await mkdir(parent,{recursive:true});
const root=await mkdtemp(path.join(parent,'media-byte-test-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
const model=await import('../src/model.mjs');const {createServer}=await import('../src/server.mjs');
await model.initialize();
test('HTTP base64 accepts the full canonical16MiB binary allowance and rejects decoded overflow',async()=>{
 const site=await model.createSite({canonicalHost:'media-byte-test.invalid',name:'Synthetic fixture'});
 const tiny=await sharp({create:{width:40,height:20,channels:3,background:'#778866'}}).png().toBuffer();
 const server=await createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/sites/${site.id}/assets`;
 const send=bytes=>fetch(url,{method:'POST',headers:{'x-studio-request':'1','content-type':'application/json'},body:JSON.stringify({mime:'image/png',base64:bytes.toString('base64'),alt:'Synthetic fixture only',rights:'Synthetic test'})});
 try {
  const meta=await (await fetch(new URL('/api/meta',url))).json();assert.deepEqual(meta.imagePolicy,IMAGE_POLICY);
  const accepted=await send(pngAtBytes(tiny,IMAGE_POLICY.maxInputBytes));assert.equal(accepted.status,201);
  const record=await accepted.json();assert.deepEqual(record.variants.map(v=>[v.width,v.height]),[[40,20]]);
  const count=(await model.getSite(site.id)).assets.length;
  const rejected=await send(pngAtBytes(tiny,IMAGE_POLICY.maxInputBytes+1));assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/16 MiB/);
  assert.equal((await model.getSite(site.id)).assets.length,count);
  if(process.env.MEDIA_REAL_SOURCE_FIXTURE) {
   const bytes=await readFile(process.env.MEDIA_REAL_SOURCE_FIXTURE);
   assert.ok(bytes.length>12*1024*1024 && bytes.length<=IMAGE_POLICY.maxInputBytes);
   const source=await sharp(bytes).metadata();assert.ok(source.width*source.height<=IMAGE_POLICY.maxInputPixels);
   const actual=await send(bytes);assert.equal(actual.status,201);const imported=await actual.json();
   assert.ok(imported.variants.length>0);assert.ok(imported.variants.every(v=>v.width<=1600&&v.height<=1600));
   const original=await readFile(path.join(root,'data/media-originals',site.id,`${imported.groupId}.png`));assert.deepEqual(original,bytes);
  }
 } finally {await new Promise(resolve=>server.close(resolve));}
});
test.after(async()=>{assert.ok(root.startsWith(parent+path.sep));await rm(root,{recursive:true,force:true});});
