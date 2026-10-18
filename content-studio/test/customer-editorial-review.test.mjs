import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,rm,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {stableV2} from '../src/content-package-v2.mjs';

const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
const modelUrl=new URL('../src/model.mjs',import.meta.url).href;
const contextUrl=new URL('../scripts/customer-content-context.mjs',import.meta.url).href;
const reviewUrl=new URL('../scripts/customer-editorial-review.mjs',import.meta.url).href;
const script=name=>path.resolve(import.meta.dirname,'../scripts/'+name+'.mjs');
const areas=['usefulness','facts','sources','media','links','presentation'];
const evidence=()=>Object.fromEntries(areas.map(k=>[k,`Isolated synthetic ${k} fixture checked for this exact revision; this is not actual customer content acceptance.`]));
function brief(p){return {path:p,title:'Isolated synthetic planning example',intent:'Explain one isolated synthetic acceptance scenario.',head_query:'Synthetic test scenario',
  audience_problem:'A synthetic reader needs one concrete bounded example.',business_goal:'Exercise the existing native approval gates.',primary_topic:'Synthetic fixture',
  reason:'Each synthetic URL has a separate isolated test purpose.',month:'',seasonal_hook:'',pillar_path:'',outline:['Select the fixture.','Read the constraints.','Inspect the retained result.'],
  source_queries:[],source_urls:[],internal_links:[],media_brief:'A synthetic illustration reserved only for isolated acceptance tests.',media_alt:'Synthetic test illustration',priority:'initial'};}
