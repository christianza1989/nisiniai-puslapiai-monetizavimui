import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createPrivateImporter,prepareReviewedPage,assertPrivateSiteInvariant} from '../src/rewrite-pipeline/core-adapter.mjs';
import {JsonPipelineStore,createPipelineState} from '../src/rewrite-pipeline/runner.mjs';
import {validateImportKey,effectiveImportKey,repairImportKey} from '../src/rewrite-pipeline/import-key.mjs';
const parent=path.resolve(import.meta.dirname,'../output/pipeline-tests');await mkdir(parent,{recursive:true});
const root=await mkdtemp(path.join(parent,'run-'));process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'out');
const model=await import('../src/model.mjs'),workflow=await import('../src/content-workflow.mjs'),registry=await import('../src/text-provenance.mjs');
test.after(async()=>{assert(root.startsWith(parent+path.sep));await rm(root,{recursive:true,force:true});});
const clone=structuredClone,hash=b=>createHash('sha256').update(b).digest('hex'),enc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const put=async(file,data)=>{await mkdir(path.dirname(file),{recursive:true});const bytes=typeof data==='string'?data:JSON.stringify(data);await writeFile(file,bytes);return{path:file,sha256:hash(bytes)};};
const note='Synthetic isolated review of this exact page; no live factual or browser acceptance is asserted.';
const evidence=Object.fromEntries(workflow.REVIEW_AREAS.map(a=>[a,note]));
const at=new Date().toISOString(),url='https://gemini.google.com/u/4/app/synthetic';
function bodyBlocks(title,sourceCount=1){const sources=Array.from({length:sourceCount},(_,i)=>({url:i?'https://manufacturer.example/item-'+i:'https://manufacturer.example/item',label:i?'Gamintojo dokumentas '+(i+1):'Gamintojo aprašas',reason:'Konkretus sintetinis gaminio aprašas naudojamas tik izoliuotam programos bandymui.'}));return[
 {tag:'H1',text:title,anchors:[]},{tag:'P',text:'Sintetinis palyginimo aprašymas.',anchors:[]},
 {tag:'P',text:'Pirmas sakinys. '+sources.map(s=>s.label).join('; ')+' paaiškina bandymo ribas.',anchors:sources.map(({url,label})=>({url,label}))},
 {tag:'P',text:'Antra pastraipa skirta tik programos bandymui.',anchors:[]},
 {tag:'P',text:'PRIVATE_SOURCE_JSON: '+JSON.stringify(sources),anchors:[]}].map(b=>{let html=enc(b.text);for(const a of b.anchors)html=html.replace(enc(a.label),`<a href="${a.url}">${enc(a.label)}</a>`);const tag=b.tag.toLowerCase();return{...b,html:`<${tag}>${html}</${tag}>`};});}
