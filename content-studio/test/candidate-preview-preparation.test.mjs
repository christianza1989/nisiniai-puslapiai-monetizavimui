// Real synthetic intake/review/release protocol; build and serving transports are inert mocks.
import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,readdir,lstat,rm} from 'node:fs/promises';
import {spawnSync,execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {stableV2} from '../src/content-package-v2.mjs';

const root=path.resolve(import.meta.dirname,'../..'),publicCore=process.env.PINET_PUBLIC_CORE_PATH;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),digest=value=>sha(stableV2(value));
const calls={build:0,start:0,close:0,checks:0,badBuild:false};
function prepared(context,scope,release){return {checkout:'inert',parent:'inert',scopeSha256:digest(scope),
  packageSha256:release.evidence.package_sha256,publicSourceRevision:scope.sources.public_source_revision,
  siteId:context.siteId,releaseId:release.evidence.release_id,buildSha256:'1'.repeat(64)};}
function check(context,scope,release,hash){calls.checks++;assert.equal(hash,'1'.repeat(64));if(calls.badBuild)throw Object.assign(Error('changed'),{code:'foundation_preview_build_changed'});}
mock.module('../scripts/customer-site-preview.mjs',{exports:{
  prepareCustomerSitePreview:async(...args)=>{calls.build++;return prepared(...args);},
  checkCustomerSitePreview:async(...args)=>check(...args),
  retainedCustomerSitePreview:async(context,scope,release,hash)=>{check(context,scope,release,hash);return prepared(context,scope,release);},
  withCustomerSitePreview:async(value,operation)=>{calls.start++;try{return await operation({version:2,origin:'http://127.0.0.1:12345',
    transportHost:'origin',scopeSha256:value.scopeSha256,packageSha256:value.packageSha256,publicSourceRevision:value.publicSourceRevision,releaseId:value.releaseId});}finally{calls.close++;}}
}});
const {customerSiteFoundation,withPreparedCandidatePreview}=await import('../scripts/customer-site-foundation.mjs');

