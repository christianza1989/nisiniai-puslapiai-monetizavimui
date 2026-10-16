import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {stableV2} from '../src/content-package-v2.mjs';

const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
const sha=v=>createHash('sha256').update(v).digest('hex');
const script=name=>path.resolve(import.meta.dirname,'../scripts/'+name+'.mjs');
async function fixture(t,{legacyImporter=false}={}){
  const dir=await mkdtemp(path.join(os.tmpdir(),'private-native-continuity-'));
  t.after(async()=>{const target=path.resolve(dir);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('private-native-continuity-'));await rm(target,{recursive:true,force:true});});
  let historicalScript;
  if(legacyImporter){
    historicalScript=path.join(dir,'synthetic-prior-importer.mjs');
    const modules=pathToFileURL(path.resolve(import.meta.dirname,'../src')).href+'/';
    await writeFile(historicalScript,(await readFile(script('customer-creation-intake'),'utf8')).replaceAll("'../src/","'"+modules)
      +'\n// Isolated synthetic prior importer identity.\n');
  }
  const artifactsRoot=path.join(dir,'runtime/artifacts');await mkdir(artifactsRoot,{recursive:true});
  const network=path.join(dir,'network.json');await writeFile(network,JSON.stringify({defaultEmail:'unused@example.invalid',operatorName:'Synthetic operator',contactsBySite:{}}));
  const section={heading:'Synthetic private content',body:'This isolated synthetic fixture represents a private draft only. It makes no claims about an actual customer, product, professional author, delivery or public launch.',items:[]};
  const brief={path:'/gidai/fixture/',title:'How to prepare one synthetic test',intent:'Prepare one isolated native guide.',head_query:'Synthetic guide',audience_problem:'A synthetic team needs one bounded test.',business_goal:'Inspect the native writer without a provider.',primary_topic:'Synthetic preparation',reason:'Independent synthetic guide question.',month:'',seasonal_hook:'',pillar_path:'',outline:['Define the test.','Record its conditions.','Inspect the result.'],source_queries:['Synthetic source'],source_urls:['https://example.org/synthetic'],internal_links:['/'],media_brief:'A plain synthetic test diagram for isolated native continuity verification.',media_alt:'Synthetic diagram',priority:'initial'};
  const draft={business_name:'Continuity fixture',tagline:'Synthetic private fixture',business:{customer:'Synthetic team'},brand:{accent:'teal'},
    pages:['/','/gidai/','/kontaktai/'].map(p=>({path:p,title:'Synthetic private page',navigation_label:'Test',meta_description:'A private synthetic continuity fixture.',intent:'Inspect exact private native continuity.',sections:[section,section]})),content_plan:[brief]};
  const creationId=randomUUID(),revision=path.join(artifactsRoot,'customer-content',creationId,'revision-1');
  const input={creationId,acceptedRevision:1,sourceHash:digest(draft),canonicalHost:creationId.replaceAll('-','')+'.preview.invalid',artifactsRoot,dataDir:path.join(revision,'data'),outputDir:path.join(revision,'output')};
  const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR||process.env.PINET_PUBLIC_CORE_PATH||path.resolve(import.meta.dirname,'../../../dovanos-memorycasting');
  const env={...process.env,STUDIO_NETWORK_SETTINGS:network,STUDIO_PUBLIC_CORE_DIR:publicRoot};
  function call(name,value){
    const r=spawnSync(process.execPath,[historicalScript&&name==='customer-creation-intake'?historicalScript:script(name)],{input:JSON.stringify(value),encoding:'utf8',timeout:20000,windowsHide:true,env});assert.equal(r.error,undefined);
    let result;try{result=JSON.parse(r.status===0?r.stdout:r.stderr);}catch{result={code:'node_script_unavailable'};}
    return {status:r.status,value:result};
  }
  const ok=(name,value)=>{const r=call(name,value);assert.equal(r.status,0,JSON.stringify(r.value));return r.value;};
  const anchor=ok('customer-creation-intake',{...input,draft}),siteId=anchor.siteId,file=path.join(input.dataDir,'sites',siteId+'.json');
  const status=()=>ok('customer-content-workflow',{...input,command:'status'});
  const manifest=Object.fromEntries(Object.entries(anchor).filter(([k])=>!['manifestPath','dataDir','outputDir','replayed','workflow'].includes(k)));
  const marker={version:'private-native-anchor.v1',recovery_id:randomUUID(),receipt_id:randomUUID(),context_sha256:'1'.repeat(64),intake_sha256:digest(anchor),manifest_sha256:digest(manifest),observer_sha256:'0'.repeat(64)};
  try{marker.observer_sha256=sha(await readFile(script('customer-private-native-continuity')));}catch(error){if(error.code!=='ENOENT')throw error;}
  const observe=(extra={})=>call('customer-private-native-continuity',{version:'private-native-continuity-request.v1',...input,anchorIntake:anchor,anchor:marker,...extra});
  async function evolve(){
    const pageId=anchor.pageMappings.find(p=>p.path===brief.path).pageId,value={...input,pageId};
    const prepared=ok('customer-content-write',{...value,command:'prepare'});
    ok('customer-content-write',{...value,command:'apply',expectedRevisionHash:prepared.expectedRevisionHash,expectedPlanningHash:prepared.expectedPlanningHash,
      expectedContextHash:prepared.expectedContextHash,output:{title:brief.title,description:'An actual native synthetic guide without any provider.',intent:brief.intent,body:[{type:'paragraph',text:section.body+' This guide was written through the maintained native writer.'}],factChecks:['Synthetic fixture, not a real review.']}});
    const sourcePath=path.join(revision,'media-inputs','synthetic.png');await mkdir(path.dirname(sourcePath));
    const bytes=await sharp({create:{width:400,height:300,channels:3,background:'#125250'}}).png().toBuffer();await writeFile(sourcePath,bytes);
    const s=status(),p=s.pages.find(p=>p.pageId===pageId);
    ok('customer-content-workflow',{...input,command:'attach-media',pageId,sourcePath,expectedSourceSha256:sha(bytes),
      expectedSiteHash:s.expectedSiteHash,expectedRevisionHash:p.revisionHash,expectedPlanningHash:p.planningHash,
      metadata:{mime:'image/png',alt:'Plain synthetic continuity test diagram',rights:'Original isolated synthetic fixture'}});
  }
  async function files(){
    const entries={};async function walk(folder){for(const e of await readdir(folder,{withFileTypes:true})){const f=path.join(folder,e.name);if(e.isDirectory())await walk(f);else entries[path.relative(revision,f)]=sha(await readFile(f));}}
    await walk(revision);return entries;
  }
  async function pairedMarker(){
    const r=spawnSync('git',['rev-parse','HEAD'],{cwd:publicRoot,encoding:'utf8',windowsHide:true});assert.equal(r.status,0);
    const original={public_source_revision:'0'.repeat(40),importer_sha256:anchor.importerHash,network_sha256:sha(await readFile(network))};
    return {...marker,version:'private-native-anchor.v2',origin_source_revision:'a'.repeat(40),execution_source_revision:'b'.repeat(40),
      origin_native_sources:original,execution_native_sources:{...original,public_source_revision:r.stdout.trim(),importer_sha256:sha(await readFile(script('customer-creation-intake')))}};
  }
  return {input,anchor,marker,revision,file,call,ok,observe,evolve,files,status,pairedMarker};
}

