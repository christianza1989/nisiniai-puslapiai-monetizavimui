// Pure/mocked bridge contract: no renderer, child process, server, SQL or provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {stableV2} from '../src/content-package-v2.mjs';
import {inspectLivePreview,serveLivePreview} from '../scripts/customer-live-preview.mjs';

const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
function fixture(){
  const creation=randomUUID(),scope={...Object.fromEntries(['user_id','organization_id','portfolio_id','session_id','approval_id','approval_session_id','discovery_id','report_id'].map(k=>[k,randomUUID()])),
    creation_id:creation,environment_id:'test-live-preview',approval_fingerprint:'a'.repeat(64),report_revision:1,report_sha256:'b'.repeat(64),
    accepted:{revision_id:randomUUID(),accepted_revision:1,candidate_sha256:'c'.repeat(64),accepted_source_revision:'d'.repeat(40),
      site_id:'creation-'+creation.replaceAll('-',''),canonical_host:'synthetic.example',coordinator_event_id:randomUUID(),
      ...Object.fromEntries(['coordinator_sha256','intake_sha256','intake_request_sha256','intake_importer_sha256','intake_site_file_sha256'].map(k=>[k,'e'.repeat(64)]))},
    sources:{execution_source_revision:'a'.repeat(40),public_source_revision:'b'.repeat(40),bridge_sha256:'c'.repeat(64),verifier_sha256:'d'.repeat(64),parser_sha256:'e'.repeat(64)},
    language_review_mode:'required',site_context_sha256:'f'.repeat(64),page_snapshot_sha256:'a'.repeat(64),required_page_ids:['page-one']};
  const input={action:'inspect',scope,creationId:creation,acceptedRevision:1,sourceHash:scope.accepted.candidate_sha256,
    canonicalHost:scope.accepted.canonical_host,artifactsRoot:'/mock/artifacts',dataDir:'/mock/data',outputDir:'/mock/output'};
  const details=['home','index','author','contact','policy','article'].map(type=>({type,pageId:'page-'+type,revisionHash:'a'.repeat(64),
    reviewCurrent:true,hasApprovedRevision:true,approvedRevisionHash:'a'.repeat(64),mediaFilesPresent:true}));
  const status={workflow:{pages:details.map(p=>({...p,blockers:[]}))}},seen=[];
  const deps={loadContext:async()=>{seen.push('load');return {};},inspectContext:async()=>{seen.push('context');return {status,details};},
    inspectMedia:async()=>{seen.push('media');}};
  return {input,deps,details,status,seen};
}

test('availability is only canonical readonly context/readiness/media; no release or server operation',async()=>{
  const f=fixture();f.deps.withPreview=()=>assert.fail('GET must not call producer');
  const ready=await inspectLivePreview(f.input,f.deps);
  assert.deepEqual(ready,{version:'customer-live-preview-inspection.v1',scope_sha256:digest(f.input.scope),
    site_context_sha256:f.input.scope.site_context_sha256,can_start:true,blocked_reasons:[]});
  assert.deepEqual(f.seen,['load','context','media']);
  f.details[0].reviewCurrent=false;f.seen.length=0;
  const blocked=await inspectLivePreview(f.input,f.deps);
  assert.equal(blocked.can_start,false);assert.deepEqual(blocked.blocked_reasons,['review_missing:page-home']);
  assert.deepEqual(f.seen,['load','context']);assert.equal(Object.hasOwn(blocked,'preview_url'),false);
});

test('missing/corrupt current media cannot yield available state',async()=>{
  for(const code of ['ENOENT','foundation_current_media_invalid']){
    const f=fixture();f.deps.inspectMedia=async()=>{throw Object.assign(Error(code),{code});};
    assert.deepEqual((await inspectLivePreview(f.input,f.deps)).blocked_reasons,['foundation_current_media_invalid']);
  }
});

for(const field of ['origin','preview_url','command','path','token','ttl','prepared'])test('inspect rejects caller '+field,async()=>{
  const f=fixture();await assert.rejects(inspectLivePreview({...f.input,[field]:'forged'},f.deps),{code:'live_preview_input_invalid'});
  assert.deepEqual(f.seen,[]);
});

