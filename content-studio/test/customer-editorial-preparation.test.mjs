import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {stableV2} from '../src/content-package-v2.mjs';

const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
const script=name=>path.resolve(import.meta.dirname,'../scripts/'+name+'.mjs');
async function fixture(t){
  const dir=await mkdtemp(path.join(os.tmpdir(),'editorial-preparation-'));
  t.after(async()=>{assert.ok(dir.startsWith(path.join(os.tmpdir(),'editorial-preparation-')));await rm(dir,{recursive:true,force:true});});
  const artifactsRoot=path.join(dir,'runtime/artifacts');await mkdir(artifactsRoot,{recursive:true});
  const network=path.join(dir,'network.json');await writeFile(network,JSON.stringify({defaultEmail:'unused@example.invalid',operatorName:'Synthetic operator',contactsBySite:{}}));
  const section={heading:'Isolated preparation test',body:'This is an isolated synthetic editorial preparation fixture. Its content makes no claim about a real customer, supplier, commercial offer, review or launch.',items:[]};
  const draft={business_name:'Preparation fixture',tagline:'Private synthetic test',business:{customer:'Synthetic team'},brand:{accent:'indigo'},
    pages:['/','/gidai/','/kontaktai/'].map(p=>({path:p,title:'Synthetic preparation page',navigation_label:'Test',meta_description:'Private synthetic preparation fixture description.',intent:'Inspect one isolated editorial preparation operation.',sections:[section,section]})),content_plan:[]};
  const creationId=randomUUID(),revision=path.join(artifactsRoot,'customer-content',creationId,'revision-1');
  const input={creationId,acceptedRevision:1,sourceHash:digest(draft),canonicalHost:creationId.replaceAll('-','')+'.preview.invalid',artifactsRoot,dataDir:path.join(revision,'data'),outputDir:path.join(revision,'output')};
  const env={...process.env,STUDIO_NETWORK_SETTINGS:network};
  const invoke=(name,value)=>{const r=spawnSync(process.execPath,[script(name)],{input:JSON.stringify(value),encoding:'utf8',timeout:20000,windowsHide:true,env});assert.equal(r.error,undefined);return {status:r.status,value:JSON.parse(r.status===0?r.stdout:r.stderr)};};
  const imported=invoke('customer-creation-intake',{...input,draft});assert.equal(imported.status,0,JSON.stringify(imported.value));
  const siteId=imported.value.siteId,file=path.join(input.dataDir,'sites',siteId+'.json');
  const call=extra=>invoke('customer-content-workflow',{...input,...extra});
  const ok=extra=>{const r=call(extra);assert.equal(r.status,0,JSON.stringify(r.value));return r.value;};
  const status=()=>ok({command:'status'}),read=async()=>JSON.parse(await readFile(file));
  const original=await Promise.all(['source-draft.json','intake-context.json','intake-manifest.json'].map(async p=>[p,await readFile(path.join(revision,p))]));
  const unchanged=async()=>{for(const [p,bytes]of original)assert.deepEqual(await readFile(path.join(revision,p)),bytes);};
  const request=(action,extra={})=>({command:'prepare-editorial',operationId:randomUUID(),action,expectedSiteHash:status().expectedSiteHash,...extra});
  const pageRequest=(action,p,patch)=>{const s=status(),page=s.pages.find(x=>x.path===p);return request(action,{pageId:page.pageId,expectedRevisionHash:page.revisionHash,expectedPlanningHash:page.planningHash,...(patch?{patch}:{})});};
  const interrupt=(request,method,after)=>{
    const contextUrl=new URL('../scripts/customer-content-context.mjs',import.meta.url).href,workflowUrl=new URL('../scripts/customer-content-workflow.mjs',import.meta.url).href;
    const code=`const input=${JSON.stringify({...input,...request})},c=await(await import(${JSON.stringify(contextUrl)})).loadCustomerContentContext(input);const m=c.model;c.model={...m,${method}:async(...args)=>{${after?'await m.'+method+'(...args);':''}throw Object.assign(new Error('Synthetic interruption'),{code:'inert_interruption'});}};try{await(await import(${JSON.stringify(workflowUrl)})).prepareEditorial(c,input);throw Error('expected interruption');}catch(e){if(e.code!=='inert_interruption')throw e;}`;
    const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env,windowsHide:true});assert.equal(r.status,0,r.stderr);
  };
  const mutate=code=>{
    const model=new URL('../src/model.mjs',import.meta.url).href;
    const r=spawnSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(model)}),siteId=${JSON.stringify(siteId)};${code}`],{encoding:'utf8',env:{...env,STUDIO_DATA_DIR:input.dataDir,STUDIO_OUTPUT_DIR:input.outputDir},windowsHide:true});assert.equal(r.status,0,r.stderr);
  };
  return {input,revision,siteId,file,call,ok,status,read,request,pageRequest,unchanged,interrupt,mutate};
}

test('guarded preparation command durably amends existing site metadata and replays exactly',async t=>{
  const f=await fixture(t),request=f.request('amend-site',{patch:{facts:'This is only an isolated synthetic fixture.'}});
  const value=f.ok(request),r=value.operation.result;
  assert.equal(r.state,'applied');assert.equal(r.changed,true);assert.equal(r.replayed,false);
  const bytes=await readFile(f.file),again=f.ok(request).operation.result;
  assert.equal(again.replayed,true);assert.equal(again.changed,false);assert.equal(again.receiptSha256,r.receiptSha256);
  assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

test('metadata preparation preserves body/media/approved history and uses real organization author metadata',async t=>{
  const f=await fixture(t),before=await f.read(),page=before.pages.find(p=>p.slug==='gidai');
  const editorial={...page.editorial,authors:[{id:'synthetic-organization',siteId:f.siteId,locale:before.locale,slug:'fixture',name:'Synthetic editorial fixture',role:'Isolated test only',bio:'This is not a real expert or business.',kind:'organization',sameAs:[]}]};
  const result=f.ok(f.pageRequest('amend-page','/gidai/',{type:'index',editorial,publishAt:'2026-01-01T00:00:00Z'})).operation.result;
  const after=(await f.read()).pages.find(p=>p.id===page.id);
  assert.equal(after.type,'index');assert.equal(after.publishAt,'2026-01-01T00:00:00.000Z');
  assert.deepEqual(after.body,page.body);assert.deepEqual(after.media,page.media);assert.deepEqual(after.publishedRevision,page.publishedRevision);
  assert.equal(result.pageRevisions[0].pageId,page.id);
  for(const k of ['generation','sourceVerification','mediaVerification','editorialReview','approval','release','deployment','channelActivation','moduleAdmission'])assert.equal(result[k],'not-performed');
  await f.unchanged();
});

async function actionFixture(t,action){
  const f=await fixture(t),s=f.status(),home=s.pages.find(p=>p.type==='home'),guide=s.pages.find(p=>p.path==='/gidai/');
  if(action==='amend-site')return {f,method:'editSite',request:f.request(action,{patch:{name:'  Prepared synthetic site  ',contact:{email:'fixture@example.invalid',phone:''},brand:{accent:'#123456'}}})};
  if(action==='amend-page')return {f,method:'editPage',request:f.pageRequest(action,'/gidai/',{type:'about'})};
  if(action==='resolve-internal-links'){
    f.mutate(`await m.editPage(siteId,${JSON.stringify(home.pageId)},{body:[{type:'paragraph',text:'Read the [synthetic guide](/gidai/) for this fixture.'}]});`);
    return {f,method:'editPage',request:f.pageRequest(action,'/')};
  }
  f.ok({command:'amend-page',pageId:home.pageId,expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:home.revisionHash,expectedPlanningHash:home.planningHash,
    patch:{linkSuggestions:[{targetPageId:guide.pageId,label:'Synthetic guide',reason:'This synthetic target answers the next fixture question.'}]}});
  return {f,method:'finalizeInternalLinks',request:f.request(action,{pageIds:[home.pageId,guide.pageId]})};
}
for(const action of ['amend-site','amend-page','resolve-internal-links','finalize-links'])for(const after of [false,true]){
  test(`${action} reconciles interruption ${after?'after':'before'} canonical write without a duplicate transition`,async t=>{
    const {f,request,method}=await actionFixture(t,action),before=await readFile(f.file);
    f.interrupt(request,method,after);
    const interrupted=await readFile(f.file);assert.equal(interrupted.equals(before),!after);
    const saved=JSON.parse(await readFile(path.join(f.revision,'editorial-preparations',request.operationId+'.before.json')));
    assert.equal(saved.binding.operationId,request.operationId);assert.equal(saved.binding.expectedSiteHash,request.expectedSiteHash);
    const value=f.ok(request),r=value.operation.result;
    assert.equal(r.replayed,true);assert.equal(r.changed,!after);assert.equal(r.reconciled,after);
    if(after)assert.deepEqual(await readFile(f.file),interrupted);
    const final=await readFile(f.file);assert.equal(f.ok(request).operation.result.receiptSha256,r.receiptSha256);assert.deepEqual(await readFile(f.file),final);
    await f.unchanged();
  });
}

test('metadata/link no-op has durable proof but performs no canonical write',async t=>{
  const f=await fixture(t),bytes=await readFile(f.file),request=f.pageRequest('resolve-internal-links','/');
  const r=f.ok(request).operation.result;
  assert.equal(r.changeRequired,false);assert.equal(r.changed,false);assert.equal(r.reconciled,false);
  assert.equal(r.beforeSiteHash,r.appliedSiteHash);assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});

test('UUID reuse, stale replay and changed native state refuse rather than rebasing',async t=>{
  const f=await fixture(t),request=f.request('amend-site',{patch:{facts:'First synthetic fact.'}});
  f.ok(request);const bytes=await readFile(f.file);
  for(const value of [{...request,patch:{facts:'Conflicting synthetic fact.'}},{...request,operationId:randomUUID()}]){
    assert.equal(f.call(value).status,1);assert.deepEqual(await readFile(f.file),bytes);
  }
  f.ok(f.request('amend-site',{patch:{audience:'A different synthetic audience'}}));
  const later=await readFile(f.file);assert.equal(f.call(request).value.code,'workflow_context_stale');assert.deepEqual(await readFile(f.file),later);await f.unchanged();
});

test('an uncertain foreign edit is retained and cannot be mistaken for the intended transition',async t=>{
  const {f,request,method}=await actionFixture(t,'amend-page');f.interrupt(request,method,true);
  f.mutate(`await m.editSite(siteId,{facts:'An unrelated later synthetic edit.'});`);
  const bytes=await readFile(f.file),r=f.call(request);
  assert.equal(r.value.code,'workflow_preparation_uncertain');assert.deepEqual(await readFile(f.file),bytes);
  await assert.rejects(readFile(path.join(f.revision,'editorial-preparations',request.operationId+'.after.json')),{code:'ENOENT'});await f.unchanged();
});

test('preparation rejects body/media/identity/authority/executor fields and unsupported actions',async t=>{
  const f=await fixture(t),bytes=await readFile(f.file),page=f.pageRequest('amend-page','/gidai/',{type:'index'}),site=f.request('amend-site',{patch:{facts:'Synthetic'}});
  const invalid=[...['body','media','approval','publishedRevision','review','status','slug','title','factChecks'].map(k=>({...page,patch:{[k]:[]}})),
    ...['canonicalHost','renderer','stage','contentPolicy','sourcePath','dataDir','provider','executable'].map(k=>({...site,patch:{[k]:'forbidden'}})),
    ...['record-review','approve-batch','release','import-media','unknown'].map(action=>({...site,action})),
    {...site,operationId:'../foreign'},{...site,pageId:page.pageId},{...page,pageIds:[page.pageId]},
    {...site,canonicalHost:'foreign.example.invalid'},{...site,patch:{}},{...page,patch:{type:'home'}},
    {...f.request('finalize-links'),pageIds:[]},{...f.request('finalize-links'),pageIds:[page.pageId,page.pageId]},
    {...page,expectedRevisionHash:'0'.repeat(64)},{...page,expectedPlanningHash:'0'.repeat(64)},
    {...page,patch:{editorial:{...((await f.read()).pages[0].editorial),authors:[{id:'foreign'}]}}}];
  for(const value of invalid){assert.equal(f.call(value).status,1,JSON.stringify(value));assert.deepEqual(await readFile(f.file),bytes);}
  await f.unchanged();
});

test('tampered or partial immutable receipts fail closed and original evidence stays intact',async t=>{
  const f=await fixture(t),request=f.request('amend-site',{patch:{facts:'Synthetic receipt test'}});f.ok(request);
  const file=path.join(f.revision,'editorial-preparations',request.operationId+'.after.json'),before=await readFile(f.file),original=await readFile(file);
  const receipt=JSON.parse(original);receipt.site.facts='Forged synthetic receipt';await writeFile(file,JSON.stringify(receipt));
  assert.equal(f.call(request).value.code,'workflow_preparation_receipt_invalid');assert.deepEqual(await readFile(f.file),before);
  await writeFile(file,'{"version":');assert.equal(f.call(request).value.code,'workflow_preparation_receipt_invalid');assert.deepEqual(await readFile(f.file),before);await f.unchanged();
});

test('an existing operation lock is never stolen or rewritten even when old',async t=>{
  const f=await fixture(t),request=f.request('amend-site',{patch:{facts:'Synthetic locked operation'}}),directory=path.join(f.revision,'editorial-preparations');
  await mkdir(directory);const file=path.join(directory,request.operationId+'.lock'),bytes=Buffer.from(JSON.stringify({token:randomUUID(),pid:process.pid,createdAt:'2000-01-01T00:00:00.000Z'}));
  await writeFile(file,bytes);const original=await readFile(f.file);
  assert.equal(f.call(request).value.code,'workflow_preparation_busy');assert.deepEqual(await readFile(file),bytes);assert.deepEqual(await readFile(f.file),original);await f.unchanged();
});

test('unknown receipt authority and foreign finalize targets are refused atomically',async t=>{
  const f=await fixture(t),request=f.request('amend-site',{patch:{facts:'Synthetic receipt authority'}});f.ok(request);
  const file=path.join(f.revision,'editorial-preparations',request.operationId+'.after.json'),receipt=JSON.parse(await readFile(file));
  receipt.approval='performed';await writeFile(file,JSON.stringify(receipt));const bytes=await readFile(f.file);
  assert.equal(f.call(request).value.code,'workflow_preparation_receipt_invalid');
  const foreign=f.request('finalize-links',{pageIds:[f.status().pages[0].pageId,'page-foreign']});
  assert.equal(f.call(foreign).value.code,'workflow_unknown_link');assert.deepEqual(await readFile(f.file),bytes);await f.unchanged();
});