async function fixture(name='one',sourceCounts=[1,1]){
 const dir=path.join(root,name),ids=sourceCounts.map((_,i)=>'page-'+String.fromCharCode(97+i));
 const pages=ids.map((id,i)=>({id,siteId:'promedical',type:'faq',slug:id,title:'Old '+i,description:'Old',intent:'Old reader',body:[{type:'paragraph',text:'Old original'}],publishAt:'2026-10-01T00:00:00Z',media:[],links:[],externalLinks:[],linkSuggestions:[],networkLinkSuggestions:[],status:'draft',approval:null,publishedRevision:null,factChecks:[],createdAt:at,updatedAt:at}));
 const site={id:'promedical',canonicalHost:'promedical.lt',name:'Synthetic',offer:'Isolated fixture',facts:'Synthetic',audience:'Synthetic',locale:'lt-LT',timezone:'Europe/Vilnius',brand:{},contact:{email:'info@promedical.lt'},assets:[],pages};
 const nativePath=path.join(process.env.STUDIO_DATA_DIR,'sites/promedical.json');await put(nativePath,site);
 const checkpoints=[path.join(dir,'CP.json'),path.join(dir,'TES.json')];for(const file of checkpoints)await put(file,{work:{},publishingPause:'paused_by_owner'});
 const specs=pages.map((p,i)=>({pageId:p.id,title:'Synthetic '+name+' title '+i,bodyParagraphCount:2,sourceReasonCount:sourceCounts[i]}));
 const blocks=specs.flatMap(s=>bodyBlocks(s.title,s.sourceReasonCount));
 const raw={at,url,queryCount:1,responseCount:1,responseIndex:0,responseId:'synthetic-r1',queries:[{text:'synthetic prompt'}],stopControls:[],text:blocks.map(b=>b.text).join('\n\n'),html:blocks.map(b=>b.html).join(''),blocks,orderedAnchors:blocks.flatMap(b=>b.anchors)};
 const captureRef=await put(path.join(dir,'raw.json'),raw),promptRef=await put(path.join(dir,'prompt.txt'),'synthetic prompt');
 const refs=await Promise.all(['ax','dom','png'].map(t=>put(path.join(dir,t+'.txt'),'Synthetic '+t+' fixture, not actual UI proof.')));
 const proof={mechanism:'ACTUAL_PLAYWRIGHT_UI',at,accountPath:'/u/4',accountIdentity:'synthetic@example.com',model:{label:'4 Argon',selected:true,enabled:true,expanded:true},thinking:{label:'Žema',selected:true,enabled:true,expanded:true},refs:Object.fromEntries(['ax','dom','png'].map((t,i)=>[t,refs[i].path])),artifacts:refs};
 const modelProofRef=await put(path.join(dir,'proof.json'),{proofs:[{...proof,stage:'PRE'},{...proof,stage:'POST'}]});
 const records=[];for(let i=0;i<pages.length;i++){
  const own=bodyBlocks(specs[i].title,specs[i].sourceReasonCount),original={title:specs[i].title,description:own[1].text,body:own.slice(2,4).map(b=>b.text),sourceItems:JSON.parse(own[4].text.slice('PRIVATE_SOURCE_JSON:'.length))};
  const factsRef=await put(path.join(dir,pages[i].id+'-facts.json'),{pageId:pages[i].id,originalCanonical:model.revisionHash(pages[i]),sourceReview:{wholeDocumentsRead:true,reviewer:'synthetic-editor'}});
  records.push({pageId:pages[i].id,input:{key:'Synthetic'+i+'WrittenDraft',pageId:pages[i].id,originalCanonical:model.revisionHash(pages[i]),intent:'Sintetinis pasirinkimo klausimas',links:[],mediaPolicy:'KEEP_EXACT',factsRef,capturePage:specs[i]},candidates:[{candidateId:'candidate-'+i,captureRef,candidate:{original,orderedBodyLinks:own.flatMap(b=>b.anchors),captureSelection:{responseIndex:0,responseId:'synthetic-r1',pages:specs},promptRef,modelProofRef,authoredAt:at,conversationUrl:url,identity:{accountPath:'/u/4',email:'synthetic@example.com',name:'Synthetic',modelUi:'4 Argon',thinkingUi:'Žema',backendModelId:null}}}],reviews:[{candidateId:'candidate-'+i,decision:'accepted',reviewer:'synthetic-editor',allH1DescriptionBodyReasonsPersonallyRead:true,factsAndLanguageAccepted:true,evidence}]});
 }
 const config={siteId:'promedical',publication:'paused_by_owner',newPublicReleaseAllowed:false,nativePath,checkpoints,outputDir:path.join(dir,'result'),sharedLockPath:path.join(dir,'writer.lock'),previewOrigin:'http://127.0.0.1:9130',inventory:1909,legacyFullGuides:2,prepared:336};return{site,records,config};
}
const dom=async(request,bad)=>{const site=await model.getSite('promedical');return{nativeInput:request.nativeInput,pages:request.pages.filter(p=>p.pageId!==bad).map(item=>{const p=site.pages.find(p=>p.id===item.pageId);return{pageId:p.id,canonicalRevision:item.canonicalRevision,viewports:[1440,390].map(w=>({at:new Date().toISOString(),url:item.url,innerWidth:w,innerHeight:1000,dpr:1,clientWidth:w,scrollWidth:w,overflowX:0,h1:p.title,description:p.description,body:p.body.map(b=>b.text),sourceItems:p.externalLinks.map(({url,label,reason})=>({url,label,reason})),orderedLinks:[{url:'mailto:info@promedical.lt',label:'Teirautis el. paštu'},...p.externalLinks.map(({url,label})=>({url,label}))],images:[]}))};})};};
const keyFailure='The expression evaluated to a falsy value:\n\n  assert(/WrittenDraft$/.test(p.key))\n';
async function keyFixture(name,{queued=false}={}){
 const f=await fixture('key-'+name),filename=path.join(f.config.outputDir,'state.json');
 const store=new JsonPipelineStore(filename);await store.init(createPipelineState({siteId:'promedical',pages:[f.records[0].input]}));
 await store.update(doc=>{
  const p=doc.pipeline.pages[0];p.input.key='synthetic_snake_case';
  if(!queued){p.attempts=[{attemptId:'original-attempt'}];p.candidates=clone(f.records[0].candidates);p.reviews=clone(f.records[0].reviews);p.status='HELD_IMPORT';p.imports=[{status:'failed',error:keyFailure,candidateId:p.candidates[0].candidateId}];}
 });
 return{...f,store,filename,input:{pageId:f.records[0].pageId,candidateId:queued?undefined:f.records[0].candidates[0].candidateId,actor:'synthetic-operator',reason:'Repair only the invalid checkpoint key suffix; no authored word changes.'}};
}