test('paired upgrade executes the current observer and retains the different prior importer and native artifacts',async t=>{
  const f=await fixture(t,{legacyImporter:true});await f.evolve();const anchor=await f.pairedMarker(),before=await f.files();
  assert.notEqual(anchor.origin_native_sources.importer_sha256,anchor.execution_native_sources.importer_sha256);
  assert.notEqual(f.observe().status,0); // unchanged strict v1 refuses a different importer
  const r=f.observe({anchor});assert.equal(r.status,0,JSON.stringify(r.value));
  assert.equal(r.value.importerHash,f.anchor.importerHash);assert.deepEqual(r.value.nativeContinuity.anchor,anchor);
  assert.deepEqual(await f.files(),before);assert.equal(r.value.nativeContinuity.approval,'not-performed');
});

test('paired upgrade rejects forged origin/current importer, consumer, network and source bindings',async t=>{
  const f=await fixture(t,{legacyImporter:true});const anchor=await f.pairedMarker(),before=await f.files();
  const mutations=[a=>a.origin_native_sources.importer_sha256='f'.repeat(64),a=>a.execution_native_sources.importer_sha256='f'.repeat(64),
    a=>a.execution_native_sources.public_source_revision='f'.repeat(40),a=>a.origin_native_sources.network_sha256='f'.repeat(64),
    a=>{a.origin_native_sources.network_sha256=a.execution_native_sources.network_sha256='f'.repeat(64);},
    a=>a.execution_source_revision=a.origin_source_revision,a=>a.origin_source_revision='invalid',a=>a.execution_native_sources.extra=true];
  for(const mutate of mutations){const changed=structuredClone(anchor);mutate(changed);assert.notEqual(f.observe({anchor:changed}).status,0);assert.deepEqual(await f.files(),before);}
});