async function serving(t){
  const f=fixture(),root=await mkdtemp(path.join(os.tmpdir(),'pinet-live-preview-mock-'));
  t.after(async()=>{assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith('pinet-live-preview-mock-'));await rm(root,{recursive:true});});
  const directory=path.join(root,'customer-live-previews');await mkdir(directory);
  const release={release_id:randomUUID(),package_sha256:'1'.repeat(64)};
  const input={...f.input,action:'serve',artifactsRoot:root,prepared:{release,artifact_sha256:'2'.repeat(64)},
    lease_id:randomUUID(),instance_id:randomUUID(),nonce:'3'.repeat(64),request_sha256:'4'.repeat(64)};
  const claim={lease_id:input.lease_id,instance_id:input.instance_id,nonce:input.nonce,request_sha256:input.request_sha256};
  const pulse={version:'customer-live-preview-heartbeat.v1',lease_id:input.lease_id,nonce:input.nonce,scope_sha256:digest(input.scope),expires_ms:Date.now()+3000};
  const preview={version:3,scopeSha256:digest(input.scope),packageSha256:release.package_sha256,releaseId:release.release_id,
    publicSourceRevision:input.scope.sources.public_source_revision,origin:'http://127.0.0.1:12345',transportHost:'origin',producerSha256:'5'.repeat(64)};
  let joined=0;
  const deps={...f.deps,assertDirectories:async(base,folder)=>{assert.equal(base,root);assert.equal(folder,directory);},
    readBytes:async file=>Buffer.from(stableV2(path.basename(file)==='active.json'?claim:pulse)),
    withPreview:async(body,proof,operation,authorized)=>{assert.equal(body.command,'prepare-preview');assert.equal(proof,input.prepared);assert.equal(body.scope,input.scope);
      try{assert.equal(await authorized(),true);return await operation(preview);}finally{joined++;}},wait:async ms=>{assert.ok(ms>0&&ms<=89000);}};
  return {...f,input,deps,claim,pulse,preview,directory,joined:()=>joined};
}

test('ready receipt is nonce/proof bound, exclusively published and <=89 seconds; callback remains owned until wait completes',async t=>{
  const f=await serving(t);let released;
  const hold=new Promise(resolve=>{released=resolve;});let observed;
  f.deps.wait=async ms=>{assert.ok(ms>0&&ms<=89000);observed=JSON.parse(await readFile(path.join(f.directory,f.input.lease_id+'.ready.json')));await hold;};
  const started=Date.now(),task=serveLivePreview(f.input,f.deps);
  while(!observed)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.joined(),0);assert.equal(observed.preview_url,f.preview.origin+'/');
  assert.equal(observed.nonce,f.input.nonce);assert.equal(observed.prepared_sha256,f.input.prepared.artifact_sha256);
  assert.ok(Date.parse(observed.expires_at)>started&&Date.parse(observed.expires_at)<=Date.now()+89000);
  assert.equal(JSON.stringify(observed).includes('session_id'),false);
  const original=await readFile(path.join(f.directory,f.input.lease_id+'.ready.json'));
  released();assert.equal((await task).state,'expired');assert.equal(f.joined(),1);
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:'EEXIST'});
  assert.deepEqual(await readFile(path.join(f.directory,f.input.lease_id+'.ready.json')),original);
  assert.deepEqual(await readdir(f.directory),[f.input.lease_id+'.ready.json']);assert.equal(f.joined(),2);
});

for(const change of ['nonce','claim','expiry','unbounded-heartbeat','scope','readiness','media','origin'])test('serve refuses '+change+' before exposing ready origin',async t=>{
  const f=await serving(t);
  if(change==='nonce')f.pulse.nonce='0'.repeat(64);
  if(change==='claim')f.claim.instance_id=randomUUID();
  if(change==='expiry')f.pulse.expires_ms=Date.now()-1;
  if(change==='unbounded-heartbeat')f.pulse.expires_ms=Date.now()+10000;
  if(change==='scope')f.pulse.scope_sha256='0'.repeat(64);
  if(change==='readiness')f.details[0].reviewCurrent=false;
  if(change==='media')f.deps.inspectMedia=async()=>{throw Error('changed');};
  if(change==='origin')f.preview.origin='http://localhost:12345';
  // The mock callback verifies the same boolean that canonical producer enforces.
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    if(!await authorized())throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
    return operation(f.preview);
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:change==='origin'?'live_preview_origin_invalid':'authorization_revoked'});
  assert.deepEqual(await readdir(f.directory),change==='origin'?[]:[f.input.lease_id+'.guard-failure.json']);
});