async function fixture(t){
  assert.ok(path.isAbsolute(publicCore),'PINET_PUBLIC_CORE_PATH must name the read-only exact companion');
  const temp=await mkdtemp(path.join(os.tmpdir(),'pinet-candidate-preview-'));
  t.after(async()=>{assert.equal(path.dirname(temp),os.tmpdir());assert.ok(path.basename(temp).startsWith('pinet-candidate-preview-'));
    assert.equal((await lstat(temp)).isSymbolicLink(),false);await rm(temp,{recursive:true,force:true});});
  const artifactsRoot=path.join(temp,'runtime/artifacts');await mkdir(artifactsRoot,{recursive:true});
  const creationId=randomUUID(),directory=path.join(artifactsRoot,'customer-content',creationId,'revision-1');
  const section={heading:'Synthetic fixture',body:'This isolated protocol fixture verifies revision-bound preview preparation, not real commercial facts or final visual quality.',items:[]};
  const draft={business_name:'Synthetic preview fixture',tagline:'Inert source test',business:{customer:'Synthetic fixture'},brand:{accent:'indigo'},
    pages:[['/','home'],['/guides/','index'],['/guides/sample/','guide'],['/author/','author'],['/contact/','contact'],['/privacy/','policy']]
      .map(([p,type])=>({path:p,type,title:'Synthetic '+type, navigation_label:type,meta_description:'Isolated source protocol fixture.',intent:'Verify a single protocol boundary.',sections:[section,section]})),content_plan:[]};
  const base={creationId,acceptedRevision:1,sourceHash:digest(draft),canonicalHost:'preview.example',artifactsRoot,dataDir:path.join(directory,'data'),outputDir:path.join(directory,'output')};
  process.env.STUDIO_PUBLIC_CORE_DIR=publicCore;
  process.env.STUDIO_NETWORK_SETTINGS=path.join(publicCore,'config/niche-network.json');
  function call(script,input){const result=spawnSync(process.execPath,[path.join(root,'content-studio/scripts',script+'.mjs')],
    {input:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:20000,env:process.env});
    assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}
  const intake=call('customer-creation-intake',{...base,draft,knownContact:{email:'qa@preview.example',phone:''},verifiedFacts:['Synthetic test fixture only.'],operatorName:'Synthetic fixture'});
  const workflow=extra=>call('customer-content-workflow',{...base,...extra}),status=()=>workflow({command:'status'});
  const file=path.join(base.dataDir,'sites',intake.siteId+'.json');
  const execution=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const sources={execution_source_revision:execution,public_source_revision:execFileSync('git',['rev-parse','HEAD'],{cwd:publicCore,encoding:'utf8'}).trim(),
    bridge_sha256:sha(await readFile(path.join(root,'content-studio/scripts/customer-site-foundation.mjs'))),
    verifier_sha256:sha(await readFile(path.join(root,'SKILLS/niche-site-audit/scripts/verify-site-completion.mjs'))),
    parser_sha256:sha(await readFile(path.join(root,'SKILLS/niche-site-audit/scripts/rendered_site.py')))};
  function pin(){const s=status();return {...Object.fromEntries(['user_id','organization_id','portfolio_id','session_id','approval_id','approval_session_id','discovery_id','report_id'].map(k=>[k,randomUUID()])),
    environment_id:'test-preview-preparation',creation_id:creationId,approval_fingerprint:'a'.repeat(64),report_revision:1,report_sha256:'b'.repeat(64),
    accepted:{revision_id:randomUUID(),accepted_revision:1,candidate_sha256:base.sourceHash,accepted_source_revision:execution,site_id:intake.siteId,canonical_host:base.canonicalHost,
      coordinator_event_id:randomUUID(),coordinator_sha256:'c'.repeat(64),intake_sha256:digest(intake),intake_request_sha256:intake.requestHash,intake_importer_sha256:intake.importerHash,intake_site_file_sha256:intake.siteFileHash},
    sources,language_review_mode:'required',site_context_sha256:s.expectedSiteHash,page_snapshot_sha256:digest([...s.pages].sort((a,b)=>a.pageId<b.pageId?-1:1)),required_page_ids:s.pages.map(p=>p.pageId).sort()};}
  async function approve(){
    const sharp=(await import('sharp')).default,inputs=path.join(directory,'media-inputs');await mkdir(inputs);
    const sourcePath=path.join(inputs,'synthetic.png');await writeFile(sourcePath,await sharp({create:{width:360,height:240,channels:3,background:'#456789'}}).png().toBuffer());
    const imported=workflow({command:'import-media',expectedSiteHash:status().expectedSiteHash,sourcePath,metadata:{mime:'image/png',alt:'Synthetic protocol colors',rights:'Generated for this isolated test only'}}).operation.result;
    for(const row of status().pages){const page=JSON.parse(await readFile(file)).pages.find(p=>p.id===row.pageId),article=page.type==='guide';
      const editorial={...page.editorial,authors:article||page.type==='author'?[{id:'synthetic-author',siteId:intake.siteId,locale:'lt-LT',slug:'author',name:'Synthetic fixture',role:'Test fixture',bio:'Synthetic protocol only.',kind:'organization',sameAs:[]}]:[],
        datePublished:article?new Date(Date.now()-60000).toISOString():null,dateModified:null,featuredImageId:article?imported.assetId:null};
      workflow({command:'amend-page',pageId:page.id,expectedSiteHash:status().expectedSiteHash,expectedRevisionHash:row.revisionHash,expectedPlanningHash:row.planningHash,
        patch:{factChecks:[],externalLinks:[],editorial,publishAt:new Date(Date.now()-60000).toISOString(),...(article?{media:[{id:imported.assetId}]}:{})}});}
    const ids=status().pages.map(p=>p.pageId);workflow({command:'finalize-links',pageIds:ids,expectedSiteHash:status().expectedSiteHash});
    for(const row of status().pages)workflow({command:'record-review',pageId:row.pageId,expectedSiteHash:status().expectedSiteHash,review:{reviewer:'Synthetic fixture only',revisionHash:row.revisionHash,
      evidence:Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(k=>[k,'Synthetic protocol evidence only; no actual customer or final presentation acceptance.']))}});
    workflow({command:'approve-batch',pageIds:ids,actorId:'synthetic-source-fixture',expectedSiteHash:status().expectedSiteHash});
  }
  return {base,directory,file,pin,approve};
}

