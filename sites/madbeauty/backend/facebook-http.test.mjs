import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {openStore} from './store.mjs';
import {fetchApi} from '../cloudflare/fetch-api.mjs';
const origin='https://madbeauty.lt';
function setup(t){
 const store=openStore({filename:':memory:'});t.after(()=>store.close());
 const facebook={enabled:true,appId:'123456789',appSecret:'fixture-only-facebook-secret-32-bytes',fetchImpl:async(url)=>new URL(url).pathname.endsWith('/oauth/access_token')?Response.json({access_token:'fixture-token'}):new URL(url).pathname.endsWith('/debug_token')?Response.json({data:{is_valid:true,app_id:'123456789',user_id:'234567890',expires_at:Date.now()/1000+3600,scopes:['public_profile','email']}}):Response.json({id:'234567890',email:'suggested@example.com'})};
 let cookie='',csrf='';
 const call=async(path,{method='GET',body,headers={}}={})=>fetchApi(new Request(origin+path,{method,headers:{...cookie?{Cookie:cookie}:{},...method==='POST'?{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf}:{},...headers},...body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}}),store,{origin,media:{},facebook});
 const session=async()=>{const r=await call('/api/madbeauty/session');cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;const data=await r.json();csrf=data.csrf;return data;};
 const verify=async(email)=>{const c=await (await call('/api/madbeauty/auth/start',{method:'POST',body:{email}})).json();const r=await call('/api/madbeauty/auth/verify',{method:'POST',body:{challengeId:c.challengeId,code:store.capture(c.challengeId).code}});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;const data=await r.json();csrf=data.csrf;return data;};
 return {store,facebook,call,session,verify};
}
test('HTTP Facebook start enforces origin CSRF and returns only authorization URL',async t=>{
 const f=setup(t),s=await f.session();assert.equal(s.facebook.enabled,true);
 let r=await f.call('/api/madbeauty/auth/facebook/start',{method:'POST',body:{},headers:{'X-CSRF-Token':'bad'}});assert.equal(r.status,403);
 r=await f.call('/api/madbeauty/auth/facebook/start',{method:'POST',body:{},headers:{Origin:'https://evil.invalid'}});assert.equal(r.status,403);
 r=await f.call('/api/madbeauty/auth/facebook/start',{method:'POST',body:{returnPath:'/bendruomene'}});assert.equal(r.status,200);const payload=await r.json();assert.deepEqual(Object.keys(payload),['url']);assert.match(payload.url,/^https:\/\/www.facebook.com\/v26.0\/dialog\/oauth/);
});
test('HTTP callback requires original cookie and email completes linking atomically',async t=>{
 const f=setup(t);await f.session();const start=await (await f.call('/api/madbeauty/auth/facebook/start',{method:'POST',body:{returnPath:'/bendruomene'}})).json(),state=new URL(start.url).searchParams.get('state');
 const r=await f.call('/api/madbeauty/auth/facebook/callback?state='+state+'&code=fixture-code');assert.equal(r.status,303);assert.match(r.headers.get('location'),/facebook=verify/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal((await f.session()).facebook.pending,true);
 const data=await f.verify('verified@example.com');assert.equal(data.facebook.linked,true);assert.equal(data.user.email,'verified@example.com');
 const replay=await f.call('/api/madbeauty/auth/facebook/callback?state='+state+'&code=fixture-code');assert.equal(replay.headers.get('location'),'/paskyra?facebook=failed');
});
test('HTTP signed deletion bypasses browser CSRF only with a valid Meta signature',async t=>{
 const f=setup(t);await f.session();
 let r=await f.call('/api/madbeauty/auth/facebook/deletion',{method:'POST',body:'signed_request=bad.payload',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://www.facebook.com','X-CSRF-Token':''}});assert.equal(r.status,403);
 const payload=Buffer.from(JSON.stringify({algorithm:'HMAC-SHA256',user_id:'234567890'})).toString('base64url'),signature=createHmac('sha256',f.facebook.appSecret).update(payload).digest('base64url');
 r=await f.call('/api/madbeauty/auth/facebook/deletion',{method:'POST',body:new URLSearchParams({signed_request:signature+'.'+payload}).toString(),headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://www.facebook.com','X-CSRF-Token':''}});assert.equal(r.status,200);const receipt=await r.json();assert.equal((await f.call(new URL(receipt.url).pathname+new URL(receipt.url).search)).status,200);
 assert.equal((await f.call('/api/madbeauty/auth/facebook/deletion-status?code=unknown')).status,404);
});
