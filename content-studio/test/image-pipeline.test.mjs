import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {spawnSync} from 'node:child_process';
import {optimizeRaster} from '../src/image-pipeline.mjs';

test('metadata workflow is usable without loading the native raster backend',()=>{
 const pipelineUrl=new URL('../src/image-pipeline.mjs',import.meta.url).href;
 const workflowUrl=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',`
  import assert from 'node:assert/strict';
  import {register} from 'node:module';
  register('data:text/javascript,'+encodeURIComponent("export function resolve(specifier,context,nextResolve){if(specifier==='sharp')throw Object.assign(new Error('Native raster backend unavailable'),{code:'TEST_RASTER_UNAVAILABLE'});return nextResolve(specifier,context);}"),import.meta.url);
  const {IMAGE_POLICY,optimizeRaster}=await import(${JSON.stringify(pipelineUrl)});
  await import(${JSON.stringify(workflowUrl)});
  assert.equal(IMAGE_POLICY.version,'responsive-webp-v1');
  assert.equal(IMAGE_POLICY.maxInputBytes,12*1024*1024);
  await assert.rejects(()=>optimizeRaster(Buffer.alloc(0),'image/png'),/12 MB/);
  await assert.rejects(()=>optimizeRaster(Buffer.from('Raster operation needs its backend'),'image/png'),{code:'TEST_RASTER_UNAVAILABLE'});
 `],{encoding:'utf8',timeout:15000});
 assert.equal(result.error,undefined);
 assert.equal(result.status,0,result.stderr);
});

test('responsive WebP preserves alpha and never upscales a small source',async()=>{
 const source=await sharp({create:{width:1000,height:500,channels:4,background:{r:20,g:80,b:40,alpha:0}}}).png().toBuffer();
 const result=await optimizeRaster(source,'image/png');
 assert.deepEqual(result.variants.map(v=>v.width),[1000,800,640,360]);
 for(const v of result.variants){const meta=await sharp(v.bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.hasAlpha,true);assert.equal(meta.width,v.width);assert.equal(meta.height,v.height);assert.equal(meta.exif,undefined);assert.equal(meta.orientation,undefined);}
 const tiny=await sharp({create:{width:120,height:60,channels:3,background:'#224422'}}).webp().toBuffer();
 assert.deepEqual((await optimizeRaster(tiny,'image/webp')).variants.map(v=>v.width),[120]);
});
test('EXIF orientation is applied and original metadata stays out of public variants',async()=>{
 const source=await sharp({create:{width:1200,height:600,channels:3,background:'#324532'}}).withMetadata({orientation:6}).jpeg().toBuffer();
 const result=await optimizeRaster(source,'image/jpeg');assert.equal(result.source.width,600);assert.equal(result.source.height,1200);
 assert.deepEqual(result.variants.map(v=>[v.width,v.height]),[[600,1200],[360,720]]);
 for(const v of result.variants){const meta=await sharp(v.bytes).metadata();assert.equal(meta.exif,undefined);assert.equal(meta.orientation,undefined);}
});
test('invalid bytes, mismatched MIME and excessive dimensions do not produce public assets',async()=>{
 await assert.rejects(()=>optimizeRaster(Buffer.from('not an image'),'image/png'));
 const png=await sharp({create:{width:40,height:20,channels:3,background:'#ffffff'}}).png().toBuffer();
 await assert.rejects(()=>optimizeRaster(png,'image/jpeg'),/MIME/);
 const wide=await sharp({create:{width:8193,height:1,channels:3,background:'#ffffff'}}).png().toBuffer();
 await assert.rejects(()=>optimizeRaster(wide,'image/png'),/8192/);
 await assert.rejects(()=>optimizeRaster(Buffer.alloc(12*1024*1024+1),'image/png'),/12 MB/);
});
