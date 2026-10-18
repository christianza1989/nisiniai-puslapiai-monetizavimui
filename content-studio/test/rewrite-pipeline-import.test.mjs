import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivateImporter,prepareReviewedPage,assertPrivateSiteInvariant} from '../src/rewrite-pipeline/core-adapter.mjs';
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
