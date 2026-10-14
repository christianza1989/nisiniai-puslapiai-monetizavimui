// Synthetic protocol tests. No original account, model, hosting or quality acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,unlink,readdir} from 'node:fs/promises';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {stableV2} from '../src/content-package-v2.mjs';
import {validateScope,previewBinding} from '../scripts/customer-site-foundation.mjs';
import {catalogFromMarkdown} from '../../SKILLS/niche-site-audit/scripts/score-audit.mjs';

const ROOT=path.resolve(import.meta.dirname,'../..'),publicCore=path.resolve(process.env.PINET_PUBLIC_CORE_PATH||path.resolve(ROOT,'../dovanos-memorycasting'));
const hash=value=>createHash('sha256').update(value).digest('hex'),digest=value=>hash(stableV2(value));
const script=name=>path.join(ROOT,'content-studio/scripts',name+'.mjs');
const execution=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
const publicRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:publicCore,encoding:'utf8'}).trim();
const evidence=()=>Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(k=>[k,
  `Synthetic protocol fixture ${k} only; this record tests exact revision binding and is not a real editorial/customer/launch assessment.`]));
async function fixture(t){
  const temporary=await mkdtemp(path.join(os.tmpdir(),'pinet-foundation-'));
  t.after(async()=>{assert.equal(path.dirname(temporary),os.tmpdir());assert.ok(path.basename(temporary).startsWith('pinet-foundation-'));assert.equal((await fs.promises.lstat(temporary)).isSymbolicLink(),false);
    const native=path.join(temporary,'runtime/artifacts/customer-content');
    try{for(const owner of await readdir(native)){const foundation=path.join(native,owner,'revision-1/foundation');try{for(const scope of await readdir(foundation)){const folder=path.join(foundation,scope),target=path.join(ROOT,'agent-business-core/runtime/artifacts/s5-foundation/node-evidence',path.basename(temporary),scope);await mkdir(target,{recursive:true});for(const name of await readdir(folder))if(/^completion-[a-f0-9]{64}\.json$/.test(name))await writeFile(path.join(target,name),await readFile(path.join(folder,name)),{flag:'wx'});}}catch(error){if(error.code!=='ENOENT')throw error;}}}catch(error){if(error.code!=='ENOENT')throw error;}
    await rm(temporary,{recursive:true,force:true});});
  const artifactsRoot=path.join(temporary,'runtime/artifacts');await mkdir(artifactsRoot,{recursive:true});
  const creationId=randomUUID(),directory=path.join(artifactsRoot,'customer-content',creationId,'revision-1');
  const section={heading:'Sintetinio bandymo žingsnis',body:'Tai izoliuoto protokolo bandymo turinys. Jis aprašo tik testinius duomenis ir tikrinimo žingsnius, o ne tikro kliento paslaugą, pasiektą rezultatą ar publikavimo pažadą.',items:[]};
  const draft={business_name:'Sintetinis Foundation bandymas',tagline:'Izoliuotas protokolo fixture',business:{customer:'Sintetinė komanda'},brand:{accent:'indigo'},
    pages:[['/','home'],['/gidai/','index'],['/gidai/bandymas/','guide'],['/redakcija/','author'],['/kontaktai/','contact'],['/privatumas/','policy']].map(([p,type])=>({path:p,type,title:'Sintetinis '+type+' puslapis',navigation_label:type,meta_description:'Izoliuota protokolo patikra su sintetiniais puslapiais.',intent:'Patikrinti vieną protokolo vaidmenį.',sections:[section,section]})),content_plan:[]};
  const base={creationId,acceptedRevision:1,sourceHash:digest(draft),canonicalHost:'foundation.example',artifactsRoot,dataDir:path.join(directory,'data'),outputDir:path.join(directory,'output')};
  const env={...process.env,STUDIO_PUBLIC_CORE_DIR:publicCore,STUDIO_NETWORK_SETTINGS:path.join(publicCore,'config/niche-network.json')};
  function call(name,input){const r=spawnSync(process.execPath,[script(name)],{input:JSON.stringify(input),encoding:'utf8',env,windowsHide:true,timeout:30000});assert.equal(r.error,undefined);return {status:r.status,value:JSON.parse(r.status===0?r.stdout:r.stderr)};}
  function asyncCall(input){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[script('customer-site-foundation')],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('exit',status=>{try{resolve({status,value:JSON.parse(status===0?out:err)});}catch(e){reject(e);}});child.stdin.end(JSON.stringify(input));});}
  const intake=call('customer-creation-intake',{...base,draft,knownContact:{email:'qa@foundation.example',phone:''},verifiedFacts:['This is only a synthetic protocol fixture.'],operatorName:'Sintetinis QA operatorius'});assert.equal(intake.status,0,JSON.stringify(intake.value));
  const siteId=intake.value.siteId,file=path.join(base.dataDir,'sites',siteId+'.json');
  const workflow=extra=>{const r=call('customer-content-workflow',{...base,...extra});assert.equal(r.status,0,JSON.stringify(r.value));return r.value;};
  const status=()=>workflow({command:'status'}),site=async()=>JSON.parse(await readFile(file));
  function amend(p,patch){const state=status(),row=state.pages.find(r=>r.pageId===p);return workflow({command:'amend-page',pageId:p,expectedSiteHash:state.expectedSiteHash,expectedRevisionHash:row.revisionHash,expectedPlanningHash:row.planningHash,patch});}
  const original=await Promise.all(['source-draft.json','intake-context.json','intake-manifest.json'].map(async n=>[n,hash(await readFile(path.join(directory,n)))]));
  const pins={execution_source_revision:execution,public_source_revision:publicRevision,bridge_sha256:hash(await readFile(script('customer-site-foundation'))),verifier_sha256:hash(await readFile(path.join(ROOT,'SKILLS/niche-site-audit/scripts/verify-site-completion.mjs'))),parser_sha256:hash(await readFile(path.join(ROOT,'SKILLS/niche-site-audit/scripts/rendered_site.py')))};
  function scope(){const current=status();return {...Object.fromEntries(['user_id','organization_id','portfolio_id','session_id','approval_id','approval_session_id','discovery_id','report_id'].map(k=>[k,randomUUID()])),environment_id:'test-foundation-node',creation_id:creationId,approval_fingerprint:'a'.repeat(64),report_revision:1,report_sha256:'b'.repeat(64),accepted:{revision_id:randomUUID(),accepted_revision:1,candidate_sha256:base.sourceHash,accepted_source_revision:execution,site_id:siteId,canonical_host:base.canonicalHost,coordinator_event_id:randomUUID(),coordinator_sha256:'c'.repeat(64),intake_sha256:digest(intake.value),intake_request_sha256:intake.value.requestHash,intake_importer_sha256:intake.value.importerHash,intake_site_file_sha256:intake.value.siteFileHash},sources:pins,language_review_mode:'required',site_context_sha256:current.expectedSiteHash,page_snapshot_sha256:digest([...current.pages].sort((a,b)=>a.pageId<b.pageId?-1:1)),required_page_ids:current.pages.map(p=>p.pageId).sort()};}
  const request=(pin,command='candidate')=>({...base,scope:pin,command});
  async function prepare(){
    const sharp=(await import('sharp')).default,inputs=path.join(directory,'media-inputs');await mkdir(inputs);const sourcePath=path.join(inputs,'fixture.png');
    await writeFile(sourcePath,await sharp({create:{width:360,height:240,channels:3,background:'#456789'}}).png().toBuffer());
    const imported=workflow({command:'import-media',expectedSiteHash:status().expectedSiteHash,sourcePath,metadata:{mime:'image/png',alt:'Tik sintetinio protokolo spalvų schema',rights:'Generated solely for this synthetic protocol fixture'}}).operation.result;
    const author={id:'qa-editor',siteId,locale:'lt-LT',slug:'redakcija',name:'Sintetinė QA redakcija',role:'Protokolo fixture',bio:'Tai tik sintetinis įrašas, ne tikras ekspertas ar kliento redakcija.',kind:'organization',sameAs:[]};
    for(const row of status().pages){const page=(await site()).pages.find(p=>p.id===row.pageId),article=['guide','article'].includes(page.type),editorial={...page.editorial,authors:article||page.type==='author'?[author]:[],datePublished:article?new Date(Date.now()-60000).toISOString():null,dateModified:null,featuredImageId:article?imported.assetId:null};amend(row.pageId,{factChecks:[],externalLinks:[],editorial,publishAt:new Date(Date.now()-60000).toISOString(),...(article?{media:[{id:imported.assetId}]}:{})});}
    const ids=status().pages.map(p=>p.pageId);workflow({command:'finalize-links',pageIds:ids,expectedSiteHash:status().expectedSiteHash});
    for(const row of status().pages)workflow({command:'record-review',pageId:row.pageId,expectedSiteHash:status().expectedSiteHash,review:{reviewer:'synthetic-protocol-fixture',revisionHash:row.revisionHash,evidence:evidence()}});
    workflow({command:'approve-batch',pageIds:ids,expectedSiteHash:status().expectedSiteHash,actorId:'synthetic-protocol-fixture'});
  }
  async function unchanged(){for(const [n,h]of original)assert.equal(hash(await readFile(path.join(directory,n))),h);}
  return {temporary,base,env,directory,siteId,file,status,site,scope,request,call,asyncCall,workflow,amend,prepare,unchanged};
}

