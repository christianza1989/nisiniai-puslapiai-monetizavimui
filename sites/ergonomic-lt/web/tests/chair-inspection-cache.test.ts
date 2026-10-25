import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifiedInspectionCache} from '../scripts/verified-inspection-cache.mjs';
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('an inspection is reused only after hashing all bytes of an identical file',async()=>{
 let calls=0;const cache=verifiedInspectionCache(async (bytes:Uint8Array)=>{calls++;return {fingerprint:digest(bytes),bounds:{x:[1,2]}};});
 const one=Buffer.from('TEST complete geometry, materials, samplers and transforms'),two=Buffer.from('TEST changed geometry, materials, samplers and transforms');
 const result=await cache.inspect(one,digest(one));result.bounds.x[0]=999;
 assert.deepEqual((await cache.inspect(Buffer.from(one),digest(one))).bounds.x,[1,2]);assert.equal(calls,1);
 await assert.rejects(cache.inspect(two,digest(one)),/geometry bytes differ/);assert.equal(calls,1);
 await assert.rejects(cache.inspect(one.subarray(0,one.length-1),digest(one)),/geometry bytes differ/);assert.equal(calls,1);
 await cache.inspect(two,digest(two));assert.equal(calls,2);
 assert.equal(cache.stats.distinctInspections,2);assert.equal(cache.stats.identicalByteReuses,1);
});
test('a failed inspection never becomes cached acceptance',async()=>{
 let calls=0;const cache=verifiedInspectionCache(async()=>{calls++;throw Error('TEST full PBR gate rejected');});
 const bytes=Buffer.from('TEST malformed mesh');
 for(let i=0;i<2;i++)await assert.rejects(cache.inspect(bytes,digest(bytes)),/PBR gate rejected/);
 assert.equal(calls,2);assert.equal(cache.stats.distinctInspections,0);
});
