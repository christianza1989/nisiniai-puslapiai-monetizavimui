import test from 'node:test';
import assert from 'node:assert/strict';
import {adminLoginBody} from '../src/lib/admin-login-body';
import {textReviewAssetRequest} from '../src/lib/text-review-asset-origin';
test('cold login safely accepts POST forms and JSON; rejects oversized and wrong types',async()=>{
 for(const [type,body]of [['application/json',JSON.stringify({password:'Ž test & 1'})],['application/x-www-form-urlencoded',new URLSearchParams({password:'Ž test & 1'}).toString()]]){
  assert.equal((await adminLoginBody(new Request('https://example.test/api/admin/login/',{method:'POST',headers:{'Content-Type':type},body}))).password,'Ž test & 1');
 }
 for(const [type,body]of [['text/plain','password=x'],['application/json','{"password":3}'],['application/json',JSON.stringify({password:'x'.repeat(2100)})]])await assert.rejects(adminLoginBody(new Request('https://example.test',{method:'POST',headers:{'Content-Type':type},body})));
});
test('stage asset proxy cannot forward admin cookies, credentials or arbitrary origins',()=>{
 const result=textReviewAssetRequest(new Request('https://stage.test/models/configurator/x.glb',{headers:{Cookie:'private',Authorization:'secret',Range:'bytes=0-9'}}));
 assert.equal(new URL(result.url).hostname,'ergonomic-preview.pinet-azprekyba.workers.dev');assert.equal(result.headers.get('Cookie'),null);assert.equal(result.headers.get('Authorization'),null);assert.equal(result.headers.get('Range'),'bytes=0-9');assert.equal(result.redirect,'manual');
 for(const path of ['/api/admin/text-review/','/admin/','/https://evil.test/media/x'])assert.throws(()=>textReviewAssetRequest(new Request('https://stage.test'+path)));
 assert.throws(()=>textReviewAssetRequest(new Request('https://stage.test/media/x',{method:'POST'})));
});