test('unreviewed native case stays blocked; foreign scope and arbitrary origin/path fail before any release',async t=>{
  const f=await fixture(t),pin=f.scope(),input=f.request(pin),result=f.call('customer-site-foundation',input);
  assert.equal(result.status,0);assert.equal(result.value.state,'blocked');assert.equal(result.value.release,null);assert.equal(result.value.admission,'not_performed');
  for(const patch of [{origin:'http://127.0.0.1:9'},{dataDir:f.temporary},{scope:{...pin,permissions:['anything']}},{scope:{...pin,site_context_sha256:'0'.repeat(64)}}])assert.equal(f.call('customer-site-foundation',{...input,...patch}).status,1);
  assert.throws(()=>validateScope({...pin,token:'not-accepted'}));await f.unchanged();
});

test('canonical complete synthetic release is replayed once; missing local evidence, aliases and tampering never certify it',async t=>{
  const f=await fixture(t);await f.prepare();const pin=f.scope(),input=f.request(pin),first=f.call('customer-site-foundation',input);
  assert.equal(first.status,0,JSON.stringify(first.value));assert.equal(first.value.state,'candidate');assert.equal(first.value.synthetic,true);
  const replay=f.call('customer-site-foundation',input);assert.deepEqual(replay.value.release,first.value.release);
  for(const field of ['intake_request_sha256','intake_importer_sha256','intake_site_file_sha256']){const foreign={...pin,accepted:{...pin.accepted,[field]:'0'.repeat(64)}};assert.equal(f.call('customer-site-foundation',f.request(foreign)).value.code,'foundation_native_intake_changed');}
  assert.equal((await readdir(path.join(f.base.outputDir,'releases',f.siteId))).length,1);
  const missing=f.call('customer-site-foundation',f.request(pin,'verify-local'));assert.equal(missing.value.state,'candidate');assert.deepEqual(missing.value.blockers,['local_evidence_missing']);
  const dir=path.join(f.directory,'foundation',digest(pin)),preview={version:1,scopeSha256:digest(pin),packageSha256:first.value.release.package_sha256,releaseId:first.value.release.release_id,publicSourceRevision:publicRevision,origin:'http://127.0.0.1:9'};
  for(const origin of ['https://example.org','http://user:password@127.0.0.1:9','http://127.0.0.1:9/private','http://localhost:9/?x=1'])assert.throws(()=>previewBinding({...preview,origin},pin,first.value.release));
  const alias=path.join(dir,'preview.json');await symlink(path.join(f.temporary,'outside'),alias,process.platform==='win32'?'junction':'dir');assert.equal(f.call('customer-site-foundation',f.request(pin,'verify-local')).value.state,'candidate');await unlink(alias);
  const packageFile=path.join(f.base.outputDir,'releases',f.siteId,first.value.release.release_id,'content-package.json'),bytes=await readFile(packageFile);await writeFile(packageFile,Buffer.concat([bytes,Buffer.from(' ')]));const corrupted=f.call('customer-site-foundation',input);assert.equal(corrupted.value.state,'blocked');assert.equal(corrupted.value.release,null);await writeFile(packageFile,bytes);
  const guide=(await f.site()).pages.find(p=>p.type==='guide'),asset=guide.media[0],mediaFile=path.join(f.base.dataDir,'media',f.siteId,path.basename(asset.src)),image=await readFile(mediaFile);await writeFile(mediaFile,Buffer.from('bad-pixels'));assert.equal(f.call('customer-site-foundation',input).value.code,'foundation_current_media_invalid');await writeFile(mediaFile,image);
  f.amend(pin.required_page_ids[0],{title:'Pasikeitęs privatus juodraštis'});assert.equal(f.call('customer-site-foundation',input).value.code,'foundation_context_stale');await f.unchanged();
});