test('producer revocation clears the callback wait timer so it cannot retain the bridge after child cleanup',async t=>{
  const f=await serving(t),originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  const handle={synthetic:true};let scheduled=false,cleared=false;
  globalThis.setTimeout=(callback,ms,...args)=>{
    if(ms>80000&&ms<=89000){scheduled=true;return handle;}
    return originalSet(callback,ms,...args);
  };
  globalThis.clearTimeout=timer=>{if(timer===handle)cleared=true;else originalClear(timer);};
  delete f.deps.wait;
  f.deps.withPreview=async(body,proof,operation)=>{
    operation(f.preview).catch(()=>{});
    while(!scheduled)await new Promise(resolve=>setImmediate(resolve));
    throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
  };
  try{
    await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});
    assert.equal(cleared,true);
  }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

async function refuse(f){
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.equal(await authorized(),false);
    throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});
}
const diagnosticFile=f=>path.join(f.directory,f.input.lease_id+'.guard-failure.json');

for(const [change,stage,code] of [
  ['claim','claim','claim_binding_mismatch'],
  ['expired','heartbeat','heartbeat_expired'],
  ['pulse-binding','heartbeat','heartbeat_binding_mismatch'],
  ['context','context','foundation_context_stale'],
  ['readiness','context','foundation_preview_content_blocked'],
  ['media','media','media_unavailable'],
  ['unsafe-error','context','context_check_failed'],
])test('first-refusal receipt identifies '+change+' without exposing authority or customer fields',async t=>{
  const f=await serving(t);
  if(change==='claim')f.claim.nonce='0'.repeat(64);
  if(change==='expired')f.pulse.expires_ms=Date.now()-50;
  if(change==='pulse-binding')f.pulse.nonce='0'.repeat(64);
  if(change==='context')f.deps.inspectContext=async()=>{throw Object.assign(Error('/private/customer-data TOKEN'),{code:'foundation_context_stale'});};
  if(change==='readiness')f.details[0].reviewCurrent=false;
  if(change==='media')f.deps.inspectMedia=async()=>{throw Object.assign(Error('/private/customer-media TOKEN'),{code:'ENOENT'});};
  if(change==='unsafe-error')f.deps.loadContext=async()=>{throw Object.assign(Error('/private/customer-data TOKEN'),{code:'private_customer_name'});};
  await refuse(f);
  const receipt=JSON.parse(await readFile(diagnosticFile(f)));
  assert.deepEqual(Object.keys(receipt).sort(),['version','lease_id','scope_sha256','stage','code','observed_at','elapsed_ms','pulse_margin_ms','checkpoint'].sort());
  assert.equal(receipt.version,'customer-live-preview-guard-failure.v1');
  assert.equal(receipt.lease_id,f.input.lease_id);assert.equal(receipt.scope_sha256,digest(f.input.scope));
  assert.equal(receipt.stage,stage);assert.equal(receipt.code,code);assert.equal(receipt.checkpoint,'before_context');
  assert.ok(Number.isFinite(Date.parse(receipt.observed_at)));assert.ok(receipt.elapsed_ms>=0&&receipt.elapsed_ms<=150000);
  if(change==='expired')assert.ok(receipt.pulse_margin_ms<0);
  if(['claim','pulse-binding'].includes(change))assert.equal(receipt.pulse_margin_ms,null);
  const bytes=await readFile(diagnosticFile(f),'utf8');assert.ok(Buffer.byteLength(bytes)<1024);
  for(const secret of [f.input.nonce,f.input.prepared.artifact_sha256,'customer-data','customer-media','private_customer_name','TOKEN',f.input.artifactsRoot])assert.equal(bytes.includes(secret),false);
  assert.deepEqual(await readdir(f.directory),[path.basename(diagnosticFile(f))]);
});

test('first refusal is retained even after pulse refresh and a different later refusal',async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-50;let original;
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.equal(await authorized(),false);original=await readFile(diagnosticFile(f));
    f.pulse.expires_ms=Date.now()+3000;f.claim.nonce='0'.repeat(64);
    assert.equal(await authorized(),false);
    assert.deepEqual(await readFile(diagnosticFile(f)),original);
    throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});
  assert.equal(JSON.parse(original).code,'heartbeat_expired');
});

test('diagnostic write failure never permits or overrides the original refusal',async t=>{
  const f=await serving(t);f.claim.nonce='0'.repeat(64);let writes=0;
  f.deps.publish=async()=>{writes++;throw Error('/private/path TOKEN');};
  await refuse(f);
  assert.equal(writes,1);assert.deepEqual(await readdir(f.directory),[]);
});

test('successful guard writes no diagnostic or other ledger file',async t=>{
  const f=await serving(t);
  f.deps.withPreview=async(body,proof,operation,authorized)=>{assert.equal(await authorized(),true);return {guard:'accepted'};};
  assert.deepEqual(await serveLivePreview(f.input,f.deps),{guard:'accepted'});
  assert.deepEqual(await readdir(f.directory),[]);
});