async function sandbox(t){
  const parent=path.resolve(os.tmpdir()),dir=await mkdtemp(path.join(parent,'editorial-review-test-'));
  t.after(async()=>{assert.equal(path.dirname(path.resolve(dir)),parent);assert.ok(path.basename(dir).startsWith('editorial-review-test-'));await rm(dir,{recursive:true,force:true});});
  const artifactsRoot=path.join(dir,'runtime','artifacts');await mkdir(artifactsRoot,{recursive:true});
  const network=path.join(dir,'network.json');await writeFile(network,JSON.stringify({defaultEmail:'unused@example.invalid',operatorName:'Synthetic operator',contactsBySite:{}}));
  const section={heading:'An isolated synthetic example',body:'This is synthetic fixture content for a local protocol test. It explains one bounded example and its constraints. It is not a customer result, verified business promise, factual review or published website.',items:[]};
  const draft={business_name:'Review protocol fixture',tagline:'Isolated native review test',business:{customer:'Synthetic test team'},brand:{accent:'indigo'},
    pages:['/','/gidai/','/kontaktai/','/apie/'].map(p=>({path:p,title:'Synthetic fixture page',navigation_label:'Fixture',meta_description:'A private synthetic native workflow fixture.',intent:'Explain the isolated synthetic protocol test.',sections:[section,section]})),
    content_plan:['/first/','/second/','/third/'].map(brief)};
  const creationId=randomUUID(),revision=path.join(artifactsRoot,'customer-content',creationId,'revision-1');
  const input={creationId,acceptedRevision:1,sourceHash:digest(draft),canonicalHost:'review.example.invalid',artifactsRoot,
    dataDir:path.join(revision,'data'),outputDir:path.join(revision,'output')};
  const env={...process.env,STUDIO_NETWORK_SETTINGS:network};
  const invoke=(name,value)=>{const r=spawnSync(process.execPath,[script(name)],{input:JSON.stringify(value),encoding:'utf8',timeout:20000,windowsHide:true,env});assert.equal(r.error,undefined);return {status:r.status,value:JSON.parse(r.status===0?r.stdout:r.stderr)};};
  const intake=invoke('customer-creation-intake',{...input,draft});assert.equal(intake.status,0,JSON.stringify(intake.value));
  const siteId=intake.value.siteId,file=path.join(input.dataDir,'sites',siteId+'.json');
  const call=extra=>invoke('customer-content-workflow',{...input,...extra});
  const ok=extra=>{const r=call(extra);assert.equal(r.status,0,JSON.stringify(r.value));return r.value;};
  const mutate=code=>{const r=spawnSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(modelUrl)}),siteId=${JSON.stringify(siteId)};${code}`],
    {encoding:'utf8',timeout:20000,windowsHide:true,env:{...env,STUDIO_DATA_DIR:input.dataDir,STUDIO_OUTPUT_DIR:input.outputDir}});assert.equal(r.status,0,r.stderr);return r.stdout.trim()?JSON.parse(r.stdout):null;};
  // Explicit preparation of isolated synthetic facts, not a production bypass.
  const ids=mutate(`await m.editSite(siteId,{facts:'Only synthetic local protocol data; no actual business claim.',operatorName:'Synthetic protocol fixture',contact:{email:'fixture@example.invalid',phone:''}});
    const s=await m.getSite(siteId),selected=s.pages.filter(p=>['home','contact'].includes(p.type));
    for(const p of selected)await m.editPage(siteId,p.id,{factChecks:[],links:[],linkSuggestions:[],body:[{type:'paragraph',text:${JSON.stringify(section.body)}}],editorial:{...p.editorial,relatedPageIds:[]}});
    console.log(JSON.stringify(selected.map(p=>p.id)));`);
  const status=()=>ok({command:'status'}),read=async()=>JSON.parse(await readFile(file));
  const common={command:'review-editorial',actorId:'session-user:'+randomUUID(),authorizingSessionId:randomUUID(),sourceRevision:'a'.repeat(40)};
  const request=(action,selected=ids)=>{const s=status();return {...common,action,operationId:randomUUID(),expectedSiteHash:s.expectedSiteHash,
    pages:selected.map(id=>{const p=s.pages.find(p=>p.pageId===id);return {pageId:id,revisionHash:p.revisionHash,planningHash:p.planningHash};}),...(action==='record-review'?{evidence:evidence()}:{})};};
  const originals=await Promise.all(['source-draft.json','intake-context.json','intake-manifest.json'].map(async p=>[p,await readFile(path.join(revision,p))]));
  const unchanged=async()=>{for(const [p,bytes]of originals)assert.deepEqual(await readFile(path.join(revision,p)),bytes);};
  return {input,revision,siteId,file,ids,call,ok,mutate,status,read,request,unchanged};
}

test('explicit native review then atomic approval retain exact actor, hashes and immutable replay',async t=>{
  const f=await sandbox(t);
  const first=f.request('record-review',[f.ids[0]]),review=f.ok(first).operation.result;
  assert.equal(review.editorialReview,'recorded');assert.equal(review.approval,'not-performed');assert.equal(review.actorId,first.actorId);
  const bytes=await readFile(f.file),replay=f.ok({...first,authorizingSessionId:randomUUID()}).operation.result;
  assert.equal(replay.replayed,true);assert.equal(replay.changed,false);assert.equal(replay.receiptSha256,review.receiptSha256);assert.deepEqual(await readFile(f.file),bytes);
  f.ok(f.request('record-review',[f.ids[1]]));
  const approve=f.request('approve-batch'),approved=f.ok(approve).operation.result;
  assert.equal(approved.approval,'approved');assert.equal(approved.editorialReview,'not-performed');assert.equal(approved.release,'not-performed');assert.equal(approved.launch,'UNVERIFIED');
  const site=await f.read();
  for(const id of f.ids){const p=site.pages.find(p=>p.id===id);assert.equal(p.approval.actorId,approve.actorId);assert.equal(p.publishedRevision.revisionHash,approve.pages.find(p=>p.pageId===id).revisionHash);}
  const after=await readFile(f.file);assert.equal(f.ok(approve).operation.result.replayed,true);assert.deepEqual(await readFile(f.file),after);await f.unchanged();
});

test('exact pins, owner identity, unknown commands and malformed evidence cannot write',async t=>{
  const f=await sandbox(t),request=f.request('record-review',[f.ids[0]]),bytes=await readFile(f.file);
  for(const change of [{expectedSiteHash:'f'.repeat(64)},{pages:[{...request.pages[0],revisionHash:'f'.repeat(64)}]},
    {pages:[{...request.pages[0],planningHash:'f'.repeat(64)}]},{pages:[{...request.pages[0],pageId:'foreign-page'}]},
    {actorId:'invented-reviewer'},{evidence:{...request.evidence,presentation:'PASS'}},{reviewer:'forged'},
    {action:'release'},{patch:{factChecks:[]}},{canonicalHost:'foreign.example.invalid'}]){
    assert.equal(f.call({...request,...change,operationId:randomUUID()}).status,1);assert.deepEqual(await readFile(f.file),bytes);
  }
  f.ok(request);const applied=await readFile(f.file);
  assert.equal(f.call({...request,actorId:'session-user:'+randomUUID()}).value.code,'workflow_review_conflict');assert.deepEqual(await readFile(f.file),applied);await f.unchanged();
});

test('current facts and complete reviewed dependency gates remain canonical and batch is atomic',async t=>{
  const f=await sandbox(t);for(const id of f.ids)f.ok(f.request('record-review',[id]));
  f.mutate(`await m.editSite(siteId,{facts:'Explicitly changed synthetic facts invalidate the prior review binding.'});`);
  const first=f.request('approve-batch'),before=await readFile(f.file);
  assert.equal(f.call(first).value.code,'workflow_review_rejected');assert.deepEqual(await readFile(f.file),before);
  assert.equal(f.call(first).value.code,'workflow_review_rejected');
  // Re-review current isolated data, then retain an unresolved factual note.
  for(const id of f.ids)f.ok(f.request('record-review',[id]));
  f.mutate(`await m.editPage(siteId,${JSON.stringify(f.ids[1])},{factChecks:['Unresolved synthetic note blocks the entire batch.']});`);
  const next=f.request('approve-batch'),bytes=await readFile(f.file);assert.equal(f.call(next).value.code,'workflow_review_rejected');assert.deepEqual(await readFile(f.file),bytes);
  assert.ok((await f.read()).pages.filter(p=>f.ids.includes(p.id)).every(p=>!p.publishedRevision));await f.unchanged();
});

test('a dispatched write without an applied receipt is uncertain and cannot be repeated',async t=>{
  const f=await sandbox(t),request=f.request('record-review',[f.ids[0]]),input={...f.input,...request};
  const failure=f.mutate(`const input=${JSON.stringify(input)},c=await(await import(${JSON.stringify(contextUrl)})).loadCustomerContentContext(input),original=c.model;
    c.model={...original,recordEditorialReview:async(...args)=>{await original.recordEditorialReview(...args);throw Error('inert lost native response');}};
    try{await(await import(${JSON.stringify(reviewUrl)})).reviewEditorial(c,input);throw Error('unexpected success');}catch(e){console.log(JSON.stringify({code:e.code}));}`);
  assert.equal(failure.code,'workflow_review_uncertain');const bytes=await readFile(f.file);
  assert.equal(f.call(request).value.code,'workflow_review_uncertain');assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

test('busy ownership and corrupted immutable receipts fail closed',async t=>{
  const f=await sandbox(t),request=f.request('record-review',[f.ids[0]]),lock=path.join(f.revision,'.editorial-review.lock');
  await writeFile(lock,JSON.stringify({pid:123,token:'retained'}));const before=await readFile(f.file);
  assert.equal(f.call(request).value.code,'workflow_review_busy');assert.deepEqual(await readFile(f.file),before);await unlink(lock);
  f.ok(request);const file=path.join(f.revision,'editorial-review-operations',request.operationId+'.applied.json'),receipt=JSON.parse(await readFile(file));
  receipt.requestHash='f'.repeat(64);await writeFile(file,JSON.stringify(receipt));const bytes=await readFile(f.file);
  assert.equal(f.call(request).value.code,'workflow_review_receipt_invalid');assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

for(const gate of ['source','link','media'])test('canonical '+gate+' gate refuses the full approval batch',async t=>{
  const f=await sandbox(t);
  if(gate==='source')f.mutate(`await m.editPage(siteId,${JSON.stringify(f.ids[0])},{externalLinks:[{url:'https://example.invalid/source',label:'Synthetic source',reason:'Only an isolated unresolved source gate.',verified:false}]});`);
  if(gate==='link')f.mutate(`const s=await m.getSite(siteId),future=s.pages.find(p=>p.type==='guide');await m.editPage(siteId,${JSON.stringify(f.ids[0])},{links:[{targetPageId:future.id,label:'Unapproved synthetic target'}]});`);
  if(gate==='media')f.mutate(`const {createRequire}=await import('node:module'),sharp=createRequire(${JSON.stringify(new URL('../package.json',import.meta.url).href)})('sharp');
    const bytes=await sharp({create:{width:400,height:300,channels:3,background:'#224466'}}).png().toBuffer();
    const asset=await m.saveResponsiveAsset(siteId,{mime:'image/png',alt:'Synthetic fixture image',rights:'Only an isolated synthetic test'},bytes);
    await m.editPage(siteId,${JSON.stringify(f.ids[0])},{media:[{id:asset.id}]});`);
  for(const id of f.ids)f.ok(f.request('record-review',[id]));
  if(gate==='media')f.mutate(`const s=await m.getSite(siteId),p=s.pages.find(p=>p.id===${JSON.stringify(f.ids[0])}),path=await import('node:path'),fs=await import('node:fs/promises');
    const directory=path.join(m.DATA,'media',siteId),file=path.join(directory,path.basename(p.media[0].src));
    if(path.dirname(file)!==directory)throw Error('unsafe fixture target');await fs.unlink(file);`);
  const body=f.request('approve-batch'),bytes=await readFile(f.file),refused=f.call(body);
  assert.equal(refused.value.code,'workflow_review_rejected');assert.deepEqual(await readFile(f.file),bytes);
  assert.ok((await f.read()).pages.filter(p=>f.ids.includes(p.id)).every(p=>!p.publishedRevision));await f.unchanged();
});

test('review of an edited draft retains the distinct immutable older approved snapshot',async t=>{
  const f=await sandbox(t);for(const id of f.ids)f.ok(f.request('record-review',[id]));
  f.ok(f.request('approve-batch'));
  const old=(await f.read()).pages.find(p=>p.id===f.ids[0]).publishedRevision;
  f.mutate(`await m.editPage(siteId,${JSON.stringify(f.ids[0])},{description:'An explicitly edited synthetic current draft keeps its older approved snapshot.'});`);
  const body=f.request('record-review',[f.ids[0]]),value=f.ok(body).operation.result;
  assert.notEqual(value.pageRevisions[0].revisionHash,old.revisionHash);
  assert.equal(value.pageRevisions[0].approvedRevisionHash,old.revisionHash);
  assert.equal(value.pageRevisions[0].approvalSha256,digest(old.approval));
  assert.deepEqual((await f.read()).pages.find(p=>p.id===f.ids[0]).publishedRevision,old);
  assert.equal(value.approval,'not-performed');await f.unchanged();
});