async function rendererFixture(pkg,releaseDirectory,t){
  // Load the actual shared renderer/SEO helpers; only HTTP/storage are fixture adapters.
  const require=createRequire(path.join(publicCore,'package.json')),ts=require('typescript'),React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
  const media=await import(pathToFileURL(path.join(publicCore,'lib/niche-media.mjs'))),projection=await import(pathToFileURL(path.join(publicCore,'lib/content-projection-v2.mjs'))),seo=await import(pathToFileURL(path.join(publicCore,'lib/content-seo-v2.mjs')));
  const cache=new Map();function load(relative){const file=path.resolve(publicCore,relative);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
    const local=name=>{if(name.endsWith('niche-media.mjs'))return media;if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,k)=>String(k)})};if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.join(publicCore,name.slice(2)):path.resolve(path.dirname(file),name);const found=[base,base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p));if(!found||!found.startsWith(publicCore+path.sep))throw Error('Unscoped fixture import');return load(path.relative(publicCore,found));}return require(name);};vm.runInNewContext(output,{module:m,exports:m.exports,require:local,URL,Intl,Date,Set,Map,console});cache.set(file,m.exports);return m.exports;}
  const {NativeContentSite}=load('components/niche/native-content-site.tsx'),{contentMetadata}=load('lib/content-page-seo.ts'),pages=projection.projectContentPagesV2(pkg,[pkg],{},{}),http=[];
  const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname;http.push(p);res.setHeader('x-niche-package-sha256',hash(fs.readFileSync(path.join(releaseDirectory,'content-package.json'))));res.setHeader('x-niche-source-revision',publicRevision);
    const page=pages.find(page=>new URL(page.url).pathname===p);if(page){const meta=contentMetadata(pkg,page),body=render(React.createElement(NativeContentSite,{pkg,page,livePages:pages}));res.setHeader('content-type','text/html');res.end(`<!doctype html><html lang="lt"><head><title>${meta.title}</title><meta name="description" content="${page.description}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${page.url}"><meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:url" content="${page.url}">${(meta.openGraph?.images||[]).map(image=>`<meta property="og:image" content="${image.url}">`).join('')}</head><body>${body}</body></html>`);return;}
    if(p.startsWith('/content-assets/'+pkg.siteId+'/')){const file=path.join(releaseDirectory,'assets',path.basename(p));if(fs.existsSync(file)){res.setHeader('content-type','image/webp');res.end(fs.readFileSync(file));return;}}
    const kind={'/sitemap.xml':'sitemap','/llms.txt':'llms','/llms-full.txt':'llms-full','/robots.txt':'robots'}[p];if(kind){const value=seo.contentSeoV2(pkg,pages,kind,true);res.setHeader('content-type',value.type);res.end(value.body);return;}res.statusCode=404;res.end('Not found');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const stop=()=>server.listening?new Promise(resolve=>server.close(resolve)):Promise.resolve();t.after(stop);
  return {origin:'http://127.0.0.1:'+server.address().port,http,stop};
}