test('an existing first receipt survives a later serve invocation for the same lease',async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-50;
  await refuse(f);const original=await readFile(diagnosticFile(f));
  f.pulse.expires_ms=Date.now()+3000;f.claim.nonce='0'.repeat(64);
  await refuse(f);assert.deepEqual(await readFile(diagnosticFile(f)),original);
});

test('expired pulse margin is captured before a newer pulse overwrites its private source',async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-50;let captured;
  f.deps.publish=async(file,receipt)=>{captured=structuredClone(receipt);f.pulse.expires_ms=Date.now()+3000;};
  await refuse(f);
  assert.equal(captured.code,'heartbeat_expired');assert.ok(captured.pulse_margin_ms<0);
  assert.ok(f.pulse.expires_ms>Date.now());
});

for(const kind of ['after_media','deadline'])test('receipt distinguishes '+kind+' from the initial heartbeat check',async t=>{
  const f=await serving(t),originalNow=Date.now;let clock=originalNow();Date.now=()=>clock;
  if(kind==='after_media')f.deps.inspectMedia=async()=>{clock+=3001;};
  else f.deps.assertDirectories=async()=>{clock+=139001;f.pulse.expires_ms=clock+3000;};
  try{
    await refuse(f);
    const receipt=JSON.parse(await readFile(diagnosticFile(f)));
    assert.equal(receipt.stage,kind==='deadline'?'deadline':'heartbeat');
    assert.equal(receipt.code,kind==='deadline'?'preview_deadline_elapsed':'heartbeat_expired');
    assert.equal(receipt.checkpoint,kind==='deadline'?'before_context':'after_media');
  }finally{Date.now=originalNow;}
});

test('concurrent refusals publish once and retain only the first observed code',async t=>{
  const f=await serving(t);f.claim.nonce='0'.repeat(64);let writes=0;
  f.deps.publish=async()=>{writes++;};
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.deepEqual(await Promise.all([authorized(),authorized(),authorized()]),[false,false,false]);
    throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});assert.equal(writes,1);
});

test('a stalled diagnostic publication cannot stall or change guard refusal',async t=>{
  const f=await serving(t),originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  const handle={synthetic:true};let budget;
  globalThis.setTimeout=(callback,ms,...args)=>{if(ms===100){budget=ms;queueMicrotask(callback);return handle;}return originalSet(callback,ms,...args);};
  globalThis.clearTimeout=timer=>{if(timer!==handle)originalClear(timer);};
  f.claim.nonce='0'.repeat(64);f.deps.publish=async()=>new Promise(()=>{});
  try{await refuse(f);assert.equal(budget,100);}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

for(const [kind,stage,code] of [
  ['claim-read','claim','claim_read_failed'],['claim-shape','claim','claim_shape_invalid'],
  ['pulse-read','heartbeat','heartbeat_read_failed'],['pulse-shape','heartbeat','heartbeat_shape_invalid'],
  ['pulse-range','heartbeat','heartbeat_expiry_unbounded'],['pulse-type','heartbeat','heartbeat_expiry_invalid'],
  ['code-getter','context','context_check_failed'],
])test('receipt uses a fixed safe reason for '+kind,async t=>{
  const f=await serving(t),read=f.deps.readBytes;
  if(kind==='claim-read')f.deps.readBytes=async file=>{if(path.basename(file)==='active.json')throw Error('PRIVATE/path TOKEN');return read(file);};
  if(kind==='claim-shape')f.claim.extra='PRIVATE/token';
  if(kind==='pulse-read')f.deps.readBytes=async file=>{if(path.basename(file)!=='active.json')throw Error('PRIVATE/path TOKEN');return read(file);};
  if(kind==='pulse-shape')f.pulse.extra='PRIVATE/token';
  if(kind==='pulse-range')f.pulse.expires_ms=Date.now()+10000;
  if(kind==='pulse-type')f.pulse.expires_ms='PRIVATE/customer';
  if(kind==='code-getter')f.deps.loadContext=async()=>{throw Object.defineProperty(Error('PRIVATE/customer'),'code',{get(){throw Error('TOKEN');}});};
  await refuse(f);const raw=await readFile(diagnosticFile(f),'utf8'),receipt=JSON.parse(raw);
  assert.equal(receipt.stage,stage);assert.equal(receipt.code,code);assert.equal(raw.includes('PRIVATE'),false);assert.equal(raw.includes('TOKEN'),false);
});
