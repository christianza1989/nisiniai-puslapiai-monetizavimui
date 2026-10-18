import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPipelineState, JsonPipelineStore, runRewritePipeline } from '../src/rewrite-pipeline/runner.mjs';
import { HostBridge } from '../src/rewrite-pipeline/host-bridge.mjs';
import { geminiBrowserFunctionsSource } from '../src/rewrite-pipeline/gemini-ui.mjs';
import { validateImportKey } from '../src/rewrite-pipeline/import-key.mjs';

const [command,...args]=process.argv.slice(2);
const option=name=>{const i=args.indexOf('--'+name);return i<0?undefined:args[i+1];};
const state=option('state');assert(state,'--state existing CURRENT_LEAN_BATCH.json required');
const store=new JsonPipelineStore(path.resolve(state)),bridge=new HostBridge(store);
const stdin=async()=>{let text='';for await(const part of process.stdin)text+=part;return JSON.parse(text);};
// Large exact prompts/proofs belong in files, never shell arguments or a PTY.
const payload=async()=>option('input')?JSON.parse(await readFile(option('input'),'utf8')):stdin();
const output=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n');
if(command==='init'){
  const input=JSON.parse(await readFile(option('input'),'utf8'));
  for (const page of input.pages) if (page.factsReady !== false) validateImportKey(page.key);
  output((await store.init(createPipelineState(input))).pipeline);
}else if(command==='enqueue'){
  const input=JSON.parse(await readFile(option('input'),'utf8'));
  for (const page of input.pages) if (page.factsReady !== false) validateImportKey(page.key);
  await store.update(doc=>{const next=createPipelineState({siteId:doc.pipeline.siteId,pages:input.pages,publication:doc.pipeline.publication});const existing=new Set(doc.pipeline.pages.map(p=>p.pageId));for(const p of next.pages)assert(!existing.has(p.pageId),'Page already queued/attempted/completed; preserve its history');doc.pipeline.pages.push(...next.pages);});
  output({queued:input.pages.length});
}else if(command==='repair-import-key'){
  const config=JSON.parse(await readFile(option('config'),'utf8'));
  const {verifyPin}=await import('../src/rewrite-pipeline/core-adapter.mjs');await verifyPin(config.portsModule);
  const {createPorts}=await import(pathToFileURL(config.portsModule.path));
  const ports=await createPorts({store,bridge,config});assert.equal(typeof ports.repairImportKey,'function');
  output(await ports.repairImportKey({pageId:option('page'),candidateId:option('candidate'),actor:option('actor'),reason:option('reason')}));
}else if(command==='next')output(await bridge.pending());
else if(command==='claim')output(await bridge.claim(option('request'),option('actor')));
else if(command==='reply'){const value=await payload();await bridge.reply(option('request'),option('actor'),value.payloadSha256,value.response);output({saved:true});}
else if(command==='reconcile-retained'){
  const value=await payload(),{reconcileRetainedGeneration}=await import('../src/rewrite-pipeline/retained-reconciliation.mjs');
  output(await reconcileRetainedGeneration(store,{requestId:option('request'),actor:option('actor'),payloadSha256:value.payloadSha256,response:value.response}));
}
else if(command==='send-intent'){
  const prepared=await payload(),dispatchFile=option('dispatch-file');
  if(dispatchFile){
    let exists=false;try{await access(dispatchFile);exists=true;}catch(error){if(error.code!=='ENOENT')throw error;}
    assert(!exists,'Dispatch file already exists; observe only, never overwrite/retry');
  }
  const receipt=await bridge.recordSendIntent(option('request'),option('actor'),prepared);
  // A failure after persistence leaves the durable attempt blocking all replay.
  // This creates source for the OFFICIAL MCP tool; it never executes a browser.
  if(dispatchFile)await writeFile(dispatchFile,`async (page) => {\n${geminiBrowserFunctionsSource()}\nreturn dispatchPreparedGeminiSend(page, ${JSON.stringify({prepared,persistedIntent:receipt})});\n}\n`,{encoding:'utf8',flag:'wx'});
  output({...receipt,...(dispatchFile?{dispatchFile:path.resolve(dispatchFile)}:{})});
}
else if(command==='status'){
  const p=(await store.read()).pipeline;
  output({status:p.status,publication:p.publication,counts:p.pages.reduce((c,p)=>(c[p.status]=(c[p.status]??0)+1,c),{}),pendingRequests:await bridge.pending(),runner:p.runner});
}else if(command==='pause'){await store.update(doc=>{doc.pipeline.pauseRequested=true;});output({pauseRequested:true});}
else if(command==='resume'){await store.update(doc=>{doc.pipeline.pauseRequested=false;});output({pauseRequested:false,runnerStarted:false});}
else if(command==='run'){
  const config=JSON.parse(await readFile(option('config'),'utf8'));assert(config.portsModule,'Pinned real ports module required');
  const pollMs=config.pollMs??1000;assert(Number.isInteger(pollMs)&&pollMs>0,'pollMs must be a positive integer');bridge.pollMs=pollMs;
  const {verifyPin}=await import('../src/rewrite-pipeline/core-adapter.mjs');await verifyPin(config.portsModule);
  const {createPorts}=await import(pathToFileURL(config.portsModule.path));
  const controller=new AbortController();for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>controller.abort());
  const timer=setInterval(async()=>{try{if((await store.read()).pipeline.pauseRequested)controller.abort(new Error('Owner pause requested'));}catch(error){controller.abort(error);}},pollMs);
  try{const ports=await createPorts({store,bridge,config});output(await runRewritePipeline({store,ports,signal:controller.signal,maxBatches:config.maxBatches??2,maxAttemptsPerPage:config.maxAttemptsPerPage??2,batchSize:3,pollMs,importCoalesceMs:config.importCoalesceMs??3000}));}
  finally{clearInterval(timer);}
}else throw new Error('Commands: init, enqueue, repair-import-key, run, next, claim, send-intent, reply, reconcile-retained, status, pause, resume. Real host tools answer requests; no automated Gemini retry.');
