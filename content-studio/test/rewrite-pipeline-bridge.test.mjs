import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,mkdtemp,rm}from'node:fs/promises';import path from'node:path';
import{JsonPipelineStore,createPipelineState}from'../src/rewrite-pipeline/runner.mjs';import{HostBridge}from'../src/rewrite-pipeline/host-bridge.mjs';
const parent=path.resolve(import.meta.dirname,'../output/bridge-tests');await mkdir(parent,{recursive:true});const root=await mkdtemp(path.join(parent,'run-'));test.after(async()=>{assert(root.startsWith(parent+path.sep));await rm(root,{recursive:true,force:true});});
test('durable host request, single claim, exact actor/hash and answer',async()=>{
 const store=new JsonPipelineStore(path.join(root,'CURRENT.json'));await store.init(createPipelineState({siteId:'promedical',pages:[]}));const bridge=new HostBridge(store,{pollMs:5,timeoutMs:1000});
 const work=bridge.request('REVIEW_PAGE',{pageId:'one'});let request;while(!(request=(await bridge.pending())[0]))await new Promise(r=>setTimeout(r,5));
 await bridge.claim(request.id,'actual-editor');await assert.rejects(bridge.claim(request.id,'second-editor'));await assert.rejects(bridge.reply(request.id,'fake-editor',request.payloadSha256,{}));
 await bridge.reply(request.id,'actual-editor',request.payloadSha256,{decision:'accepted'});assert.equal((await work).decision,'accepted');await assert.rejects(bridge.reply(request.id,'actual-editor',request.payloadSha256,{}));
});
test('timeout records unknown without redispatching',async()=>{
 const store=new JsonPipelineStore(path.join(root,'UNKNOWN.json'));await store.init(createPipelineState({siteId:'promedical',pages:[]}));const bridge=new HostBridge(store,{pollMs:5,timeoutMs:30});const work=bridge.request('GEMINI_GENERATE',{batchId:'synthetic'});let request;while(!(request=(await bridge.pending())[0]))await new Promise(r=>setTimeout(r,5));await bridge.claim(request.id,'fixture-host');await assert.rejects(work,/unknown/);assert.equal((await store.read()).requests[0].status,'UNKNOWN');assert.equal((await bridge.pending()).length,0);await assert.rejects(bridge.claim(request.id,'fixture-host'));
});
test('unclaimed queue delay does not consume the claimed response deadline',async()=>{
 let document={requests:[]};const store={locked:async work=>work(),read:async()=>structuredClone(document),write:async value=>{document=structuredClone(value);}};
 const bridge=new HostBridge(store,{pollMs:2,timeoutMs:100});const work=bridge.request('GEMINI_GENERATE',{batchId:'waiting-fixture'});
 await new Promise(resolve=>setTimeout(resolve,180));const request=document.requests[0];assert.equal(request.status,'WAITING');
 await bridge.claim(request.id,'fixture-host');await new Promise(resolve=>setTimeout(resolve,20));await bridge.reply(request.id,'fixture-host',request.payloadSha256,{retained:true});
 assert.deepEqual(await work,{retained:true});assert.equal(document.requests[0].status,'ANSWERED');
});
test('internal cancellation before claim records NOT_SENT without inventing owner pause or authored UNKNOWN',async()=>{
 const store=new JsonPipelineStore(path.join(root,'NOT_SENT.json'));await store.init(createPipelineState({siteId:'promedical',pages:[]}));
 const controller=new AbortController(),bridge=new HostBridge(store,{pollMs:2,timeoutMs:100}),work=bridge.request('GEMINI_GENERATE',{batchId:'cancel-fixture'},{signal:controller.signal});
 while(!(await bridge.pending()).length)await new Promise(resolve=>setTimeout(resolve,2));controller.abort(new Error('Internal lane failure'));
 await assert.rejects(work,error=>error.code==='HOST_NOT_SENT');const request=(await store.read()).requests[0];
 assert.equal(request.status,'NOT_SENT');assert.match(request.reason,/Internal lane failure/);assert.doesNotMatch(request.reason,/Owner pause/);assert.equal(request.actor,undefined);assert.equal(request.claimedAt,undefined);
});
test('an answer racing the timeout recheck is returned instead of reported unknown',async()=>{
 let document={requests:[]},reads=0;
 const store={locked:async work=>work(),read:async()=>{
   reads++;if(reads===2)Object.assign(document.requests[0],{status:'CLAIMED',claimedAt:new Date(Date.now()-1000).toISOString()});
   if(reads===3)Object.assign(document.requests[0],{status:'ANSWERED',response:{retained:true}});
   return structuredClone(document);
 },write:async value=>{document=structuredClone(value);}};
 assert.deepEqual(await new HostBridge(store,{pollMs:1,timeoutMs:10}).request('GEMINI_GENERATE',{batchId:'race-fixture'}),{retained:true});
 assert.equal(document.requests[0].status,'ANSWERED');assert.equal(document.requests[0].unknownAt,undefined);
});
test('default host wait avoids repeated whole-state polling while retaining exact reply',async()=>{
 let document={requests:[]},reads=0;
 const store={locked:async work=>work(),read:async()=>{reads++;return structuredClone(document);},write:async value=>{document=structuredClone(value);}};
 const bridge=new HostBridge(store);assert.equal(bridge.pollMs,1000);assert.equal(bridge.timeoutMs,20*60_000);
 const pending=bridge.request('REVIEW_PAGE',{pageId:'fixture'});
 await new Promise(resolve=>setTimeout(resolve,300));
 assert.equal(reads,2,'one durable request read plus one status read; no 200ms idle polling');
 const request=document.requests[0];await bridge.claim(request.id,'fixture-editor');
 await bridge.reply(request.id,'fixture-editor',request.payloadSha256,{decision:'accepted'});
 assert.deepEqual(await pending,{decision:'accepted'});assert.equal(document.requests.length,1);
});
