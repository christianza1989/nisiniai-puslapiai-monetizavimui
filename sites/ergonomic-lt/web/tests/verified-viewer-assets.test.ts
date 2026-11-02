import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {VerifiedAssetCache,verifiedViewerAsset} from '../src/lib/verified-viewer-assets';
function fixture(value:string){const bytes=new TextEncoder().encode(value);return {bytes:bytes.buffer,asset:{asset:'/model.glb',bytes:bytes.byteLength,assetSha256:createHash('sha256').update(bytes).digest('hex')}};}
test('only verified exact original bytes enter the cache, and caller mutation is isolated',async()=>{
 const f=fixture('original model'),cache=new VerifiedAssetCache(100),signal=new AbortController().signal;let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;return new Response(f.bytes);};
 const first=await verifiedViewerAsset(f.asset,signal,cache,fetcher);new Uint8Array(first)[0]=0;
 const second=await verifiedViewerAsset(f.asset,signal,cache,fetcher);assert.equal(calls,1);assert.deepEqual(second,f.bytes);
 new Uint8Array(second)[0]=0;assert.deepEqual(cache.get(f.asset),f.bytes);
});
test('byte bounds, mismatched length/hash, HTTP errors and aborted views fail closed',async()=>{
 const f=fixture('original model'),cache=new VerifiedAssetCache(100),signal=new AbortController().signal;
 for(const response of [new Response('short'),new Response('tampered model'),new Response('missing',{status:404})]){
  await assert.rejects(()=>verifiedViewerAsset(f.asset,signal,cache,async()=>response));assert.equal(cache.size,0);
 }
 await assert.rejects(()=>verifiedViewerAsset({...f.asset,bytes:32_000_001},signal,cache));
 const aborted=new AbortController();aborted.abort();await assert.rejects(()=>verifiedViewerAsset(f.asset,aborted.signal,cache));
});
test('LRU memory is bounded and identity includes the expected byte count',()=>{
 const a=fixture('aaaa'),b=fixture('bbbb'),c=fixture('cccc'),cache=new VerifiedAssetCache(8);
 cache.put(a.asset,a.bytes);cache.put(b.asset,b.bytes);cache.get(a.asset);cache.put(c.asset,c.bytes);
 assert.equal(cache.size,8);assert.equal(cache.get(b.asset),undefined);assert(cache.get(a.asset));assert(cache.get(c.asset));
 assert.equal(cache.get({...a.asset,bytes:5}),undefined);
 const oversized=fixture('123456789');cache.put(oversized.asset,oversized.bytes);assert.equal(cache.size,8);
});
test('every cache hit still receives the original full SHA check before parsing',async()=>{
 const f=fixture('original'),cache=new VerifiedAssetCache(100);
 cache.put(f.asset,new TextEncoder().encode('tampered').buffer);
 await assert.rejects(()=>verifiedViewerAsset(f.asset,new AbortController().signal,cache,async()=>{throw Error('Must check the cache hit');}),/Component bytes changed/);
 assert.equal(cache.size,0);
});
