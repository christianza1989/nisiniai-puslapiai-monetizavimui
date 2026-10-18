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
 const store=new JsonPipelineStore(path.join(root,'UNKNOWN.json'));await store.init(createPipelineState({siteId:'promedical',pages:[]}));const bridge=new HostBridge(store,{pollMs:5,timeoutMs:30});await assert.rejects(bridge.request('GEMINI_GENERATE',{batchId:'synthetic'}),/unknown/);assert.equal((await store.read()).requests[0].status,'UNKNOWN');assert.equal((await bridge.pending()).length,0);
});