// Synthetic known-completed/model-rejected evidence; never a live UI or prose acceptance.
async function rejectedKeyFixture(name){
 const f=await keyFixture('rejected-'+name,{queued:true}),batchId='synthetic-rejected-batch',prompt='BATCH_ID: '+batchId+'\nSynthetic prompt';
 const spec=f.records[0].input.capturePage,blocks=bodyBlocks(spec.title),raw={at,url,batchId,responseIndex:0,responseId:'synthetic-rejected-response',queryCount:1,responseCount:1,queries:[{text:prompt}],stopControls:[],stopCount:0,completionMarker:true,text:blocks.map(b=>b.text).join('\n\n'),html:blocks.map(b=>b.html).join(''),blocks,orderedAnchors:blocks.flatMap(b=>b.anchors)};
 const dir=path.join(f.config.outputDir,'rejected-proof'),captureRef=await put(path.join(dir,'raw.json'),raw),promptRef=await put(path.join(dir,'prompt.txt'),prompt);
 const observedProofs=await Promise.all(['pre-ax','pre-dom','pre-image','post-ax','post-dom','post-image'].map(n=>put(path.join(dir,n+'.txt'),'Synthetic artifact '+n+'; not actual UI proof.')));
 const payload={batchId,prompt,pages:[spec]},response={send:{status:'COMPLETED_RESPONSE_MODEL_UNACCEPTED',uncertain:false,at,attemptId:'host-attempt'},captureRef,promptRef,observedProofs,accepted:false};
 const request={id:'synthetic-request',kind:'GEMINI_GENERATE',payload,payloadSha256:hash(JSON.stringify(payload)),status:'ANSWERED',actor:f.input.actor,claimedAt:at,answeredAt:at,attemptId:'host-attempt',sendIntent:{kind:'GEMINI_SEND_INTENT',preparedId:'prepared-one',batchId,accountPath:'/u/4',retryAllowed:false},response};
 const document=await f.store.read(),p=document.pipeline.pages[0];p.status='UNKNOWN';p.attempts=[{attemptId:'page-attempt',batchId,startedAt:at}];p.generationResults=[{attemptId:'page-attempt',status:'UNKNOWN',at,error:'A query acknowledgement alone is not a retained response'}];
 document.pipeline.batches=[{batchId,pageIds:[p.pageId],status:'UNKNOWN',startedAt:at,error:p.generationResults[0].error}];document.requests=[request];await writeFile(f.filename,JSON.stringify(document));
 f.config.immutablePins=[await put(path.join(dir,'public.txt'),'Synthetic immutable public package')];return f;
}

