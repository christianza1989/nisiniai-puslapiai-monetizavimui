import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaUploadIntents,mediaUploadFingerprint} from './public/media-upload-intent.mjs';
test('An uncertain upload retains its scoped key across adapter reload; changed content and later intent cannot be cleared by an earlier response',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},metadata={organizationId:'org',alt:'Original',rights:'Test',usage:'gallery'},file=new File([new Uint8Array([1,2,3])],'fixture.png',{type:'image/png'}),fingerprint=await mediaUploadFingerprint(file,metadata);
 const first=createMediaUploadIntents(storage).reserve('owner','org',fingerprint),reloaded=createMediaUploadIntents(storage);assert.equal(reloaded.reserve('owner','org',fingerprint).idempotencyKey,first.idempotencyKey);
 assert.notEqual(reloaded.reserve('other','org',fingerprint).idempotencyKey,first.idempotencyKey);assert.notEqual(reloaded.reserve('owner','other',fingerprint).idempotencyKey,first.idempotencyKey);
 const next=reloaded.reserve('owner','org',await mediaUploadFingerprint(file,{...metadata,alt:'Changed'}));assert.notEqual(next.idempotencyKey,first.idempotencyKey);reloaded.complete(first);assert.equal(createMediaUploadIntents(storage).reserve('owner','org',next.fingerprint).idempotencyKey,next.idempotencyKey);
 reloaded.complete(next);assert.notEqual(createMediaUploadIntents(storage).reserve('owner','org',next.fingerprint).idempotencyKey,next.idempotencyKey);assert.ok([...data.values()].every(v=>!v.includes('Original')&&!v.includes('fixture.png')));
 const offline=createMediaUploadIntents({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});assert.equal(offline.reserve('owner','org',fingerprint).idempotencyKey,offline.reserve('owner','org',fingerprint).idempotencyKey);
});
