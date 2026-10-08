import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHttpAdapter} from './public/http-adapter.mjs';
test('unexpected HTML response has a safe recovery message',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:false,json:async()=>{throw Error('<html>private infrastructure detail</html>');}}));
 await assert.rejects(createHttpAdapter().refreshSession(),e=>e.code==='NETWORK_ERROR'&&!e.message.includes('private infrastructure'));
});
test('null successful response is safely rejected',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>null}));
 await assert.rejects(createHttpAdapter().refreshSession(),e=>e.code==='NETWORK_ERROR');
});
test('bounded request abort offers state checking before retry',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 t.mock.method(globalThis,'fetch',async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')))));
 const request=createHttpAdapter().refreshSession();t.mock.timers.tick(15000);
 await assert.rejects(request,e=>e.code==='NETWORK_ERROR'&&e.message.includes('būseną'));
});
test('API conflicts retain server code and safe correction message',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:409,json:async()=>({error:{code:'SLOT_CONFLICT',message:'Laikas užimtas.'}})}));
 await assert.rejects(createHttpAdapter().refreshSession(),e=>e.code==='SLOT_CONFLICT'&&e.status===409&&e.message==='Laikas užimtas.');
});

test('Concurrent session refresh is shared and RPC waits for its new CSRF token instead of sending an expired one',async t=>{
 let sessions=0,finishRefresh;const requests=[],old={csrf:'old-fixture-csrf',clock:{now:'2026-10-08T06:00:00Z'},user:{id:'fixture-client'},organizations:[]},fresh={...old,csrf:'fresh-fixture-csrf'};
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(url.endsWith('/session')){sessions++;if(sessions===1)return {ok:true,json:async()=>old};return new Promise(resolve=>{finishRefresh=()=>resolve({ok:true,json:async()=>fresh});});}requests.push(options);return {ok:true,json:async()=>({result:{saved:true}})};});
 const adapter=createHttpAdapter();await adapter.refreshSession();const a=adapter.refreshSession(),b=adapter.refreshSession(),read=adapter.taxonomy(),write=adapter.saveMenuGroup({organizationId:'fixture-org',label:'Private fixture group'});await Promise.resolve();assert.equal(sessions,2);assert.equal(requests.length,0);finishRefresh();await Promise.all([a,b,read,write]);assert.equal(requests.length,2);assert.ok(requests.every(r=>r.headers['x-csrf-token']==='fresh-fixture-csrf'));assert.equal(adapter.session.user.id,'fixture-client');
});

test('A pending mutation is not sent under a different account or an expired session; public reads use the refreshed session',async t=>{
 for(const nextUser of [null,{id:'different-fixture-client'}]){
  let sessions=0,finishRefresh;const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{if(url.endsWith('/session')){sessions++;if(sessions===1)return {ok:true,json:async()=>({csrf:'old-fixture-csrf',clock:{now:'2026-10-08T06:00:00Z'},user:{id:'fixture-client'},organizations:[]})};return new Promise(resolve=>{finishRefresh=()=>resolve({ok:true,json:async()=>({csrf:'new-fixture-csrf',clock:{now:'2026-10-08T06:00:00Z'},user:nextUser,organizations:[]})});});}calls.push(JSON.parse(options.body).method);return {ok:true,json:async()=>({result:[]})};});
  const adapter=createHttpAdapter();await adapter.refreshSession();const refreshing=adapter.refreshSession(),saving=adapter.confirm({holdId:'old-client-hold',idempotencyKey:'pending-fixture'}),reading=adapter.taxonomy(),settled=Promise.allSettled([refreshing,saving,reading]);finishRefresh();const results=await settled;assert.equal(results[1].status,'rejected');assert.equal(results[1].reason.code,'SESSION_CHANGED');assert.deepEqual(calls,['taxonomy']);
 }
});

test('Failed refresh prevents pending mutations, clears the wait barrier and never replays a write when a later refresh succeeds',async t=>{
 let sessions=0,failRefresh;const requests=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(url.endsWith('/session')){sessions++;if(sessions===2)return new Promise((resolve,reject)=>{failRefresh=()=>reject(Error('Isolated session network failure'));});return {ok:true,json:async()=>({csrf:'fixture-csrf-'+sessions,clock:{now:'2026-10-08T06:00:00Z'},user:{id:'fixture-client'},organizations:[]})};}requests.push(options);return {ok:true,json:async()=>({result:{saved:true}})};});
 const adapter=createHttpAdapter();await adapter.refreshSession();const refreshing=adapter.refreshSession(),saving=adapter.saveMenuGroup({organizationId:'fixture-org',label:'Retained draft'});const settled=Promise.allSettled([refreshing,saving]);failRefresh();const results=await settled;assert.ok(results.every(r=>r.status==='rejected'&&r.reason.code==='NETWORK_ERROR'));assert.equal(requests.length,0);await adapter.refreshSession();assert.equal(requests.length,0);await adapter.saveMenuGroup({organizationId:'fixture-org',label:'Explicit retry'});assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].body).input.label,'Explicit retry');
});