test('known completed rejected-model key repair stays UNKNOWN and preserves input, request and every original history',async()=>{
 const f=await rejectedKeyFixture('preserved'),before=await f.store.read(),files=[f.config.nativePath,...f.config.checkpoints,f.config.immutablePins[0].path],bytes=await Promise.all(files.map(file=>readFile(file)));
 const receipt=await repairImportKey(f.store,f.input,{model,config:f.config}),after=await f.store.read(),record=after.pipeline.pages[0];
 assert.equal(receipt.phase,'model_rejected');assert.equal(record.status,'UNKNOWN');assert.equal(record.imports.length,1);assert.equal(receipt.modelRejection.requestId,'synthetic-request');
 assert.deepEqual(after.requests,before.requests);assert.deepEqual(after.pipeline.batches,before.pipeline.batches);
 for(const field of ['input','attempts','generationResults','candidates','reviews'])assert.deepEqual(record[field],before.pipeline.pages[0][field]);
 assert.deepEqual(await Promise.all(files.map(file=>readFile(file))),bytes);assert.equal(effectiveImportKey(record),'synthetic_snake_caseWrittenDraft');
 const later=clone(record);later.attempts.push({attemptId:'separately-authorized-later-attempt',batchId:'new-batch'});assert.equal(effectiveImportKey(later),receipt.after,'Repair remains valid metadata, not a retry authorization');
 for(const change of [r=>r.imports[0].modelRejection.uncertain=true,r=>r.imports[0].modelRejection.originalResultSha256='0'.repeat(64),r=>r.imports[0].modelRejection.attemptId='wrong',r=>r.imports.push(clone(r.imports[0]))]){
  const tampered=clone(record);change(tampered);assert.throws(()=>effectiveImportKey(tampered));
 }
 await assert.rejects(repairImportKey(f.store,f.input,{model,config:f.config}),/already repaired/);
});