test('preparation uses an approved release without final audit, then reopens only its exact owned build',async t=>{
  const f=await fixture(t),request=scope=>({...f.base,scope,command:'prepare-preview'});
  await assert.rejects(customerSiteFoundation(request(f.pin())),{code:'foundation_preview_content_blocked'});
  assert.equal(calls.build,0);await f.approve();
  const pin=f.pin(),input=request(pin),before=await readFile(f.file),proof=await customerSiteFoundation(input);
  const folder=path.join(f.directory,'foundation',digest(pin)),artifact=path.join(folder,'candidate-preview.json');
  assert.equal(proof.state,'prepared');assert.equal(proof.server,'not_started');assert.equal(proof.full_site_status,'UNVERIFIED');
  assert.equal(proof.launch_status,'UNVERIFIED');assert.equal(proof.artifact_sha256,digest(JSON.parse(await readFile(artifact))));
  assert.equal(calls.build,1);assert.equal(calls.start,0);assert.deepEqual(await readFile(f.file),before);
  assert.deepEqual((await readdir(folder)).sort(),['candidate-preview.json','candidate.json']);
  assert.deepEqual(await customerSiteFoundation(input),proof);assert.equal(calls.build,1);
  assert.equal((await readdir(path.join(f.base.outputDir,'releases',pin.accepted.site_id))).length,1);
  const final=await customerSiteFoundation({...input,command:'verify-local'});
  assert.equal(final.state,'candidate');assert.deepEqual(final.blockers,['local_evidence_missing']);assert.equal(calls.start,0);
  const yes=async()=>true;
  await t.test('explicit owned inspection returns no certification and closes its own callback',async()=>{
    assert.equal(await withPreparedCandidatePreview(input,proof,async ready=>{assert.equal(ready.origin,'http://127.0.0.1:12345');return 'observed only';},yes),'observed only');
    assert.equal(calls.start,1);assert.equal(calls.close,1);
  });
  await t.test('unknown fields, forged scope or altered retained bytes never start a server',async()=>{
    const count=calls.start,raw=await readFile(artifact);
    for(const patch of [{origin:'http://evil.example'},{artifact_sha256:'0'.repeat(64)},{scope_sha256:'0'.repeat(64)},{full_site_status:'PASS'}])
      await assert.rejects(withPreparedCandidatePreview(input,{...proof,...patch},()=>assert.fail(),yes),{code:'foundation_preview_preparation_stale'});
    await writeFile(artifact,Buffer.concat([raw,Buffer.from(' ')]));
    await assert.rejects(customerSiteFoundation(input),{code:'foundation_preview_preparation_stale'});await writeFile(artifact,raw);
    await assert.rejects(withPreparedCandidatePreview({...input,scope:{...pin,session_id:randomUUID()}},proof,()=>assert.fail(),yes));
    assert.equal(calls.start,count);assert.equal(calls.build,1);
  });
  await t.test('lost retained build fails closed without rebuilding or changing the proof',async()=>{
    calls.badBuild=true;try{await assert.rejects(customerSiteFoundation(input),{code:'foundation_preview_build_changed'});}
    finally{calls.badBuild=false;}assert.equal(calls.build,1);
  });
  await t.test('revocation before and during explicit inspection closes only the owned runtime',async()=>{
    const count=calls.start;
    await assert.rejects(withPreparedCandidatePreview(input,proof,()=>assert.fail(),async()=>false),{code:'authorization_revoked'});
    assert.equal(calls.start,count);
    let permitted=true;
    await assert.rejects(withPreparedCandidatePreview(input,proof,async()=>{permitted=false;return 'not accepted';},async()=>permitted),{code:'authorization_revoked'});
    assert.equal(calls.start,count+1);assert.equal(calls.close,calls.start);
    permitted=true;
    await assert.rejects(withPreparedCandidatePreview(input,proof,async()=>{permitted=false;await new Promise(()=>{});},async()=>permitted),{code:'authorization_revoked'});
    assert.equal(calls.start,count+2);assert.equal(calls.close,calls.start);
  });
  await t.test('inspection expires even if the trusted browser callback never finishes',async sub=>{
    let entered;const ready=new Promise(resolve=>{entered=resolve;});
    sub.mock.timers.enable({apis:['setTimeout']});
    try{
      const run=withPreparedCandidatePreview(input,proof,async()=>{entered();await new Promise(()=>{});},yes);
      const rejected=assert.rejects(run,{code:'foundation_preview_inspection_expired'});
      await ready;sub.mock.timers.tick(120001);await rejected;
    }finally{sub.mock.timers.reset();}
    assert.equal(calls.close,calls.start);
  });
  await t.test('fresh native state and media changes block reopening',async()=>{
    const raw=await readFile(f.file),site=JSON.parse(raw),count=calls.start;
    site.name+=' changed';await writeFile(f.file,JSON.stringify(site));
    await assert.rejects(withPreparedCandidatePreview(input,proof,()=>assert.fail(),yes));await writeFile(f.file,raw);
    const asset=site.assets[0],file=path.join(f.base.dataDir,'media',site.id,path.basename(asset.src)),bytes=await readFile(file);
    await writeFile(file,Buffer.from('tampered'));
    await assert.rejects(withPreparedCandidatePreview(input,proof,()=>assert.fail(),yes),{code:'foundation_current_media_invalid'});await writeFile(file,bytes);
    assert.equal(calls.start,count);assert.deepEqual(await customerSiteFoundation(input),proof);
  });
});
