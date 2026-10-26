import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {optimizeRaster,IMAGE_POLICY} from '../src/image-pipeline.mjs';
import {pngAtBytes} from './fixtures/png-bytes.mjs';

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
 await assert.rejects(()=>optimizeRaster(Buffer.alloc(IMAGE_POLICY.maxInputBytes+1),'image/png'),/16 MiB/);
});
test('encoded byte allowance is inclusive at 16 MiB while pixel and dimension guards remain unchanged',async()=>{
 assert.equal(IMAGE_POLICY.maxInputBytes,16*1024*1024);
 assert.equal(IMAGE_POLICY.maxInputPixels,40_000_000);assert.equal(IMAGE_POLICY.maxInputEdge,8192);assert.equal(IMAGE_POLICY.maxOutputEdge,1600);
 const small=await sharp({create:{width:40,height:20,channels:3,background:'#668877'}}).png().toBuffer();
 for(const size of [IMAGE_POLICY.maxInputBytes-1,IMAGE_POLICY.maxInputBytes]) {
  const png=pngAtBytes(small,size);assert.equal(png.length,size);
  const result=await optimizeRaster(png,'image/png');assert.deepEqual(result.variants.map(v=>[v.width,v.height]),[[40,20]]);
 }
 await assert.rejects(()=>optimizeRaster(pngAtBytes(small,IMAGE_POLICY.maxInputBytes+1),'image/png'),/16 MiB/);
 const pixels=await sharp({create:{width:6400,height:6400,channels:3,background:'#ffffff'}}).png().toBuffer();
 await assert.rejects(()=>optimizeRaster(pixels,'image/png'),/pixel limit/i);
});