test('rejected-model metadata repair rejects ACK, uncertain, unclaimed, altered pins/query/completion and advanced histories',async()=>{
 const scenarios={
  ack:d=>{d.requests[0].response.send.status='QUERY_ACKNOWLEDGED';},
  uncertain:d=>{d.requests[0].response.send.uncertain=true;},
  trueUnknown:d=>{d.requests[0].status='UNKNOWN';},
  noActor:d=>{delete d.requests[0].actor;},
  noIntent:d=>{delete d.requests[0].sendIntent;},
  wrongAttempt:d=>{d.requests[0].response.send.attemptId='other';},
  payloadTamper:d=>{d.requests[0].payload.prompt+=' changed';},
  captureHash:d=>{d.requests[0].response.captureRef.sha256='0'.repeat(64);},
  promptHash:d=>{d.requests[0].response.promptRef.sha256='0'.repeat(64);},
  extraAttempt:d=>{d.pipeline.pages[0].attempts.push({attemptId:'later',batchId:'later'});},
  extraResult:d=>{d.pipeline.pages[0].generationResults.push(clone(d.pipeline.pages[0].generationResults[0]));},
  extraBatch:d=>{d.pipeline.batches.push({...d.pipeline.batches[0],batchId:'later'});},
  extraRequest:d=>{d.requests.push({...d.requests[0],id:'other'});},
  candidate:d=>{d.pipeline.pages[0].candidates=[{candidateId:'already-captured'}];},
  reviewed:d=>{d.pipeline.pages[0].reviews=[{decision:'accepted'}];},
  imported:d=>{d.pipeline.pages[0].imports=[{status:'failed',error:'Already imported; do not repeat'}];},
  collision:d=>{d.pipeline.pages.push({pageId:'other',input:{key:'synthetic_snake_caseWrittenDraft'}});},
  complete:d=>{d.pipeline.pages[0].status='COMPLETE';},
 };
 for(const[name,change]of Object.entries(scenarios)){
  const f=await rejectedKeyFixture(name),d=await f.store.read();change(d);await writeFile(f.filename,JSON.stringify(d));const before=await readFile(f.filename);
  await assert.rejects(repairImportKey(f.store,f.input,{model,config:f.config}),undefined,name);assert.deepEqual(await readFile(f.filename),before,name);
 }
 for(const[name,change]of Object.entries({query:r=>{r.queries[0].text+=' wrong';},queryProjection:r=>{r.queryText='wrong';},multiple:r=>{r.queryCount=2;r.responseCount=2;r.queries.push({text:'another query'});},batch:r=>{r.batchId='wrong';},incomplete:r=>{r.completionMarker=false;},stop:r=>{r.stopControls=['Stop'];r.stopCount=1;},whole:r=>{r.text+=' unmatched';},account:r=>{r.url='https://gemini.google.com/u/5/app/synthetic';}})){
  const f=await rejectedKeyFixture(name),d=await f.store.read(),pin=d.requests[0].response.captureRef,r=JSON.parse(await readFile(pin.path));change(r);d.requests[0].response.captureRef=await put(pin.path,r);await writeFile(f.filename,JSON.stringify(d));const before=await readFile(f.filename);
  await assert.rejects(repairImportKey(f.store,f.input,{model,config:f.config}),undefined,name);assert.deepEqual(await readFile(f.filename),before,name);
 }
 for(const[name,change]of Object.entries({facts:async f=>writeFile(f.records[0].input.factsRef.path,'changed facts'),public:async f=>writeFile(f.config.immutablePins[0].path,'changed public'),native:async f=>{const s=JSON.parse(await readFile(f.config.nativePath));s.pages[0].title='Already changed';await writeFile(f.config.nativePath,JSON.stringify(s));},checkpoint:async f=>writeFile(f.config.checkpoints[0],JSON.stringify({work:{existing:{pageId:f.input.pageId}}})),actor:async f=>{f.input.actor='another-operator';}})){
  const f=await rejectedKeyFixture(name);await change(f);const before=await readFile(f.filename);await assert.rejects(repairImportKey(f.store,f.input,{model,config:f.config}),undefined,name);assert.deepEqual(await readFile(f.filename),before,name);
 }
});

test('rejected-model key repair atomically rechecks the request and keeps native/public guards after the metadata write',async()=>{
 const race=await rejectedKeyFixture('request-race'),originalUpdate=race.store.update.bind(race.store);
 race.store.update=async mutator=>{const d=await race.store.read();d.requests[0].actor='other-host';await writeFile(race.filename,JSON.stringify(d));return originalUpdate(mutator);};
 await assert.rejects(repairImportKey(race.store,race.input,{model,config:race.config}),/changed during metadata repair/);
 const unchanged=await race.store.read();assert.equal(unchanged.pipeline.pages[0].status,'UNKNOWN');assert.equal(unchanged.pipeline.pages[0].imports.length,0);
 const changed=await rejectedKeyFixture('public-after'),update=changed.store.update.bind(changed.store),before=await changed.store.read();
 changed.store.update=async mutator=>{const result=await update(mutator);await writeFile(changed.config.immutablePins[0].path,'Concurrent public change');return result;};
 await assert.rejects(repairImportKey(changed.store,changed.input,{model,config:changed.config}),/Repair preimage changed/);
 const after=await changed.store.read();assert.equal(after.pipeline.pages[0].status,'UNKNOWN');assert.deepEqual(after.pipeline.pages[0].attempts,before.pipeline.pages[0].attempts);assert.deepEqual(after.pipeline.pages[0].generationResults,before.pipeline.pages[0].generationResults);
});

