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