test('source renewal observes legitimate GUIDE/media evolution without weakening strict initial replay',async t=>{
  const f=await fixture(t);await f.evolve();
  const before=await f.files(),currentSha=sha(await readFile(f.file));assert.notEqual(currentSha,f.anchor.siteFileHash);
  const originalReplay=f.call('customer-creation-intake',{...f.input,draft:JSON.parse(await readFile(path.join(f.revision,'source-draft.json')))});
  assert.equal(originalReplay.value.code,'intake_artifact_changed');assert.deepEqual(await f.files(),before);
  const observed=f.observe();assert.equal(observed.status,0,JSON.stringify(observed.value));
  assert.equal(observed.value.siteFileHash,f.anchor.siteFileHash);
  assert.equal(observed.value.nativeContinuity.site_sha256,currentSha);
  assert.deepEqual(await f.files(),before);
});

test('unverified private contact/operator and empty planned guide are valid private drafts, not approval',async t=>{
  const f=await fixture(t),before=await f.files(),r=f.observe();assert.equal(r.status,0,JSON.stringify(r.value));
  const site=JSON.parse(await readFile(f.file));assert.equal(site.operatorName,'');assert.equal(site.contact.email,'');
  assert.ok(site.pages.some(p=>p.body.length===0));assert.deepEqual(await f.files(),before);
  for(const k of ['import','generation','sourceVerification','mediaVerification','editorialReview','approval','release','deployment','channelActivation'])assert.equal(r.value.nativeContinuity[k],'not-performed');
  assert.equal(r.value.fullF1,'UNVERIFIED');assert.equal(r.value.launch,'UNVERIFIED');
});

test('original source/context/manifest byte mutations still fail closed without repair',async t=>{
  const f=await fixture(t);await f.evolve();
  for(const name of ['source-draft.json','intake-context.json','intake-manifest.json']){
    const file=path.join(f.revision,name),original=await readFile(file);await writeFile(file,Buffer.concat([original,Buffer.from('\n')]));
    const before=await f.files(),r=f.observe();assert.notEqual(r.status,0,name);assert.deepEqual(await f.files(),before);
    await writeFile(file,original);
  }
});