test('invalid import keys fail enqueue before any author work and leave state bytes unchanged',async()=>{
 for(const key of ['snake_case','',null,'bad keyWrittenDraft'])assert.throws(()=>validateImportKey(key),/INVALID_IMPORT_KEY/);
 assert.equal(validateImportKey('snake_caseWrittenDraft'),'snake_caseWrittenDraft');
 assert.throws(()=>createPipelineState({siteId:'promedical',pages:[{pageId:'a',key:'bad'}]}),/INVALID_IMPORT_KEY/);
 const f=await keyFixture('enqueue',{queued:true}),input=path.join(f.config.outputDir,'bad-enqueue.json');
 const before=await readFile(f.filename);await writeFile(input,JSON.stringify({pages:[{pageId:'new-page',key:'invalid_key'}]}));
 const result=spawnSync(process.execPath,[path.resolve(import.meta.dirname,'../scripts/rewrite-pipeline.mjs'),'enqueue','--state',f.filename,'--input',input],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/INVALID_IMPORT_KEY/);assert.deepEqual(await readFile(f.filename),before);
});

test('explicit key-only repair preserves accepted originals/history then imports without another author or review',async()=>{
 const f=await keyFixture('accepted'),before=await f.store.read(),shared=await Promise.all([f.config.nativePath,...f.config.checkpoints].map(file=>readFile(file)));
 const receipt=await repairImportKey(f.store,f.input,{model,config:f.config}),after=await f.store.read(),record=after.pipeline.pages[0];
 assert.equal(record.status,'ACCEPTED');assert.equal(record.imports.length,2);assert.deepEqual(record.imports[0],before.pipeline.pages[0].imports[0]);
 for(const key of ['input','attempts','candidates','reviews','generationResults'])assert.deepEqual(record[key],before.pipeline.pages[0][key]);
 assert.equal(receipt.after,'synthetic_snake_caseWrittenDraft');assert.equal(effectiveImportKey(record),receipt.after);assert.equal(receipt.actor,'synthetic-operator');
 assert.deepEqual(await Promise.all([f.config.nativePath,...f.config.checkpoints].map(file=>readFile(file))),shared);
 await assert.rejects(repairImportKey(f.store,f.input,{model,config:f.config}));
 const wrong=clone(record);wrong.candidates.at(-1).candidateId='other-candidate';assert.throws(()=>effectiveImportKey(wrong),/another candidate/);
 const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:r=>dom(r),guardEpoch:async()=>{},refreshReaders:async()=>{}});
 const result=await run([record],{runId:'synthetic-repair'});assert.equal(result.outcomes[0].status,'complete');
 for(const file of f.config.checkpoints)assert.equal(JSON.parse(await readFile(file)).work[receipt.after].pageId,record.pageId);
});

test('key repair refuses UNKNOWN, COMPLETE, other errors, stale reviews and every partial-native signal',async()=>{
 const scenarios={
  unknown:async f=>f.store.update(d=>{d.pipeline.pages[0].status='UNKNOWN';}),
  unknownImport:async f=>f.store.update(d=>{d.pipeline.pages[0].status='UNKNOWN_IMPORT';}),
  complete:async f=>f.store.update(d=>{d.pipeline.pages[0].status='COMPLETE';}),
  alreadyImported:async f=>{const d=await f.store.read();d.pipeline.pages[0].imports[0].error='Already imported; do not repeat';await writeFile(f.filename,JSON.stringify(d));},
  staleReview:async f=>{const d=await f.store.read();d.pipeline.pages[0].reviews[0].candidateId='other';await writeFile(f.filename,JSON.stringify(d));},
  nativeChanged:async f=>{const s=JSON.parse(await readFile(f.config.nativePath));s.pages[0].title='Changed after partial intake';await writeFile(f.config.nativePath,JSON.stringify(s));},
  checkpointEntry:async f=>{const c=JSON.parse(await readFile(f.config.checkpoints[1]));c.work.anyKey={pageId:f.input.pageId};await writeFile(f.config.checkpoints[1],JSON.stringify(c));},
  intakeAttempted:async f=>writeFile(path.join(f.config.outputDir,'RESULT.json'),JSON.stringify({epochs:[{status:'PARTIAL',pages:[{pageId:f.input.pageId,status:'INTAKE_ATTEMPTED'}]}]})),
  unresolvedEpoch:async f=>writeFile(path.join(f.config.outputDir,'RESULT.json'),JSON.stringify({epochs:[{status:'NEEDS_INSPECTION',pages:[]}]})),
  otherImporter:async f=>writeFile(f.config.sharedLockPath,JSON.stringify({token:'other-owner'})),
 };
 for(const[name,change]of Object.entries(scenarios)){
  const f=await keyFixture(name);await change(f);const before=await f.store.read(),native=await readFile(f.config.nativePath);
  await assert.rejects(repairImportKey(f.store,f.input,{model,config:f.config}),undefined,name);
  assert.deepEqual(await f.store.read(),before,name);assert.deepEqual(await readFile(f.config.nativePath),native,name);
  if(name==='otherImporter')assert.equal(JSON.parse(await readFile(f.config.sharedLockPath)).token,'other-owner');
 }
});