async function inventory(directory){
  const entries=[];
  async function visit(folder){for(const entry of await fs.promises.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name),stat=await fs.promises.lstat(file);assert.equal(stat.isSymbolicLink(),false);if(entry.isDirectory())await visit(file);else entries.push([path.relative(directory,file),hash(await readFile(file)),stat.mtimeMs]);}}
  await visit(directory);return entries.sort((a,b)=>a[0].localeCompare(b[0]));
}

import {pathToFileURL} from 'node:url';
test('full local verifier really crawls a synthetic renderer; incomplete audit and changed evidence remain candidates',async t=>{
  const f=await fixture(t);await f.prepare();const pin=f.scope(),first=f.call('customer-site-foundation',f.request(pin)).value;assert.equal(first.state,'candidate');
  const dir=path.join(f.directory,'foundation',digest(pin)),releaseDirectory=path.join(f.base.outputDir,'releases',f.siteId,first.release.release_id),pkg=JSON.parse(await readFile(path.join(releaseDirectory,'content-package.json'))),server=await rendererFixture(pkg,releaseDirectory,t);
  const evidenceFile='evidence-protocol.json',evidenceBytes=Buffer.from(JSON.stringify({synthetic:true,scope:'fixture protocol assumptions only; not factual/pixel/form/customer acceptance',source:publicRevision}));await writeFile(path.join(dir,evidenceFile),evidenceBytes);
  const review={version:1,scopeSha256:digest(pin),packageSha256:first.release.package_sha256,publicSourceRevision:publicRevision,reviewer:'synthetic-protocol-fixture',checkedAt:new Date().toISOString(),areas:Object.fromEntries(['facts','sources','media','presentation','enlargement','inquiry','measurement','language'].map(k=>[k,{status:'PASS',files:[{name:evidenceFile,sha256:hash(evidenceBytes)}]}]))};
  // These are controlled test inputs, not an automatically generated real A–Z audit.
  const catalog=catalogFromMarkdown(await readFile(path.join(ROOT,'SKILLS/niche-site-audit/references/checklist.md'),'utf8'));
  const audit={siteId:f.siteId,canonicalHost:pkg.canonicalHost,evaluatedAt:new Date().toISOString(),version:{packageSha256:first.release.package_sha256,sourceVersion:publicRevision},checks:catalog.map(c=>({id:c.id,status:c.stage==='local'?'PASS':'UNVERIFIED',evidence:c.stage==='local'?['Synthetic protocol assumption, not site acceptance']:[],notes:'Only an isolated test input.'}))};
  const preview={version:1,scopeSha256:digest(pin),packageSha256:first.release.package_sha256,releaseId:first.release.release_id,publicSourceRevision:publicRevision,origin:server.origin};
  await writeFile(path.join(dir,'preview.json'),JSON.stringify(preview));await writeFile(path.join(dir,'review-evidence.json'),JSON.stringify(review));await writeFile(path.join(dir,'PHASE-1-AUDIT.json'),JSON.stringify(audit));
  const result=await f.asyncCall(f.request(pin,'verify-local'));assert.equal(result.status,0,JSON.stringify(result.value));assert.equal(result.value.state,'verified-local',JSON.stringify(result.value));assert.equal(result.value.synthetic,true);assert.equal(result.value.admission,'not_performed');assert.ok(server.http.length>12);assert.ok(result.value.completion.requests>12);
  const paused={...pin,language_review_mode:'paused_local_pilot'},pausedRelease=f.call('customer-site-foundation',f.request(paused)).value.release,pausedDir=path.join(f.directory,'foundation',digest(paused));
  await writeFile(path.join(pausedDir,'preview.json'),JSON.stringify({...preview,scopeSha256:digest(paused),packageSha256:pausedRelease.package_sha256,releaseId:pausedRelease.release_id}));
  await writeFile(path.join(pausedDir,'PHASE-1-AUDIT.json'),JSON.stringify({...audit,version:{...audit.version,packageSha256:pausedRelease.package_sha256}}));
  await writeFile(path.join(pausedDir,evidenceFile),evidenceBytes);
  await writeFile(path.join(pausedDir,'review-evidence.json'),JSON.stringify({...review,scopeSha256:digest(paused),packageSha256:pausedRelease.package_sha256}));
  assert.deepEqual((await f.asyncCall(f.request(paused,'verify-local'))).value.blockers,['foundation_language_review_paused']);
  audit.checks.find(c=>c.status==='PASS').status='UNVERIFIED';await writeFile(path.join(dir,'PHASE-1-AUDIT.json'),JSON.stringify(audit));const denied=await f.asyncCall(f.request(pin,'verify-local'));assert.equal(denied.value.state,'candidate');assert.equal(denied.value.completion,null);
  review.areas.media.status='UNVERIFIED';await writeFile(path.join(dir,'review-evidence.json'),JSON.stringify(review));const pixels=await f.asyncCall(f.request(pin,'verify-local'));assert.ok(pixels.value.blockers.includes('foundation_review_incomplete'));await f.unchanged();
  // Restore the exact observed records; current validation is not another live HTTP claim.
  audit.checks=catalog.map(c=>({id:c.id,status:c.stage==='local'?'PASS':'UNVERIFIED',evidence:c.stage==='local'?['Synthetic protocol assumption, not site acceptance']:[],notes:'Only an isolated test input.'}));
  review.areas.media.status='PASS';await writeFile(path.join(dir,'PHASE-1-AUDIT.json'),JSON.stringify(audit));await writeFile(path.join(dir,'review-evidence.json'),JSON.stringify(review));
  await server.stop();const httpCount=server.http.length;
  const recorded=structuredClone(result.value);recorded.completion.checked_at=recorded.completion.checked_at.replace('Z','+00:00');
  const retained={...f.request(pin,'check-retained'),observation:recorded};
  async function check(expected){const before=await inventory(f.temporary),answer=f.call('customer-site-foundation',retained);assert.deepEqual(await inventory(f.temporary),before);assert.equal(server.http.length,httpCount);if(expected){assert.equal(answer.status,0,JSON.stringify(answer.value));assert.equal(answer.value.state,'retained-current');assert.equal(answer.value.observation_sha256,digest(recorded));}else{assert.equal(answer.status,1,JSON.stringify(answer.value));assert.equal(answer.value.code,'foundation_invalid_evidence');}}
  await check(true);
  recorded.synthetic=false;await check(false);recorded.synthetic=true;
  recorded.completion.state='UNVERIFIED';await check(false);recorded.completion.state='LOCAL_DELIVERY_CHECKS_PASS';
  const files=[path.join(dir,evidenceFile),path.join(dir,'PHASE-1-AUDIT.json'),path.join(dir,'review-evidence.json'),path.join(dir,'preview.json'),path.join(dir,'completion-'+recorded.completion.report_sha256+'.json'),path.join(releaseDirectory,'content-package.json'),path.join(releaseDirectory,'release-manifest.json'),path.join(releaseDirectory,'assets',Object.keys(recorded.release.asset_sha256)[0])];
  for(const file of files){const original=await readFile(file);await writeFile(file,Buffer.concat([original,Buffer.from(' changed')]));await check(false);await writeFile(file,original);await unlink(file);await check(false);await writeFile(file,original);}
  await check(true);
  const guide=(await f.site()).pages.find(p=>p.type==='guide'),mediaFile=path.join(f.base.dataDir,'media',f.siteId,path.basename(guide.media[0].src)),image=await readFile(mediaFile);await writeFile(mediaFile,Buffer.from('changed current media'));await check(false);await writeFile(mediaFile,image);
  f.amend(pin.required_page_ids[0],{title:'Naujesnis privatus juodraštis'});await check(false);await f.unchanged();
});
