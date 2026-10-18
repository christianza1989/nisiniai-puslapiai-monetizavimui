import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm,symlink,unlink} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {stableV2,validateV2Package} from '../src/content-package-v2.mjs';
import {verifyContentRelease} from '../src/content-release.mjs';
import {IMAGE_POLICY} from '../src/image-pipeline.mjs';

const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
const rawHash=v=>createHash('sha256').update(v).digest('hex');
async function deferredCopyFixture(t) {
  const f=await sandbox(t);
  const ids=f.mutate(`const s=await m.getSite(siteId),home=s.pages.find(p=>p.type==='home'),future=s.pages.find(p=>p.type==='guide'&&!p.body.length),hub=s.pages.find(p=>p.type==='index');
    const link=p=>({type:'link',text:p.title,target:{kind:'page',pageId:p.id}});
    await m.editPage(siteId,home.id,{body:[{type:'richParagraph',content:[link(future),{type:'text',text:' ir '},link(hub)]}],
      links:[{targetPageId:future.id,label:'Būsimas gidas'},{targetPageId:hub.id,label:'Gidai'}],
      linkSuggestions:[{targetPageId:future.id,label:'Būsimas gidas',reason:'Dar neparengtas'},{targetPageId:hub.id,label:'Gidai',reason:'Esamas indeksas'}],
      editorial:{...home.editorial,relatedPageIds:[future.id,hub.id]}});
    console.log(JSON.stringify({home:home.id,future:future.id,hub:hub.id}));`);
  const s=f.status(),p=s.pages.find(p=>p.pageId===ids.home);
  return {...f,ids,request:{command:'amend-page-reviewed-copy',operationId:randomUUID(),pageId:p.pageId,
    expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash,
    deferUnreadyPageIds:[ids.future],patch:{body:[{type:'richParagraph',content:[{type:'text',text:'Skaitykite '},
      {type:'link',text:'esamus gidus',target:{kind:'page',pageId:ids.hub}}]}]}}};
}

