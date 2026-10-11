import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,unlink} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {stableV2,validateV2Package} from '../src/content-package-v2.mjs';
import {verifyContentRelease} from '../src/content-release.mjs';
import {IMAGE_POLICY} from '../src/image-pipeline.mjs';

const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
const rawHash=v=>createHash('sha256').update(v).digest('hex');
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
  f.amend(siteBefore.pages[0].id,{title:'Naujas dar neperžiūrėtas juodraštis'});assert.deepEqual((await f.read()).pages[0].publishedRevision,snapshot);assert.deepEqual(await readFile(path.join(directory,'content-package.json')),immutable);
  assert.equal(f.call({command:'release',expectedSiteHash:f.status().expectedSiteHash}).status,1);await f.unchanged();
});