test('partial or structurally corrupted mutable native state is not accepted as evolution',async t=>{
  const f=await fixture(t);await f.evolve();const original=await readFile(f.file),site=JSON.parse(original);
  const mutations=[s=>{s.id='foreign-site';},s=>{s.pages[0].siteId='foreign-site';},s=>{s.pages[0].body=[];},
    s=>{s.pages[0].body=[{type:'unknown',text:'invalid'}];},s=>{s.pages[0].siteSnapshot.canonicalHost='foreign.invalid';},
    s=>{s.pages.push(structuredClone(s.pages[0]));},s=>{s.pages[0].editorial.readingMinutes=1.5;},
    s=>{s.pages[0].slug='other';},s=>{s.pages[0].publishAt='not-a-date';},
    s=>{s.pages[0].links=[{targetPageId:'page-foreign',label:'Foreign'}];},
    s=>{s.pages[0].siteSnapshot.extraAuthority=true;},s=>{s.pages[0].approval={status:'approved',revisionHash:'0'.repeat(64)};}];
  for(const mutate of mutations){const changed=structuredClone(site);mutate(changed);await writeFile(f.file,JSON.stringify(changed));const before=await f.files();assert.notEqual(f.observe().status,0);assert.deepEqual(await f.files(),before);}
  await writeFile(f.file,'{"partial":');const before=await f.files();assert.notEqual(f.observe().status,0);assert.deepEqual(await f.files(),before);
  await writeFile(f.file,original);
});

test('retained media must exist, match its hash and decode to the recorded raster dimensions',async t=>{
  const f=await fixture(t);await f.evolve();const original=await readFile(f.file),site=JSON.parse(original),asset=site.assets[0];
  const file=path.join(f.input.dataDir,'media',f.anchor.siteId,path.basename(asset.src));assert.ok(file.startsWith(f.revision+path.sep));
  const bytes=await readFile(file),corrupt=Buffer.from(bytes);corrupt[0]^=255;await writeFile(file,corrupt);
  let before=await f.files();assert.notEqual(f.observe().status,0);assert.deepEqual(await f.files(),before);
  site.assets[0].sha256=sha(corrupt);await writeFile(f.file,JSON.stringify(site));before=await f.files();assert.notEqual(f.observe().status,0);assert.deepEqual(await f.files(),before);
  await writeFile(f.file,original);await unlink(file);before=await f.files();assert.notEqual(f.observe().status,0);assert.deepEqual(await f.files(),before);
  await writeFile(file,bytes);
});

test('changed anchor, observer, importer or scope cannot select another native case',async t=>{
  const f=await fixture(t);await f.evolve();const before=await f.files();
  const variants=[{sourceHash:'0'.repeat(64)},{canonicalHost:'foreign.preview.invalid'},{creationId:randomUUID()},
    {anchor:{...f.marker,observer_sha256:'0'.repeat(64)}},{anchor:{...f.marker,intake_sha256:'0'.repeat(64)}},
    {anchor:{...f.marker,manifest_sha256:'0'.repeat(64)}},{anchor:{...f.marker,provider:'paid'}},
    {provider:'paid'},{command:'release'},{sourcePath:'foreign'},{dataDir:os.tmpdir()}];
  for(const value of variants){assert.notEqual(f.observe(value).status,0);assert.deepEqual(await f.files(),before);}
  const forged={...f.anchor,importerHash:'0'.repeat(64)};
  assert.notEqual(f.observe({anchorIntake:forged,anchor:{...f.marker,intake_sha256:digest(forged)}}).status,0);assert.deepEqual(await f.files(),before);
});

test('legitimate site metadata evolution allows stale draft snapshots without inventing public facts',async t=>{
  const f=await fixture(t);await f.evolve();const s=f.status();
  f.ok('customer-content-workflow',{...f.input,command:'amend-site',expectedSiteHash:s.expectedSiteHash,
    patch:{operatorName:'Synthetic private operator',contact:{email:'fixture@example.invalid',phone:''},facts:'Only an isolated synthetic fixture.'}});
  const before=await f.files(),r=f.observe();assert.equal(r.status,0,JSON.stringify(r.value));assert.deepEqual(await f.files(),before);
  const site=JSON.parse(await readFile(f.file));assert.equal(site.operatorName,'Synthetic private operator');assert.equal(site.pages[0].siteSnapshot.operatorName,'');
  assert.ok(site.pages.every(p=>!p.approval&&!p.publishedRevision));
});