test('deferred-copy v2 removes only explicitly named empty future links and replays exact evidence',async t=>{
  const f=await deferredCopyFixture(t),before=await f.read(),r=f.ok(f.request).operation.result;
  assert.equal(r.version,'native-reviewed-copy-amendment.v2');
  const after=await f.read(),page=after.pages.find(p=>p.id===f.ids.home);
  assert.deepEqual(page.links.map(l=>l.targetPageId),[f.ids.hub]);
  assert.deepEqual(page.linkSuggestions.map(l=>l.targetPageId),[f.ids.hub]);
  assert.deepEqual(page.editorial.relatedPageIds,[f.ids.hub]);
  assert.deepEqual(after.assets,before.assets);assert.deepEqual(page.publishedRevision,before.pages.find(p=>p.id===f.ids.home).publishedRevision);
  const bytes=await readFile(f.file),replayed=f.ok(f.request).operation.result;
  assert.equal(replayed.changed,false);assert.equal(replayed.replayed,true);assert.equal(replayed.receiptSha256,r.receiptSha256);
  assert.equal(f.call({...f.request,deferUnreadyPageIds:[f.ids.hub]}).value.code,'workflow_amendment_receipt_conflict');
  const legacy={...f.request};delete legacy.deferUnreadyPageIds;
  assert.equal(f.call(legacy).value.code,'workflow_amendment_receipt_conflict');
  assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

test('deferred-copy v2 reconciles a lost native write without rewriting or losing future drafts',async t=>{
  const f=await deferredCopyFixture(t);
  assert.equal(failAmendment(f,true).code,'inert_interruption');
  const bytes=await readFile(f.file),r=f.ok(f.request).operation.result;
  assert.equal(r.replayed,true);assert.equal(r.changed,false);
  assert.deepEqual(await readFile(f.file),bytes);
  assert.ok((await f.read()).pages.some(p=>p.id===f.ids.future&&!p.body.length));await f.unchanged();
});

test('deferred-copy refuses ready targets, extra graph changes and reused request identity',async t=>{
  const f=await deferredCopyFixture(t),before=await readFile(f.file);
  for(const change of [{deferUnreadyPageIds:[]},{deferUnreadyPageIds:[f.ids.future,f.ids.future]},
    {deferUnreadyPageIds:[f.ids.hub]}, {deferUnreadyPageIds:['unknown-page']},
    {patch:{body:[{type:'paragraph',text:'Taip pat pašalintas esamas indeksas.'}]}},
    {patch:{title:'Nėra aiškios turinio pataisos'}}]) {
    assert.equal(f.call({...f.request,...change}).status,1);assert.deepEqual(await readFile(f.file),before);
  }
  f.write(f.ids.future);
  const s=f.status(),p=s.pages.find(p=>p.pageId===f.ids.home),bytes=await readFile(f.file);
  assert.equal(f.call({...f.request,expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,
    expectedPlanningHash:p.planningHash}).value.code,'workflow_deferred_target_not_unready');
  assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});
async function reviewedCopyFixture(t,patch={title:'Patikslintas privatus bandomojo puslapio pavadinimas'}) {
  const f=await sandbox(t),s=f.status(),p=s.pages.find(p=>p.type==='home');
  return {...f,request:{command:'amend-page-reviewed-copy',operationId:randomUUID(),pageId:p.pageId,
    expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash,patch}};
}

test('reviewed-copy distinct amendment persists exact copy and replay without touching original intake',async t=>{
  const f=await reviewedCopyFixture(t),result=f.ok(f.request).operation.result;
  assert.equal(result.state,'applied');assert.equal(result.replayed,false);assert.equal(result.changed,true);
  const bytes=await readFile(f.file),replay=f.ok(f.request).operation.result;
  assert.equal(replay.requestHash,result.requestHash);assert.equal(replay.receiptSha256,result.receiptSha256);
  assert.equal(replay.replayed,true);assert.equal(replay.changed,false);
  assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

const amendmentFiles=f=>({directory:path.join(f.revision,'reviewed-copy-amendments'),
  receipt:path.join(f.revision,'reviewed-copy-amendments',f.request.operationId+'.json'),
  before:path.join(f.revision,'reviewed-copy-amendments',f.request.operationId+'.before.json')});
function failAmendment(f,after) {
  const request={...f.input,...f.request},contextUrl=new URL('../scripts/customer-content-context.mjs',import.meta.url).href,
    workflowUrl=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
  return f.mutate(`const input=${JSON.stringify(request)},c=await (await import(${JSON.stringify(contextUrl)})).loadCustomerContentContext(input,{requirePage:true});
    const native=c.model;c.model={...native,editPage:async(...args)=>{${after?'await native.editPage(...args);':''}throw Object.assign(new Error('Synthetic lost response'),{code:'inert_interruption'});}};
    try{await (await import(${JSON.stringify(workflowUrl)})).amendReviewedCopy(c,input);throw new Error('Expected interruption');}
    catch(e){if(e.code!=='inert_interruption')throw e;console.log(JSON.stringify({code:e.code}));}`);
}

test('reviewed-copy body and metadata use raw request identity and immutable native before evidence',async t=>{
  const f=await reviewedCopyFixture(t),original=await f.read(),page=original.pages.find(p=>p.id===f.request.pageId);
  f.request.patch={title:'Žmogaus patikslintas privatus tekstas',intent:'Aiškiai paaiškinti mažo bandymo eigą.',
    description:'Taisyklingas ir konkretus privataus sintetinio bandymo aprašas.',
    body:page.body.map(b=>b.type==='paragraph'?{...b,text:b.text+' Patikslintas sakinys.'}:b),
    factChecks:['  Tikras neatsakytas klausimas lieka atviras.  '],
    externalLinks:[{url:'https://example.org/source',label:' Nepatikrintas kandidatas ',reason:' Reikia patikrinti turinį ',verified:false}]};
  const value=f.ok(f.request),r=value.operation.result,site=await f.read(),updated=site.pages.find(p=>p.id===page.id);
  const binding=Object.fromEntries(['operationId','creationId','acceptedRevision','sourceHash','canonicalHost','pageId',
    'expectedSiteHash','expectedRevisionHash','expectedPlanningHash','patch'].map(k=>[k,({...f.input,...f.request})[k]]));
  assert.equal(r.requestHash,digest(binding));assert.equal(r.appliedSiteHash,value.expectedSiteHash);
  assert.equal(r.beforeSiteHash,f.request.expectedSiteHash);assert.equal(r.beforeRevisionHash,f.request.expectedRevisionHash);
  assert.equal(r.beforePlanningHash,f.request.expectedPlanningHash);assert.equal(r.beforePageSha256,digest(page));
  const before=JSON.parse(await readFile(amendmentFiles(f).before,'utf8'));
  assert.deepEqual(before.page,page);assert.deepEqual(before.binding.patch,f.request.patch);
  assert.deepEqual(updated.factChecks,['Tikras neatsakytas klausimas lieka atviras.']);
  assert.equal(updated.externalLinks[0].verified,false);assert.equal(updated.externalLinks[0].label,'Nepatikrintas kandidatas');
  assert.deepEqual(site.assets,original.assets);assert.deepEqual(updated.media,page.media);assert.deepEqual(updated.links,page.links);
  assert.deepEqual(updated.publishedRevision,page.publishedRevision);assert.equal(updated.status,'review');assert.equal(updated.approval,null);
  for(const k of ['generation','sourceVerification','mediaVerification','editorialReview','approval','release','deployment','channelActivation','moduleAdmission'])
    assert.equal(r[k],'not-performed');
  await f.unchanged();
});

test('reviewed-copy strict patch and identities refuse invalid or stale writes without changing native bytes',async t=>{
  const f=await reviewedCopyFixture(t),bytes=await readFile(f.file),p=f.request.pageId;
  const rich=target=>[{type:'richParagraph',content:[{type:'link',text:'Nuoroda',target}]}];
  for(const patch of [{body:null},{body:[]},{body:[{type:'paragraph',text:'\ue200citation\ue201'}]},
    {body:Array.from({length:301},()=>({type:'paragraph',text:'Bandomasis tekstas.'}))},{body:[{type:'foreign',text:'bad'}]},
    {title:'x'.repeat(161)},{description:'x'.repeat(221)},{intent:'x'.repeat(301)},
    {factChecks:Array(41).fill('Pastaba')},{body:[{type:'image',assetId:'unknown-asset'}]},
    {body:rich({kind:'page',pageId:p})},{body:rich({kind:'page',pageId:'unknown-page'})},
    {externalLinks:[{url:'http://example.org',label:'Šaltinis',reason:'Kandidatas',verified:true}]},
    {body:[{type:'paragraph',text:'x'.repeat(200001)}]},
    {status:'approved'},{approval:{}},{editorial:{}},{media:[]},{siteId:'foreign'},{links:[]},{deployment:'performed'}]) {
    assert.equal(f.call({...f.request,patch}).status,1);assert.deepEqual(await readFile(f.file),bytes);
  }
  for(const override of [{operationId:'not-a-uuid'},...['expectedSiteHash','expectedRevisionHash','expectedPlanningHash']
    .map(k=>({[k]:'f'.repeat(64)})),{sourceHash:'f'.repeat(64)},{canonicalHost:'foreign.example.invalid'},{acceptedRevision:2}]) {
    assert.equal(f.call({...f.request,...override}).status,1);assert.deepEqual(await readFile(f.file),bytes);
  }
  await f.unchanged();
});

test('reviewed-copy external native links require explicitly verified resulting source metadata',async t=>{
  const f=await reviewedCopyFixture(t),url='https://example.org/reviewed';
  const body=[{type:'richParagraph',content:[{type:'link',text:'Perskaitytas šaltinis',target:{kind:'external',url}}]}];
  const link={url,label:'Konkretus šaltinis',reason:'Pagrindžia vieną teiginį.',verified:false};
  assert.equal(f.call({...f.request,patch:{body,externalLinks:[link]}}).value.code,'writer_unverified_external_link');
  const r=f.ok({...f.request,patch:{body,externalLinks:[{...link,verified:true}]}}).operation.result;
  assert.equal(r.sourceVerification,'not-performed');await f.unchanged();
});

test('reviewed-copy preserves actual internal graph and attached raster family',async t=>{
  const a=await attachmentFixture(t),attached=a.ok(a.request).operation.result;
  const guide=(await a.read()).pages.find(p=>p.id===a.request.pageId);
  a.mutate(`const s=await m.getSite(siteId),target=s.pages.find(p=>p.type==='home');
    await m.editPage(siteId,${JSON.stringify(guide.id)},{body:[{type:'richParagraph',content:[{type:'link',text:'Pradžia',target:{kind:'page',pageId:target.id}}]},
      {type:'image',assetId:${JSON.stringify(attached.assetId)}}]});`);
  const s=a.status(),p=s.pages.find(p=>p.pageId===guide.id),site=await a.read(),before=site.pages.find(p=>p.id===guide.id);
  const request={command:'amend-page-reviewed-copy',operationId:randomUUID(),pageId:p.pageId,
    expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash,
    patch:{body:before.body.map(b=>b.type==='richParagraph'?{...b,content:b.content.map(n=>({...n,text:'Grįžkite į pradžią'}))}:b)}};
  const missingGraph=a.call({...request,patch:{body:[{type:'paragraph',text:'Pašalintos nuorodos.'}]}});
  assert.equal(missingGraph.value.code,'workflow_amendment_graph_changed');
  a.ok(request);const after=await a.read(),page=after.pages.find(p=>p.id===guide.id);
  assert.deepEqual(after.assets,site.assets);assert.deepEqual(page.media,before.media);assert.deepEqual(page.links,before.links);
  assert.equal(page.body[1].assetId,attached.assetId);await a.unchanged();
});

test('reviewed-copy prepared-before interruption recovers once from original immutable evidence',async t=>{
  const f=await reviewedCopyFixture(t);assert.equal(failAmendment(f,false).code,'inert_interruption');
  const files=amendmentFiles(f),evidence=await readFile(files.before),prepared=JSON.parse(await readFile(files.receipt,'utf8'));
  assert.equal(prepared.state,'prepared');const r=f.ok(f.request).operation.result;
  assert.equal(r.replayed,true);assert.equal(r.changed,true);assert.deepEqual(await readFile(files.before),evidence);
  const again=f.ok(f.request).operation.result;assert.equal(again.changed,false);assert.equal(again.receiptSha256,r.receiptSha256);
  await f.unchanged();
});

test('reviewed-copy lost response after native rename reconciles applied without another native write',async t=>{
  const f=await reviewedCopyFixture(t);assert.equal(failAmendment(f,true).code,'inert_interruption');
  const files=amendmentFiles(f),bytes=await readFile(f.file),before=await readFile(files.before);
  assert.equal(JSON.parse(await readFile(files.receipt,'utf8')).state,'prepared');
  const result=f.ok(f.request),r=result.operation.result;
  assert.equal(r.replayed,true);assert.equal(r.changed,false);assert.equal(r.appliedSiteHash,result.expectedSiteHash);
  assert.deepEqual(await readFile(f.file),bytes);assert.deepEqual(await readFile(files.before),before);await f.unchanged();
});

test('reviewed-copy prepared or applied receipt never overwrites unrelated later edits or accepts changed request',async t=>{
  for(const stage of ['before','after','applied']) {
    const f=await reviewedCopyFixture(t);
    if(stage==='applied')f.ok(f.request);else failAmendment(f,stage==='after');
    const files=amendmentFiles(f),before=await readFile(files.before),receipt=await readFile(files.receipt);
    assert.equal(f.call({...f.request,patch:{title:'Kitokia operacijos užduotis'}}).value.code,'workflow_amendment_receipt_conflict');
    f.mutate(`await m.editPage(siteId,${JSON.stringify(f.request.pageId)},{title:'Kito rašymo pakeistas pavadinimas'});`);
    const bytes=await readFile(f.file),denied=f.call(f.request);assert.equal(denied.status,1);
    assert.deepEqual(await readFile(f.file),bytes);assert.deepEqual(await readFile(files.before),before);
    assert.deepEqual(await readFile(files.receipt),receipt);await f.unchanged();
  }
});

test('reviewed-copy other-page drift and preexisting operation exclusion fail closed without stealing lock',async t=>{
  const f=await reviewedCopyFixture(t),files=amendmentFiles(f),lock=path.join(files.directory,f.request.operationId+'.lock');
  await mkdir(files.directory);await writeFile(lock,'owned-by-another-operation');const bytes=await readFile(f.file);
  assert.equal(f.call(f.request).value.code,'workflow_amendment_busy');assert.deepEqual(await readFile(f.file),bytes);
  assert.equal(await readFile(lock,'utf8'),'owned-by-another-operation');await unlink(lock);
  failAmendment(f,true);
  f.mutate(`const s=await m.getSite(siteId),p=s.pages.find(p=>p.id!==${JSON.stringify(f.request.pageId)});await m.editPage(siteId,p.id,{title:'Kitas lygiagretus puslapis'});`);
  const changed=await readFile(f.file);assert.equal(f.call(f.request).value.code,'workflow_context_stale');
  assert.deepEqual(await readFile(f.file),changed);await f.unchanged();
});

test('reviewed-copy corrupted immutable evidence fails without repairing or overwriting it',async t=>{
  const f=await reviewedCopyFixture(t);failAmendment(f,false);const files=amendmentFiles(f);
  const corrupt=JSON.parse(await readFile(files.before,'utf8'));corrupt.page.title='Sugadintas pradinis įrodymas';
  await writeFile(files.before,JSON.stringify(corrupt));const evidence=await readFile(files.before),bytes=await readFile(f.file);
  assert.equal(f.call(f.request).value.code,'workflow_amendment_receipt_conflict');
  assert.deepEqual(await readFile(files.before),evidence);assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

test('reviewed-copy already identical review-state copy records a no-op without invalidating native bytes',async t=>{
  const f=await reviewedCopyFixture(t);f.amend(f.request.pageId,f.request.patch);
  const s=f.status(),p=s.pages.find(p=>p.pageId===f.request.pageId),bytes=await readFile(f.file);
  f.request={...f.request,expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash};
  const r=f.ok(f.request).operation.result;assert.equal(r.changed,false);assert.equal(r.replayed,false);
  assert.equal(r.beforeSiteHash,r.appliedSiteHash);assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

test('reviewed-copy invalidates an actual current editorial review while retaining its historical evidence',async t=>{
  const f=await reviewedCopyFixture(t),s=f.status(),p=s.pages.find(p=>p.pageId===f.request.pageId);
  f.ok({command:'record-review',pageId:p.pageId,expectedSiteHash:s.expectedSiteHash,
    review:{reviewer:'Synthetic isolated reviewer',revisionHash:p.revisionHash,evidence:evidence()}});
  const current=f.status(),view=current.pages.find(v=>v.pageId===p.pageId),site=await f.read();
  assert.equal(view.reviewCurrent,true);const page=site.pages.find(v=>v.id===p.pageId);
  f.request={...f.request,expectedSiteHash:current.expectedSiteHash,expectedRevisionHash:view.revisionHash,expectedPlanningHash:view.planningHash};
  f.ok(f.request);assert.equal(f.status().pages.find(v=>v.pageId===p.pageId).reviewCurrent,false);
  assert.deepEqual((await f.read()).pages.find(v=>v.id===p.pageId).editorialReview,page.editorialReview);await f.unchanged();
});

test('reviewed-copy evidence-only interrupted preparation reconstructs receipt only at exact original state',async t=>{
  const f=await reviewedCopyFixture(t);failAmendment(f,false);const files=amendmentFiles(f),before=await readFile(files.before);
  await unlink(files.receipt);const r=f.ok(f.request).operation.result;
  assert.equal(r.replayed,true);assert.equal(r.changed,true);assert.deepEqual(await readFile(files.before),before);await f.unchanged();
});

test('reviewed-copy concurrent same operation has at most one native write and never steals exclusion',async t=>{
  const f=await reviewedCopyFixture(t),request={...f.input,...f.request},url=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
  const code=`try{const r=await (await import(${JSON.stringify(url)})).customerContentWorkflow(${JSON.stringify(request)});console.log(JSON.stringify(r.operation.result));}
    catch(e){console.log(JSON.stringify({code:e.code}));}`;
  const results=await Promise.all([f.mutateAsync(code),f.mutateAsync(code)]),accepted=results.filter(r=>r.state==='applied');
  assert.ok(accepted.length>=1);assert.equal(accepted.filter(r=>r.changed).length,1);
  assert.ok(results.every(r=>r.state==='applied'||r.code==='workflow_amendment_busy'));
  const settled=f.ok(f.request).operation.result;assert.equal(settled.changed,false);
  assert.equal(settled.receiptSha256,accepted[0].receiptSha256);await f.unchanged();
});
async function attachmentFixture(t) {
  const f=await sandbox(t),s=f.status(),page=s.pages.find(p=>p.type==='guide');
  const sharp=(await import('sharp')).default,sourcePath=path.join(f.revision,'media-inputs','attachment.png');
  await mkdir(path.dirname(sourcePath));
  const bytes=await sharp({create:{width:900,height:500,channels:3,background:'#7799aa'}}).png().toBuffer();
  await writeFile(sourcePath,bytes);
  const request={command:'attach-media',pageId:page.pageId,expectedSiteHash:s.expectedSiteHash,
    expectedRevisionHash:page.revisionHash,expectedPlanningHash:page.planningHash,sourcePath,
    expectedSourceSha256:rawHash(bytes),metadata:{mime:'image/png',alt:'Tik sintetinio bandymo iliustracija',
      rights:'Originalus izoliuotas Node fixture',prompt:'Private exact synthetic image prompt'}};
  return {...f,request,bytes};
}
const script=name=>path.resolve(import.meta.dirname,'../scripts/'+name+'.mjs');
const modelUrl=new URL('../src/model.mjs',import.meta.url).href;
const evidence=()=>Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(k=>[k,
  `Tik izoliuotas sintetinis ${k} scenarijus: patikrintas šios revizijos fixture, tai nėra tikro kliento ar paleidimo įrodymas.`]));
function brief(p){return {path:p,title:'Kaip pasirinkti nedidelį komandos bandymą',intent:'Padėti komandai pasirinkti vieną konkretų bandymą.',head_query:'Kaip pasirinkti bandymą?',
  audience_problem:'Komanda nežino, nuo kurios mažos užduoties pradėti.',business_goal:'Padėti įvertinti aiškaus bandymo poreikį.',primary_topic:'Mažo bandymo pasirinkimas',
  reason:'Kiekviename URL nagrinėjamas atskiras pasiruošimo žingsnis.',month:'',seasonal_hook:'',pillar_path:'',outline:['Pasirinkite konkretų klausimą.','Užrašykite sąlygas.','Patikrinkite rezultatą.'],
  source_queries:['Sintetinio bandymo gairės'],source_urls:['https://example.org/candidate'],internal_links:['/'],media_brief:'Izoliuotam sintetiniam bandymui skirta užduoties pasirinkimo iliustracija.',media_alt:'Išgalvotos užduoties schema',priority:'initial'};}
async function sandbox(t){
  const dir=await mkdtemp(path.join(os.tmpdir(),'customer-workflow-'));
  t.after(async()=>{assert.ok(dir.startsWith(path.join(os.tmpdir(),'customer-workflow-')));await rm(dir,{recursive:true,force:true});});
  const artifactsRoot=path.join(dir,'runtime','artifacts');await mkdir(artifactsRoot,{recursive:true});
  const network=path.join(dir,'network.json');await writeFile(network,JSON.stringify({defaultEmail:'unused@example.invalid',operatorName:'Neperkeliamas operatorius',contactsBySite:{}}));
  const section={heading:'Pasiruoškite bandymui',body:'Tai izoliuotas sintetinis turinys, padedantis pasirinkti konkrečią užduotį, užrašyti jos sąlygas ir sąžiningai palyginti rezultatą. Jokių vykdymo ar sutaupymo pažadų nėra.',items:[]};
  const draft={business_name:'Workflow fixture',tagline:'Privatus testinis bandymas',business:{customer:'Sintetinė komanda'},brand:{accent:'indigo'},
    pages:['/','/gidai/','/kontaktai/','/apie/'].map(p=>({path:p,title:'Sintetinio bandymo puslapis',navigation_label:'Bandymas',meta_description:'Izoliuoto sintetinio bandymo puslapio aprašas.',intent:'Padėti skaitytojui suprasti sintetinio bandymo žingsnį.',sections:[section,section]})),
    content_plan:['/pirmas/','/antras/','/trecias/'].map(brief)};
  const creationId=randomUUID(),acceptedRevision=1,revision=path.join(artifactsRoot,'customer-content',creationId,'revision-1');
  const input={creationId,acceptedRevision,sourceHash:digest(draft),canonicalHost:'workflow.example.invalid',artifactsRoot,dataDir:path.join(revision,'data'),outputDir:path.join(revision,'output')};
  const env={...process.env,STUDIO_NETWORK_SETTINGS:network};
  function invoke(name,value){const r=spawnSync(process.execPath,[script(name)],{input:JSON.stringify(value),encoding:'utf8',timeout:20000,windowsHide:true,env});assert.equal(r.error,undefined);return {status:r.status,value:JSON.parse(r.status===0?r.stdout:r.stderr)};}
  const intake=invoke('customer-creation-intake',{...input,draft});assert.equal(intake.status,0,JSON.stringify(intake.value));
  const siteId=intake.value.siteId,file=path.join(input.dataDir,'sites',siteId+'.json'),read=async()=>JSON.parse(await readFile(file));
  const call=extra=>invoke('customer-content-workflow',{...input,...extra});
  const status=()=>{const r=call({command:'status'});assert.equal(r.status,0,JSON.stringify(r.value));return r.value;};
  const ok=extra=>{const r=call(extra);assert.equal(r.status,0,JSON.stringify(r.value));return r.value;};
  const amend=(p,patch)=>{const s=status(),page=s.pages.find(x=>x.pageId===p);return ok({command:'amend-page',pageId:p,patch,expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:page.revisionHash,expectedPlanningHash:page.planningHash});};
  const write=p=>{const value={...input,pageId:p},prepared=invoke('customer-content-write',{...value,command:'prepare'});assert.equal(prepared.status,0,JSON.stringify(prepared.value));
    const output={title:'Kaip pasirinkti nedidelį komandos bandymą',description:'Izoliuotas sintetinis gidas padeda pasirinkti užduotį, užrašyti sąlygas ir įvertinti mažą komandos bandymą.',intent:'Padėti komandai pasirinkti vieną konkretų bandymą.',body:[{type:'paragraph',text:section.body}],factChecks:['Tai tik izoliuotas sintetinis turinio fixture.']};
    const v=prepared.value,r=invoke('customer-content-write',{...value,command:'apply',expectedRevisionHash:v.expectedRevisionHash,expectedPlanningHash:v.expectedPlanningHash,expectedContextHash:v.expectedContextHash,output});assert.equal(r.status,0,JSON.stringify(r.value));};
  function mutate(code){const r=spawnSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(modelUrl)}),siteId=${JSON.stringify(siteId)};${code}`],{encoding:'utf8',windowsHide:true,env:{...env,STUDIO_DATA_DIR:input.dataDir,STUDIO_OUTPUT_DIR:input.outputDir}});assert.equal(r.status,0,r.stderr);return r.stdout.trim()?JSON.parse(r.stdout):null;}
  function mutateAsync(code){return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(modelUrl)}),siteId=${JSON.stringify(siteId)};${code}`],{windowsHide:true,env:{...env,STUDIO_DATA_DIR:input.dataDir,STUDIO_OUTPUT_DIR:input.outputDir},stdio:['ignore','pipe','pipe']});
    let out='',error='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>error+=x);child.on('error',reject);child.on('exit',code=>code===0?resolve(JSON.parse(out)):reject(Error(error)));
  });}
  const originals=await Promise.all(['source-draft.json','intake-context.json','intake-manifest.json'].map(async p=>[p,rawHash(await readFile(path.join(revision,p)))]));
  const unchanged=async()=>{for(const [p,h]of originals)assert.equal(rawHash(await readFile(path.join(revision,p))),h);};
  return {dir,input,revision,siteId,file,read,call,status,ok,amend,write,mutate,mutateAsync,unchanged};
}

test('current page read reflects saved edits without mutation or private prompt/site projection',async t=>{
  const f=await sandbox(t),s=f.status(),page=s.pages.find(p=>p.type==='home');
  const before=await readFile(f.file),result=f.call({command:'read-page',pageId:page.pageId});
  assert.equal(result.status,0,JSON.stringify(result.value));
  assert.equal(result.value.pageDocument.pageId,page.pageId);
  assert.equal(result.value.pageDocument.revisionHash,page.revisionHash);
  assert.ok(result.value.pageDocument.body.length);
  assert.equal('siteSnapshot' in result.value.pageDocument,false);
  assert.equal('facts' in result.value.pageDocument,false);
  assert.equal('prompt' in result.value.pageDocument,false);
  assert.deepEqual(await readFile(f.file),before);await f.unchanged();
  f.amend(page.pageId,{title:'Aktualus išsaugotas pavadinimas'});
  const after=await readFile(f.file),updated=f.ok({command:'read-page',pageId:page.pageId});
  assert.equal(updated.pageDocument.title,'Aktualus išsaugotas pavadinimas');
  assert.notEqual(updated.pageDocument.revisionHash,page.revisionHash);
  assert.deepEqual(await readFile(f.file),after);
  assert.notEqual(f.call({command:'read-page',pageId:'foreign-page'}).status,0);
});

test('byte-bound attachment imports once, selects featured media and replays without writes or approval',async t=>{
  const f=await attachmentFixture(t),first=f.ok(f.request),r=first.operation.result;
  assert.equal(r.state,'attached');assert.equal(r.sourceSha256,f.request.expectedSourceSha256);
  const site=await f.read(),p=site.pages.find(p=>p.id===f.request.pageId);
  assert.equal(site.assets.length,4);assert.equal(p.media.length,4);
  assert.equal(p.editorial.featuredImageId,r.assetId);assert.equal(p.approval,null);
  assert.equal(r.generation,'not-performed');assert.equal(r.mediaVerification,'not-performed');
  f.ok({command:'record-review',pageId:p.id,expectedSiteHash:f.status().expectedSiteHash,
    review:{reviewer:'synthetic-only',revisionHash:r.appliedRevisionHash,evidence:evidence()}});
  assert.equal(f.status().pages.find(x=>x.pageId===p.id).reviewCurrent,true);
  const saved=await readFile(f.file),again=f.ok(f.request).operation.result;
  assert.equal(again.changed,false);assert.equal(again.replayed,true);assert.equal(again.assetId,r.assetId);
  assert.deepEqual(await readFile(f.file),saved);await f.unchanged();
});

test('a mismatching source digest is rejected before any asset or page write',async t=>{
  const f=await attachmentFixture(t),before=await readFile(f.file);
  const result=f.call({...f.request,expectedSourceSha256:'0'.repeat(64)});
  assert.equal(result.status,1);assert.equal(result.value.code,'workflow_media_source_mismatch');
  assert.deepEqual(await readFile(f.file),before);await f.unchanged();
});

test('an already imported exact family is attached without generating duplicate assets',async t=>{
  const f=await attachmentFixture(t),r=f.ok({command:'import-media',expectedSiteHash:f.request.expectedSiteHash,
    sourcePath:f.request.sourcePath,expectedSourceSha256:f.request.expectedSourceSha256,metadata:f.request.metadata}).operation.result;
  const request={...f.request,expectedSiteHash:f.status().expectedSiteHash},before=await f.read();
  const attached=f.ok(request).operation.result;
  assert.ok(r.variants.some(v=>v.id===attached.assetId));
  assert.deepEqual((await f.read()).assets,before.assets);await f.unchanged();
});

test('a first receipt for an already featured family preserves current review and page bytes',async t=>{
  const f=await attachmentFixture(t),r=f.ok({command:'import-media',expectedSiteHash:f.request.expectedSiteHash,
    sourcePath:f.request.sourcePath,metadata:f.request.metadata}).operation.result;
  const page=(await f.read()).pages.find(p=>p.id===f.request.pageId);
  f.amend(page.id,{media:[{id:r.assetId}],editorial:{...page.editorial,featuredImageId:r.assetId}});
  let s=f.status(),p=s.pages.find(p=>p.pageId===page.id);
  f.ok({command:'record-review',pageId:p.pageId,expectedSiteHash:s.expectedSiteHash,
    review:{reviewer:'synthetic-only',revisionHash:p.revisionHash,evidence:evidence()}});
  s=f.status();p=s.pages.find(p=>p.pageId===page.id);
  const before=await readFile(f.file),request={...f.request,expectedSiteHash:s.expectedSiteHash,
    expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash};
  assert.equal(f.ok(request).operation.result.changed,false);
  assert.deepEqual(await readFile(f.file),before);assert.equal(f.status().pages.find(p=>p.pageId===page.id).reviewCurrent,true);
  await f.unchanged();
});

test('an already featured family at the canonical 60-variant limit stays a no-op',async t=>{
  const f=await attachmentFixture(t);
  f.mutate('const {readFile}=await import("node:fs/promises"),input='+JSON.stringify(f.request)+';'
    +'const bytes=await readFile(input.sourcePath),ids=[];for(let i=0;i<15;i++){'
    +'const a=await m.saveResponsiveAsset(siteId,{...input.metadata,alt:i?("Other inert family "+i):input.metadata.alt},bytes);ids.push(a.id);}'
    +'const p=(await m.getSite(siteId)).pages.find(p=>p.id===input.pageId);'
    +'await m.editPage(siteId,p.id,{media:ids.map(id=>({id})),editorial:{...p.editorial,featuredImageId:ids[0]}});');
  const s=f.status(),p=s.pages.find(p=>p.pageId===f.request.pageId),before=await readFile(f.file);
  assert.equal(p.mediaCount,60);
  const request={...f.request,expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,
    expectedPlanningHash:p.planningHash};
  assert.equal(f.ok(request).operation.result.changed,false);
  assert.deepEqual(await readFile(f.file),before);await f.unchanged();
});

test('an amendment failure retains imported receipt and resumes the same real family',async t=>{
  const f=await attachmentFixture(t),input={...f.input,...f.request};
  const workflow=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
  const context=new URL('../scripts/customer-content-context.mjs',import.meta.url).href;
  const failure=f.mutate('const {loadCustomerContentContext}=await import('+JSON.stringify(context)+');'
    +'const {attachMedia}=await import('+JSON.stringify(workflow)+');const input='+JSON.stringify(input)+';'
    +'const context=await loadCustomerContentContext(input,{requirePage:true});'
    +'context.model={...context.model,editPage:async()=>{throw Object.assign(Error("inert"),{code:"inert_amend_failure"});}};'
    +'try{await attachMedia(context,input);throw Error("expected failure");}catch(e){console.log(JSON.stringify({code:e.code}));}');
  assert.equal(failure.code,'inert_amend_failure');
  const files=await readdir(path.join(f.revision,'media-attachments')),file=files.find(p=>p.endsWith('.json'));
  const receipt=JSON.parse(await readFile(path.join(f.revision,'media-attachments',file),'utf8'));
  assert.equal(receipt.state,'imported');assert.equal((await f.read()).assets.length,4);
  const resumed=f.ok(f.request).operation.result;
  assert.equal(resumed.assetId,receipt.assetId);assert.equal(resumed.changed,true);assert.equal(resumed.replayed,true);
  assert.equal((await f.read()).assets.length,4);await f.unchanged();
});

test('a real model write between import and amend is fenced and leaves the imported family recoverable',async t=>{
  const f=await attachmentFixture(t),input={...f.input,...f.request},before=await f.read();
  const workflow=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
  const context=new URL('../scripts/customer-content-context.mjs',import.meta.url).href;
  const failure=f.mutate('const {loadCustomerContentContext}=await import('+JSON.stringify(context)+');'
    +'const {attachMedia}=await import('+JSON.stringify(workflow)+');const input='+JSON.stringify(input)+';'
    +'const context=await loadCustomerContentContext(input,{requirePage:true}),real=context.model;'
    +'context.model={...real,editPage:async(...args)=>{await real.editSite(siteId,{audience:"Changed inert context"});'
    +'return real.editPage(...args);}};try{await attachMedia(context,input);throw Error("expected failure");}'
    +'catch(e){console.log(JSON.stringify({code:e.code}));}');
  assert.equal(failure.code,'writer_context_stale');
  const after=await f.read();assert.equal(after.assets.length,4);
  assert.deepEqual(after.pages,before.pages);
  const file=(await readdir(path.join(f.revision,'media-attachments'))).find(p=>p.endsWith('.json'));
  assert.equal(JSON.parse(await readFile(path.join(f.revision,'media-attachments',file),'utf8')).state,'imported');
  assert.equal(f.call(f.request).value.code,'workflow_context_stale');
  assert.equal((await f.read()).assets.length,4);await f.unchanged();
});

test('a concurrent write immediately after import is not adopted as the post-import context',async t=>{
  const f=await attachmentFixture(t),input={...f.input,...f.request},before=await f.read();
  const workflow=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
  const context=new URL('../scripts/customer-content-context.mjs',import.meta.url).href;
  const failure=f.mutate('const {loadCustomerContentContext}=await import('+JSON.stringify(context)+');'
    +'const {attachMedia}=await import('+JSON.stringify(workflow)+');const input='+JSON.stringify(input)+';'
    +'const context=await loadCustomerContentContext(input,{requirePage:true}),real=context.model;'
    +'context.model={...real,saveResponsiveAsset:async(...args)=>{const asset=await real.saveResponsiveAsset(...args);'
    +'await real.editSite(siteId,{audience:"Concurrent change after import"});return asset;}};'
    +'try{await attachMedia(context,input);throw Error("expected failure");}'
    +'catch(e){console.log(JSON.stringify({code:e.code}));}');
  assert.equal(failure.code,'workflow_context_stale');
  const after=await f.read();assert.deepEqual(after.pages,before.pages);assert.equal(after.assets.length,4);
  const file=(await readdir(path.join(f.revision,'media-attachments'))).find(p=>p.endsWith('.json'));
  assert.equal(JSON.parse(await readFile(path.join(f.revision,'media-attachments',file),'utf8')).state,'imported');
  assert.equal(f.call(f.request).value.code,'workflow_context_stale');assert.equal((await f.read()).assets.length,4);
  await f.unchanged();
});

test('prepared ambiguity and post-attachment target edits fail closed without another import',async t=>{
  const f=await attachmentFixture(t),first=f.ok(f.request).operation.result,original=await f.read();
  const file=path.join(f.revision,'media-attachments',first.requestHash+'.json');
  const receipt=JSON.parse(await readFile(file,'utf8'));
  await writeFile(file,JSON.stringify({...receipt,state:'prepared'}));
  assert.equal(f.call(f.request).value.code,'workflow_media_import_uncertain');
  assert.deepEqual((await f.read()).assets,original.assets);
  await writeFile(file,JSON.stringify(receipt));
  f.amend(f.request.pageId,{title:'Pasikeitęs sintetinis klausimas'});
  const before=await readFile(f.file);
  assert.equal(f.call(f.request).value.code,'workflow_context_stale');
  assert.deepEqual(await readFile(f.file),before);await f.unchanged();
});

test('receipt context changes and imported-family corruption cannot cause another import',async t=>{
  const f=await attachmentFixture(t),r=f.ok(f.request).operation.result,before=await f.read();
  assert.equal(f.call({...f.request,expectedRevisionHash:'a'.repeat(64)}).value.code,'workflow_media_receipt_conflict');
  assert.equal(f.call({...f.request,body:[]}).value.code,'workflow_invalid_input');
  const asset=before.assets.find(a=>a.id===r.assetId);
  await writeFile(path.join(f.input.dataDir,'media',f.siteId,path.basename(asset.src)),Buffer.from('corrupt'));
  assert.equal(f.call(f.request).value.code,'workflow_media_integrity');
  assert.deepEqual((await f.read()).assets,before.assets);await f.unchanged();
});

test('operator resolves known internal links with exact fences without arbitrary body or approval',async t=>{
  const f=await sandbox(t);
  f.mutate(`const s=await m.getSite(siteId),p=s.pages.find(p=>p.type==='home');await m.editPage(siteId,p.id,{body:[{type:'paragraph',text:'Skaitykite [gidus](/gidai/) ir pasirinkite kitą žingsnį.'}]});`);
  const status=f.status(),page=status.pages.find(page=>page.type==='home');
  const input={command:'resolve-internal-links',pageId:page.pageId,expectedSiteHash:status.expectedSiteHash,
    expectedRevisionHash:page.revisionHash,expectedPlanningHash:page.planningHash};
  const before=await readFile(f.file);
  for(const patch of [{expectedRevisionHash:'f'.repeat(64)},{expectedPlanningHash:'f'.repeat(64)},
    {expectedSiteHash:'f'.repeat(64)},{body:[]}]){
    assert.equal(f.call({...input,...patch}).status,1);assert.deepEqual(await readFile(f.file),before);
  }
  assert.equal(f.ok(input).operation.result.changed,true);
  const after=(await f.read()).pages.find(p=>p.id===page.pageId);
  assert.equal(after.body[0].type,'richParagraph');assert.equal(after.body[0].content[1].target.kind,'page');
  assert.equal(after.approval,null);assert.equal(after.publishedRevision,null);
  assert.equal(f.call(input).value.code,'workflow_context_stale');await f.unchanged();
  const latest=f.status(),current=latest.pages.find(p=>p.pageId===page.pageId),saved=await readFile(f.file);
  assert.equal(f.ok({...input,expectedSiteHash:latest.expectedSiteHash,expectedRevisionHash:current.revisionHash,
    expectedPlanningHash:current.planningHash}).operation.result.changed,false);
  assert.deepEqual(await readFile(f.file),saved);
});

test('current media read is page/hash/byte bound and never exposes originals or source paths',async t=>{
  const f=await sandbox(t),p=f.status().pages.find(p=>p.type==='home');
  const sharp=(await import('sharp')).default,sources=path.join(f.revision,'media-inputs');await mkdir(sources);
  const sourcePath=path.join(sources,'reader.png');await writeFile(sourcePath,await sharp({create:{width:900,height:500,channels:3,background:'#7799aa'}}).png().toBuffer());
  const imported=f.ok({command:'import-media',expectedSiteHash:f.status().expectedSiteHash,sourcePath,
    metadata:{mime:'image/png',alt:'Sintetinė schema',rights:'Tik sintetinis testas',prompt:'Private input prompt'}}).operation.result;
  f.amend(p.pageId,{media:[{id:imported.assetId}]});
  const doc=f.ok({command:'read-page',pageId:p.pageId}),before=await readFile(f.file);
  assert.equal(doc.pageDocument.media.length,4); // 900px original is never upscaled to1200/1600.
  assert.ok(doc.pageDocument.media.every(a=>!('prompt'in a)&&!('rights'in a)&&!('src'in a)));
  assert.equal(doc.pageDocumentHash,digest(doc.pageDocument));
  const args={command:'read-media',pageId:p.pageId,assetId:imported.assetId,expectedRevisionHash:doc.pageDocument.revisionHash};
  const media=f.ok(args).mediaData,bytes=Buffer.from(media.base64,'base64');
  assert.equal(media.asset.sha256,rawHash(bytes));assert.equal(media.asset.bytes,bytes.length);
  assert.equal(media.asset.mime,'image/webp');assert.equal('file'in media,false);
  assert.deepEqual(await readFile(f.file),before);await f.unchanged();
  assert.equal(f.call({...args,expectedRevisionHash:'0'.repeat(64)}).value.code,'workflow_context_stale');
  assert.equal(f.call({...args,assetId:'foreign-asset'}).value.code,'workflow_unknown_asset');
  const other=f.status().pages.find(x=>x.path==='/kontaktai/');
  assert.equal(f.call({...args,pageId:other.pageId,expectedRevisionHash:other.revisionHash}).value.code,'workflow_unknown_asset');
  const site=await f.read(),asset=site.assets.find(a=>a.id===imported.assetId),file=path.join(f.input.dataDir,'media',f.siteId,path.basename(asset.src));
  await writeFile(file,Buffer.from('corrupt'));
  assert.equal(f.call(args).value.code,'workflow_media_integrity');
});

test('live bounded status includes native non-guide and added canonical pages without invented readiness',async t=>{
  const f=await sandbox(t),s=f.status();
  assert.equal(s.version,'customer-content-workflow.v1');assert.equal(s.state,'current');assert.equal(s.release,'UNVERIFIED');
  assert.equal(s.pages.length,7);assert.equal(s.workflow.workflowVersion,1);assert.ok(s.pages.every(p=>!p.reviewCurrent&&!p.hasApprovedRevision));
  assert.equal(s.pages.find(p=>p.path==='/kontaktai/').type,'contact');assert.equal(s.pages.find(p=>p.path==='/apie/').type,'about');assert.equal(s.pages.find(p=>p.path==='/gidai/').type,'index');
  assert.ok(!JSON.stringify(s).includes(f.dir));assert.ok(!JSON.stringify(s).includes('siteSnapshot'));assert.ok(s.workflow.pages.some(p=>p.blockers.length));
  const added=f.mutate(`const p=await m.addPage(siteId,{type:'policy',slug:'taisykles',title:'Testinės taisyklės',description:'Izoliuoto bandymo taisyklės.',intent:'Paaiškinti testą',body:[{type:'paragraph',text:'Tik sintetinis testas.'}],publishAt:'2030-01-01T00:00:00.000Z'});console.log(JSON.stringify(p.id));`);
  assert.ok(f.status().pages.some(p=>p.pageId===added));await f.unchanged();
});

test('exact identity, original artifacts, path and expected site/page hashes reject foreign or stale edits',async t=>{
  const f=await sandbox(t),s=f.status(),p=s.pages[0],before=await readFile(f.file);
  const patch={command:'amend-page',pageId:p.pageId,patch:{factChecks:[]},expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash};
  for(const bad of [{sourceHash:'f'.repeat(64)},{canonicalHost:'foreign.example.invalid'},{acceptedRevision:2},{dataDir:path.join(f.dir,'foreign')},{pageId:'foreign-page'},
    {expectedSiteHash:'f'.repeat(64)},{expectedRevisionHash:'f'.repeat(64)},{expectedPlanningHash:'f'.repeat(64)},{patch:{status:'approved'}},{patch:{body:[]}}]){
    assert.equal(f.call({...patch,...bad}).status,1);assert.deepEqual(await readFile(f.file),before);
  }
  f.amend(p.pageId,{title:'Išsaugotas naujas testinis pavadinimas'});assert.equal(f.call(patch).value.code,'workflow_context_stale');
  await f.unchanged();
  const original=path.join(f.revision,'source-draft.json');await writeFile(original,'{}');assert.equal(f.call({command:'status'}).value.code,'writer_original_hash_mismatch');
});

test('prepare hashes and private page data come from one snapshot during a concurrent canonical edit',async t=>{
  const f=await sandbox(t),before=f.status(),page=before.pages[0],workflowUrl=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
  const value=f.mutate(`const fs=(await import('node:fs/promises')).default,{syncBuiltinESMExports}=await import('node:module');
    const original=fs.readFile;let reads=0;
    fs.readFile=async(...args)=>{const bytes=await original(...args);if(String(args[0])===${JSON.stringify(f.file)}&&++reads===2)
      await m.editPage(siteId,${JSON.stringify(page.pageId)},{title:'Lygiagrečiai pakeista dabartinė antraštė'});return bytes;};syncBuiltinESMExports();
    const {customerContentWorkflow}=await import(${JSON.stringify(workflowUrl)}),v=await customerContentWorkflow(${JSON.stringify({...f.input,command:'prepare',pageId:page.pageId})});
    console.log(JSON.stringify({value:v,pageHash:m.revisionHash(v.pageData)}));`);
  assert.equal(value.value.expectedSiteHash,before.expectedSiteHash);
  assert.equal(value.value.pages.find(p=>p.pageId===page.pageId).revisionHash,value.pageHash);
  const latest=(await f.read()).pages.find(p=>p.id===page.pageId);assert.equal(latest.title,'Lygiagrečiai pakeista dabartinė antraštė');assert.notEqual(latest.title,value.value.pageData.title);
  assert.equal(f.call({command:'amend-page',pageId:page.pageId,patch:{title:'Pasenusio prepare pakeitimas'},expectedSiteHash:value.value.expectedSiteHash,expectedRevisionHash:page.revisionHash,expectedPlanningHash:page.planningHash}).value.code,'workflow_context_stale');await f.unchanged();
});

test('metadata validates actual native editorial shape and preserves untouched body and private approvals',async t=>{
  const f=await sandbox(t),s=f.status(),p=s.pages.find(p=>p.type==='guide'),before=await f.read(),page=before.pages.find(x=>x.id===p.pageId);
  for(const patch of [{media:[{id:'unknown-asset'}]},{externalLinks:[{url:'https://example.org',label:'X',reason:'Y',verified:'true'}]},
    {editorial:{...page.editorial,unknown:true}},{editorial:{...page.editorial,featuredImageId:'unknown-asset'}},
    {linkSuggestions:[{targetPageId:'foreign-page',label:'Kitas',reason:'Tikra skaitytojo priežastis'}]}]){
    const state=f.status();assert.equal(f.call({command:'amend-page',pageId:p.pageId,patch,expectedSiteHash:state.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash}).status,1);
  }
  f.amend(p.pageId,{factChecks:['Tiksliai išsaugota neišspręsta pastaba.'],externalLinks:[{url:'https://example.org/candidate',label:'Testinis kandidatas',reason:'Neperskaitytas testinis URL, ne patvirtinta citata.',verified:false}]});
  const after=(await f.read()).pages.find(x=>x.id===p.pageId);assert.deepEqual(after.body,page.body);assert.equal(after.approval,null);assert.equal(after.publishedRevision,null);assert.equal(f.status().pages.find(x=>x.pageId===p.pageId).reviewCurrent,false);await f.unchanged();
});

test('independent model writers recheck the same expected context inside their write lock',async t=>{
  const f=await sandbox(t),s=f.status(),expected=JSON.stringify({expectedSiteHash:s.expectedSiteHash});
  const results=await Promise.all(['Pirmas rašytojas','Antras rašytojas'].map(name=>f.mutateAsync(`
    try{await m.editSite(siteId,{name:${JSON.stringify(name)}},${expected});console.log(JSON.stringify({state:'updated',name:${JSON.stringify(name)}}));}
    catch(e){console.log(JSON.stringify({state:'rejected',code:e.code}));}`)));
  assert.equal(results.filter(r=>r.state==='updated').length,1);
  assert.deepEqual(results.filter(r=>r.state==='rejected'),[{state:'rejected',code:'workflow_context_stale'}]);
  assert.equal((await f.read()).name,results.find(r=>r.state==='updated').name);
  const before=await readFile(f.file),page=s.pages[0];
  const rejected=f.mutate(`const e=${expected},review=${JSON.stringify({reviewer:'fixture-agent',revisionHash:page.revisionHash,evidence:evidence()})};
    const calls=[()=>m.finalizeInternalLinks(siteId,[${JSON.stringify(page.pageId)}],e),()=>m.recordEditorialReview(siteId,${JSON.stringify(page.pageId)},review,e),()=>m.approveReviewedBatch(siteId,[${JSON.stringify(page.pageId)}],'fixture-agent',e),()=>m.releaseContent(siteId,e)];
    console.log(JSON.stringify(await Promise.all(calls.map(async call=>{try{await call();return 'unexpected-write';}catch(x){return x.code;}}))));`);
  assert.deepEqual(rejected,Array(4).fill('workflow_context_stale'));assert.deepEqual(await readFile(f.file),before);await f.unchanged();
});

test('physical PNG presence stays separate from canonical V2 format and editorial acceptance',async t=>{
  const f=await sandbox(t),p=f.status().pages.find(p=>p.type==='guide'),directory=path.join(f.input.dataDir,'media',f.siteId);
  await mkdir(directory,{recursive:true});const sharp=(await import('sharp')).default;
  const src=`/content-assets/${f.siteId}/fixture.png`;await writeFile(path.join(directory,'fixture.png'),await sharp({create:{width:24,height:24,channels:3,background:'#4488aa'}}).png().toBuffer());
  // Synthetic existing private-file fixture; not imported/approved public media.
  const site=await f.read();site.pages.find(x=>x.id===p.pageId).media=[{id:'fixture-png',src,alt:'Tik testinis PNG',width:24,height:24,rights:'Tik izoliuotas testas',credit:''}];await writeFile(f.file,JSON.stringify(site));
  const present=f.status().pages.find(x=>x.pageId===p.pageId);assert.equal(present.mediaFilesPresent,true);assert.equal(present.reviewCurrent,false);assert.equal(present.hasApprovedRevision,false);
  await unlink(path.join(directory,'fixture.png'));assert.equal(f.status().pages.find(x=>x.pageId===p.pageId).mediaFilesPresent,false);await f.unchanged();
});

test('universal image import rejects arbitrary or symlink files and attaches the whole real variant family',async t=>{
  const f=await sandbox(t),sources=path.join(f.revision,'media-inputs');await mkdir(sources);
  const sharp=(await import('sharp')).default,bytes=await sharp({create:{width:1800,height:1800,channels:3,background:'#336699'}}).png({compressionLevel:0}).toBuffer(),sourcePath=path.join(sources,'fixture.png');await writeFile(sourcePath,bytes);
  assert.ok(bytes.length>8*1024*1024&&bytes.length<IMAGE_POLICY.maxInputBytes,'exercise the actual shared 12 MiB input policy, beyond the former extra 8 MiB adapter cap');
  const metadata={mime:'image/png',alt:'Sintetinio bandymo iliustracija',rights:'Tik mūsų sugeneruotas sintetinis Node fixture',prompt:'Tik izoliuotas testas.'};
  const outside=path.join(f.dir,'outside.png');await writeFile(outside,bytes);
  assert.equal(f.call({command:'import-media',expectedSiteHash:f.status().expectedSiteHash,sourcePath:outside,metadata}).value.code,'workflow_unsafe_media');
  const linked=path.join(sources,'alias');await symlink(f.dir,linked,process.platform==='win32'?'junction':'dir');assert.equal(f.call({command:'import-media',expectedSiteHash:f.status().expectedSiteHash,sourcePath:path.join(linked,'outside.png'),metadata}).status,1);await unlink(linked);
  const oversized=path.join(sources,'too-large.png');await writeFile(oversized,Buffer.alloc(IMAGE_POLICY.maxInputBytes+1));const unchanged=await readFile(f.file);
  assert.equal(f.call({command:'import-media',expectedSiteHash:f.status().expectedSiteHash,sourcePath:oversized,metadata}).value.code,'writer_unsafe_artifact');assert.deepEqual(await readFile(f.file),unchanged);
  const imported=f.ok({command:'import-media',expectedSiteHash:f.status().expectedSiteHash,sourcePath,metadata}).operation.result;
  assert.ok(imported.variants.length>1);const p=f.status().pages.find(p=>p.type==='guide');f.amend(p.pageId,{media:[{id:imported.assetId}]});
  const attached=f.status().pages.find(x=>x.pageId===p.pageId);assert.equal(attached.mediaCount,imported.variants.length);assert.equal(attached.mediaFilesPresent,true);assert.equal(attached.hasApprovedRevision,false);assert.equal(attached.reviewCurrent,false);await f.unchanged();
});

test('actual six-area review is revision-bound; stale context and missing media block atomic approval',async t=>{
  const f=await sandbox(t),p=f.status().pages[0];f.amend(p.pageId,{factChecks:[]});
  let s=f.status();const review={reviewer:'synthetic-reviewer',revisionHash:s.pages[0].revisionHash,evidence:evidence()};
  assert.equal(f.call({command:'record-review',pageId:p.pageId,expectedSiteHash:s.expectedSiteHash,review:{...review,evidence:{...review.evidence,media:''}}}).status,1);
  f.ok({command:'record-review',pageId:p.pageId,expectedSiteHash:s.expectedSiteHash,review});assert.equal(f.status().pages[0].reviewCurrent,true);
  f.amend(p.pageId,{title:'Pasikeitusi testinė antraštė'});assert.equal(f.status().pages[0].reviewCurrent,false);
  assert.equal(f.call({command:'record-review',pageId:p.pageId,expectedSiteHash:s.expectedSiteHash,review}).value.code,'workflow_context_stale');
  s=f.status();const before=await readFile(f.file);assert.equal(f.call({command:'approve-batch',pageIds:s.pages.map(p=>p.pageId),expectedSiteHash:s.expectedSiteHash,actorId:'fixture-agent'}).status,1);assert.deepEqual(await readFile(f.file),before);await f.unchanged();
});

test('complete synthetic dependency batch uses canonical approval/release and preserves snapshots after a new draft',async t=>{
  const f=await sandbox(t);f.ok({command:'amend-site',expectedSiteHash:f.status().expectedSiteHash,patch:{facts:'Tikras faktas apie fixture: jis yra izoliuotas sintetinis Node bandymas.',contact:{email:'fixture@example.invalid',phone:''},operatorName:'Sintetinio bandymo operatorius'}});
  const sharp=(await import('sharp')).default,sources=path.join(f.revision,'media-inputs');await mkdir(sources);const sourcePath=path.join(sources,'fixture.png');await writeFile(sourcePath,await sharp({create:{width:900,height:500,channels:3,background:'#7799aa'}}).png().toBuffer());
  const asset=f.ok({command:'import-media',expectedSiteHash:f.status().expectedSiteHash,sourcePath,metadata:{mime:'image/png',alt:'Sintetinė testinė schema',rights:'Originalus izoliuoto Node fixture vaizdas'}}).operation.result.assetId;
  for(const p of f.status().pages){
    if(p.type==='guide')f.write(p.pageId);
    const current=(await f.read()).pages.find(x=>x.id===p.pageId),editorial={...current.editorial,authors:p.type==='guide'?[{id:'fixture-editor',siteId:f.siteId,locale:'lt-LT',slug:'fixture-editor',name:'Sintetinio bandymo redakcija',role:'Izoliuotas Node fixture',bio:'Tai nėra tikras ekspertas ar kliento redakcija.',kind:'organization',sameAs:[]}]:[]};
    f.amend(p.pageId,{factChecks:[],externalLinks:[],...(p.type==='guide'?{media:[{id:asset}]}:{}),editorial,publishAt:'2030-01-01T00:00:00.000Z'});
  }
  const ids=f.status().pages.map(p=>p.pageId);f.ok({command:'finalize-links',pageIds:ids,expectedSiteHash:f.status().expectedSiteHash});
  for(const p of f.status().pages)f.ok({command:'record-review',pageId:p.pageId,expectedSiteHash:f.status().expectedSiteHash,review:{reviewer:'fixture-reviewer',revisionHash:p.revisionHash,evidence:evidence()}});
  const approved=f.ok({command:'approve-batch',pageIds:ids,expectedSiteHash:f.status().expectedSiteHash,actorId:'fixture-agent'});assert.ok(approved.pages.every(p=>p.hasApprovedRevision));
  const release=f.ok({command:'release',expectedSiteHash:approved.expectedSiteHash}),receipt=release.operation.result;
  assert.equal(receipt.state,'exported-not-deployed');assert.equal(release.release,'UNVERIFIED');assert.ok(!JSON.stringify(release).includes(f.dir));
  const directory=path.join(f.input.outputDir,'releases',f.siteId,receipt.releaseId);assert.equal((await verifyContentRelease(directory,validateV2Package)).state,'verified-export-not-deployed');
  const immutable=await readFile(path.join(directory,'content-package.json')),siteBefore=await f.read(),snapshot=siteBefore.pages[0].publishedRevision;
  const current=f.status(),home=current.pages.find(p=>p.type==='home');
  f.ok({command:'attach-media',pageId:home.pageId,expectedSiteHash:current.expectedSiteHash,
    expectedRevisionHash:home.revisionHash,expectedPlanningHash:home.planningHash,sourcePath,
    expectedSourceSha256:rawHash(await readFile(sourcePath)),metadata:{mime:'image/png',alt:'Sintetinė testinė schema',
      rights:'Originalus izoliuoto Node fixture vaizdas'}});
  assert.deepEqual((await f.read()).pages[0].publishedRevision,snapshot);
  assert.deepEqual(await readFile(path.join(directory,'content-package.json')),immutable);
  f.amend(siteBefore.pages[0].id,{title:'Naujas dar neperžiūrėtas juodraštis'});assert.deepEqual((await f.read()).pages[0].publishedRevision,snapshot);assert.deepEqual(await readFile(path.join(directory,'content-package.json')),immutable);
  assert.equal(f.call({command:'release',expectedSiteHash:f.status().expectedSiteHash}).status,1);await f.unchanged();
});