test('unattempted QUEUED key repair stays queued and cannot affect an allocated or uncertain author request',async()=>{
 const f=await keyFixture('queued',{queued:true}),before=await f.store.read();
 const receipt=await repairImportKey(f.store,f.input,{model,config:f.config}),after=await f.store.read(),record=after.pipeline.pages[0];
 assert.equal(receipt.phase,'before_author');assert.equal(record.status,'QUEUED');assert.deepEqual(record.input,before.pipeline.pages[0].input);
 assert.equal(record.attempts.length,0);assert.equal(record.candidates.length,0);assert.equal(effectiveImportKey(record),receipt.after);
 const busy=await keyFixture('queued-waiting',{queued:true}),waiting=await busy.store.read();waiting.requests=[{kind:'GEMINI_GENERATE',status:'WAITING',payload:{pages:[{pageId:busy.input.pageId}]}}];await writeFile(busy.filename,JSON.stringify(waiting));
 const preserved=await busy.store.read();await assert.rejects(repairImportKey(busy.store,busy.input,{model,config:busy.config}),/author request/);assert.deepEqual(await busy.store.read(),preserved);
});

test('one command imports real isolated Core pages, binds reviews and both checkpoints',async()=>{
 const f=await fixture('complete'),guards=[],readers=[];
 const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:r=>dom(r),guardEpoch:async p=>guards.push(p.phase),refreshReaders:async p=>readers.push(p)});
 const result=await run(f.records,{runId:'synthetic'});assert(result.outcomes.every(o=>o.status==='complete'));assert.deepEqual(guards,['before','after']);assert.equal(readers.length,1);
 const site=await model.getSite('promedical');for(const p of site.pages)assert(workflow.reviewCurrent(site,p,model.revisionHash(p)));
 const cp=JSON.parse(await readFile(f.config.checkpoints[0])),tes=JSON.parse(await readFile(f.config.checkpoints[1]));assert.deepEqual(cp,tes);assert.equal(cp.work.newReviewedDrafts,2);assert.equal(cp.work.remainingFullRewrites,1905);
 assert.equal((await registry.verifyTextProvenance('promedical')).status,'PASS_REVISION_AND_ARTIFACT_INTEGRITY');await assert.rejects(access(f.config.sharedLockPath));
});
test('4/4/3 source pages roundtrip through real isolated Core, DOM and current provenance without truncation',async()=>{
 const f=await fixture('four-source-mixed',[4,4,3]),originals=f.records.map(r=>clone(r.candidates[0].candidate.original.sourceItems));
 const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:r=>dom(r),guardEpoch:async()=>{},refreshReaders:async()=>{}});
 const result=await run(f.records,{runId:'synthetic-four-sources'});assert.deepEqual(result.outcomes.map(o=>o.status),['complete','complete','complete']);
 const site=await model.getSite('promedical');for(const[i,p]of site.pages.entries()){
  assert.deepEqual(p.externalLinks.map(({url,label,reason})=>({url,label,reason})),originals[i]);
  assert(workflow.reviewCurrent(site,p,model.revisionHash(p)));assert.equal(p.externalLinks.length,[4,4,3][i]);
 }
 const cp=JSON.parse(await readFile(f.config.checkpoints[0])),tes=JSON.parse(await readFile(f.config.checkpoints[1]));assert.deepEqual(cp,tes);assert.equal(cp.work.newReviewedDrafts,3);
 assert.equal((await registry.verifyTextProvenance('promedical')).status,'PASS_REVISION_AND_ARTIFACT_INTEGRITY');
});
test('eleven sources fail before native writes and explicit count mismatch cannot drop a source',async()=>{
 for(const[mode,counts]of[['above-bound',[11,11]],['manifest-mismatch',[4,4]]]){
  const f=await fixture(mode,counts),before=await readFile(f.config.nativePath);
  if(mode==='manifest-mismatch')for(const record of f.records){record.input.capturePage.sourceReasonCount=3;record.candidates[0].candidate.captureSelection.pages.forEach(p=>p.sourceReasonCount=3);}
  const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:()=>assert.fail('No DOM for failed preflight'),guardEpoch:async()=>{},refreshReaders:()=>assert.fail('No readers for failed preflight')});
  const result=await run(f.records);assert(result.outcomes.every(o=>o.status==='failed'));assert.deepEqual(await readFile(f.config.nativePath),before);
 }
});
test('bad DOM page remains pending while good sibling is finalized',async()=>{
 const f=await fixture('partial');const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:r=>dom(r,'page-a'),guardEpoch:async()=>{},refreshReaders:async()=>{}});
 const result=await run(f.records,{runId:'synthetic-partial'});assert.equal(result.outcomes.find(o=>o.pageId==='page-a').status,'failed');assert.equal(result.outcomes.find(o=>o.pageId==='page-b').status,'complete');
 const cp=JSON.parse(await readFile(f.config.checkpoints[0]));assert.equal(cp.work.newReviewedDrafts,1);assert.equal(cp.work.currentPrivateReviewPending,1);
});
test('preflight rejects same key, stale facts and short evidence before native writes',async()=>{
 const f=await fixture('reject'),before=await readFile(f.config.nativePath),run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:()=>assert.fail(),guardEpoch:async()=>{},refreshReaders:()=>assert.fail()});
 const dup=clone(f.records);dup[1].input.key=dup[0].input.key;await assert.rejects(run(dup));assert.deepEqual(await readFile(f.config.nativePath),before);
 const invalid=clone(f.records);invalid.forEach(r=>r.reviews[0].evidence.facts='short');const result=await run(invalid);assert(result.outcomes.every(o=>o.status==='failed'));assert.deepEqual(await readFile(f.config.nativePath),before);
});
test('artifact mismatch and altered original cannot acquire Gemini provenance',async()=>{
 const f=await fixture('tamper'),before=await readFile(f.config.nativePath);f.records.forEach(r=>r.candidates[0].candidate.original.body[0]='Invented substitute paragraph.');
 const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:()=>assert.fail(),guardEpoch:async()=>{},refreshReaders:()=>assert.fail()});const result=await run(f.records);assert(result.outcomes.every(o=>o.status==='failed'));assert.deepEqual(await readFile(f.config.nativePath),before);
});
test('an unexpected post-write exception retains native lease and compact recovery evidence',async()=>{
 const f=await fixture('crash');const run=createPrivateImporter({model,workflow,registry,config:f.config,captureDom:async()=>{throw Error('MCP connection lost');},guardEpoch:async()=>{},refreshReaders:()=>assert.fail()});
 await assert.rejects(run(f.records),/MCP/);await access(f.config.sharedLockPath);const result=JSON.parse(await readFile(path.join(f.config.outputDir,'RESULT.json')));assert.equal(result.epochs[0].status,'NEEDS_INSPECTION');assert.equal(result.epochs[0].before.pages.length,2);assert(!result.epochs[0].before.checkpoints);await assert.rejects(run(f.records),/EEXIST/);
});
