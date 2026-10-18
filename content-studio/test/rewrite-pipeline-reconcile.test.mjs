import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JsonPipelineStore, createPipelineState, runRewritePipeline } from '../src/rewrite-pipeline/runner.mjs';
import { reconcileRetainedGeneration } from '../src/rewrite-pipeline/retained-reconciliation.mjs';
import { collectRetainedAuthorRejections } from '../src/rewrite-pipeline/host-ports.mjs';

// Synthetic captured UI shapes only: these fixtures assert no live Gemini proof.
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
async function fixture(t,{invalidPage=false}={}){
  const parent=path.resolve(import.meta.dirname,'../tmp/rewrite-pipeline-reconcile');await mkdir(parent,{recursive:true});
  const dir=await mkdtemp(path.join(parent,'fixture-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const put=async(name,value)=>{const file=path.join(dir,name),bytes=typeof value==='string'?value:JSON.stringify(value);await writeFile(file,bytes);return{path:file,sha256:hash(bytes)};};
  const specs=['a','b','c'].map(pageId=>({pageId,title:'Puslapis '+pageId,bodyParagraphCount:2,sourceReasonCount:1}));
  const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const block=(tag,text,anchors=[])=>({tag,text,html:`<${tag}>${anchors.length?escape(text).replace(anchors[0].label,`<a href="${anchors[0].url}">${anchors[0].label}</a>`):escape(text)}</${tag}>`,anchors});
  const blocks=specs.flatMap(s=>{const link={url:'https://manufacturer.example/'+s.pageId,label:'Gaminio kortelė'},sources=[{...link,reason:'Dokumente aprašomas šis konkretus gaminys.'}];return[
    block('h1',s.title),block('p',invalidPage&&s.pageId==='b'?'x'.repeat(161):'Trumpas aprašymas '+s.pageId+'.'),
    block('p','Pirmoji pastraipa '+s.pageId+'. Gaminio kortelė.',[link]),block('p','Antroji pastraipa '+s.pageId+'.'),block('p','PRIVATE_SOURCE_JSON: '+JSON.stringify(sources))];});
  const payload={batchId:'retained-batch',prompt:'BATCH_ID: retained-batch\nSynthetic original prompt.',pages:specs};
  const raw={at:'2026-10-18T12:00:01.000Z',url:'https://gemini.google.com/u/4/app/synthetic-retained',responseIndex:0,responseId:'retained-original',queryCount:1,responseCount:1,queries:[{text:payload.prompt}],stopControls:[],blocks,text:blocks.map(b=>b.text).join('\n\n'),html:blocks.map(b=>b.html).join(''),orderedAnchors:blocks.flatMap(b=>b.anchors)};
  const proofs=[];
  for(const stage of ['PRE','POST']){
    const artifacts=await Promise.all(['ax','dom','png'].map(kind=>put(stage+'.'+kind,'SYNTHETIC '+stage+' '+kind)));
    proofs.push({stage,mechanism:'ACTUAL_PLAYWRIGHT_UI',at:stage==='PRE'?'2026-10-18T12:00:00.000Z':'2026-10-18T12:00:02.000Z',accountPath:'/u/4',accountIdentity:'fixture@example.test',model:{label:'4 Argon',selected:true,enabled:true,expanded:true},thinking:{label:'Žema',selected:true,enabled:true,expanded:true},refs:Object.fromEntries(['ax','dom','png'].map((k,i)=>[k,artifacts[i].path])),artifacts,backendModelId:null});
  }
  const response={send:{status:'COMPLETED_RETAINED',uncertain:false,attemptId:'host-attempt',at:raw.at},captureRef:await put('raw.json',raw),promptRef:await put('prompt.txt',payload.prompt),modelProofRef:await put('proof.json',{proofs}),captureSelection:{responseIndex:0,responseId:raw.responseId,pages:specs},identity:{email:'fixture@example.test',name:'Synthetic fixture',accountPath:'/u/4',modelUi:'4 Argon',thinkingUi:'Žema',backendModelId:null}};
  const request={id:'original-request',kind:'GEMINI_GENERATE',payload,payloadSha256:hash(payload),status:'UNKNOWN',actor:'fixture-host',claimedAt:'2026-10-18T12:00:00.000Z',attemptId:'host-attempt',reason:'Historical timeout',unknownAt:'2026-10-18T12:00:03.000Z',sendIntent:{receipt:{durable:true,state:'ATTEMPTED',attemptId:'host-attempt',batchId:payload.batchId}}};
  const pipeline=createPipelineState({siteId:'promedical',pages:specs.map(capturePage=>({pageId:capturePage.pageId,capturePage}))});
  pipeline.status='IDLE_WITH_BLOCKERS';pipeline.runner={status:'IDLE'};pipeline.batches=[{batchId:payload.batchId,pageIds:specs.map(s=>s.pageId),status:'UNKNOWN',error:'Historical timeout',finishedAt:request.unknownAt}];
  for(const p of pipeline.pages){p.status='UNKNOWN';p.attempts=[{attemptId:'page-attempt-'+p.pageId,batchId:payload.batchId,startedAt:request.claimedAt}];p.generationResults=[{attemptId:p.attempts[0].attemptId,status:'UNKNOWN',at:request.unknownAt,error:'Historical timeout'}];}
  const file=path.join(dir,'state.json'),store=new JsonPipelineStore(file);await writeFile(file,JSON.stringify({pipeline,requests:[request],ownerControl:'immutable'}));
  const protectedRef=await put('protected-native-cp.json','UNTOUCHED NATIVE AND CHECKPOINT SENTINEL');
  return{dir,file,store,raw,request,response,put,proofs,protectedRef,input:{requestId:request.id,actor:request.actor,payloadSha256:request.payloadSha256,response}};
}

test('explicit late retention attaches the same three attempts while preserving UNKNOWN history and exact original words',async t=>{
  const f=await fixture(t),before=await f.store.read(),receipt=await reconcileRetainedGeneration(f.store,f.input),after=await f.store.read();
  assert.equal(receipt.status,'OBSERVED_RETAINED');assert.deepEqual(receipt.pages.map(p=>p.status),['GENERATED','GENERATED','GENERATED']);
  const {lateRetained,...oldRequest}=after.requests[0];assert.deepEqual(oldRequest,before.requests[0]);
  const {lateRetained:batchLink,...oldBatch}=after.pipeline.batches[0];assert.deepEqual(oldBatch,before.pipeline.batches[0]);assert.equal(batchLink.requestId,f.request.id);
  for(const [i,p]of after.pipeline.pages.entries()){
    assert.deepEqual(p.attempts,before.pipeline.pages[i].attempts);assert.deepEqual(p.generationResults[0],before.pipeline.pages[i].generationResults[0]);
    assert.equal(p.generationResults[1].status,'OBSERVED');assert.equal(p.candidates.length,1);assert.equal(p.candidates[0].attemptId,p.attempts[0].attemptId);
    assert.equal(p.candidates[0].candidate.original.body[0],`Pirmoji pastraipa ${p.pageId}. Gaminio kortelė.`);assert.equal(p.reviews.length,0);assert.equal(p.imports.length,0);
  }
  assert.equal(after.ownerControl,before.ownerControl);assert.equal(await readFile(f.protectedRef.path,'utf8'),'UNTOUCHED NATIVE AND CHECKPOINT SENTINEL');
  const bytes=await readFile(f.file,'utf8');assert.deepEqual(await reconcileRetainedGeneration(f.store,f.input),receipt);assert.equal(await readFile(f.file,'utf8'),bytes,'same actual response is an idempotent no-write');
});

test('UNKNOWN never replays automatically; reconciled review corrections retain their explicit OBSERVED link',async t=>{
  const f=await fixture(t);let generated=0;
  await runRewritePipeline({store:f.store,pollMs:1,ports:{generate:async()=>{generated++;},review:async()=>{throw Error('not generated');},importPages:async()=>{throw Error('no native');}}});
  assert.equal(generated,0);await reconcileRetainedGeneration(f.store,f.input);
  await f.store.update(doc=>{const p=doc.pipeline.pages[0];p.status='RETRY';p.reviews.push({candidateId:p.candidates[0].candidateId,decision:'rejected',reason:'Correct only description.'});});
  const doc=await f.store.read(),notes=collectRetainedAuthorRejections({pageIds:['a'],records:doc.pipeline.pages});
  assert.equal(notes.length,1);assert.equal(notes[0].kind,'review');assert.equal(doc.pipeline.pages[0].generationResults[0].status,'UNKNOWN');
  const unlinked=structuredClone(doc.pipeline.pages[0]);delete unlinked.candidates[0].reconciliation;
  assert.deepEqual(collectRetainedAuthorRejections({pageIds:['a'],records:[unlinked]}),[]);
  const laterUnknown=structuredClone(doc.pipeline.pages[0]);laterUnknown.generationResults.push({...laterUnknown.generationResults[0],at:'2026-10-18T12:01:00.000Z'});
  assert.deepEqual(collectRetainedAuthorRejections({pageIds:['a'],records:[laterUnknown]}),[]);
});

test('parser-invalid late page is held without author retry while valid siblings become reviewable',async t=>{
  const f=await fixture(t,{invalidPage:true});const receipt=await reconcileRetainedGeneration(f.store,f.input);
  assert.deepEqual(receipt.pages.map(p=>p.status),['GENERATED','HELD','GENERATED']);const p=(await f.store.read()).pipeline.pages[1];
  assert.equal(p.attempts.length,1);assert.equal(p.candidates.length,0);assert.equal(p.generationResults[1].status,'REJECTED');
});

test('actor, payload, host attempt, selected response and proof tampering reject without state mutation',async t=>{
  const f=await fixture(t),before=await readFile(f.file,'utf8');
  for(const change of [i=>{i.actor='other-host';},i=>{i.payloadSha256='0'.repeat(64);},i=>{i.response.send.attemptId='another-attempt';},i=>{i.response.captureSelection.responseId='another-response';},i=>{i.response.identity.email='other@example.test';},i=>{i.response.modelProofRef.sha256='0'.repeat(64);},i=>{i.response.captureRef.sha256='0'.repeat(64);}]){
    const input=structuredClone(f.input);change(input);await assert.rejects(reconcileRetainedGeneration(f.store,input));assert.equal(await readFile(f.file,'utf8'),before);
  }
  const bad=structuredClone(f.proofs);bad[1].model.label='3.5 Flash-Lite';const response={...f.response,modelProofRef:await f.put('fallback-proof.json',{proofs:bad})};
  await assert.rejects(reconcileRetainedGeneration(f.store,{...f.input,response}),/4 Argon/);assert.equal(await readFile(f.file,'utf8'),before);
});

test('new attempts, advanced pages, live runner or missing original send intent cannot be reconciled',async t=>{
  for(const change of [d=>{d.pipeline.pages[0].attempts.push({attemptId:'newer',batchId:'another-batch'});},d=>{d.pipeline.pages[0].status='COMPLETE';},d=>{d.pipeline.runner.status='RUNNING';},d=>{delete d.requests[0].sendIntent;},d=>{delete d.requests[0].actor;}]){
    const f=await fixture(t),document=await f.store.read();change(document);await writeFile(f.file,JSON.stringify(document));const before=await readFile(f.file,'utf8');
    await assert.rejects(reconcileRetainedGeneration(f.store,f.input));assert.equal(await readFile(f.file,'utf8'),before);
  }
});

test('different retained original cannot replace an existing same-request reconciliation',async t=>{
  const f=await fixture(t);await reconcileRetainedGeneration(f.store,f.input);const before=await readFile(f.file,'utf8');
  const raw={...f.raw,responseId:'different-actual-response'},response={...f.response,captureRef:await f.put('different.json',raw),captureSelection:{...f.response.captureSelection,responseId:raw.responseId}};
  await assert.rejects(reconcileRetainedGeneration(f.store,{...f.input,response}),/different retained response/);assert.equal(await readFile(f.file,'utf8'),before);
});

test('file-backed reconcile CLI is explicit, idempotent and creates no author attempt',async t=>{
  const f=await fixture(t),input=path.join(f.dir,'input.json');await writeFile(input,JSON.stringify({payloadSha256:f.input.payloadSha256,response:f.response}));
  const args=[fileURLToPath(new URL('../scripts/rewrite-pipeline.mjs',import.meta.url)),'reconcile-retained','--state',f.file,'--request',f.request.id,'--actor',f.request.actor,'--input',input];
  const first=spawnSync(process.execPath,args,{encoding:'utf8',timeout:10000});assert.equal(first.status,0,first.stderr);assert.equal(JSON.parse(first.stdout).pages.length,3);
  const before=await readFile(f.file,'utf8'),second=spawnSync(process.execPath,args,{encoding:'utf8',timeout:10000});assert.equal(second.status,0,second.stderr);assert.equal(await readFile(f.file,'utf8'),before);
});
