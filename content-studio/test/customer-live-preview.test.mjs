// Pure/mocked bridge contract: no renderer, child process, server, SQL or provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
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
    lease_id:randomUUID(),instance_id:randomUUID(),nonce:'3'.repeat(64),request_sha256:'4'.repeat(64),
    hard_end_ms:Date.now()+120000,attempt_index:0};
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
  if(change!=='origin')await settledDiagnostic(f);
  assert.deepEqual((await readdir(f.directory)).sort(),change==='origin'?[]:[f.input.lease_id+'.guard-failure.json',
    ...(change==='expiry'?[f.input.lease_id+'.startup-closed.json']:[])].sort());
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
async function settledDiagnostic(f){
  // Refusal is bounded at 100ms even if best-effort disk publication is slow.
  // Observe its eventual file separately; this is not a production grace period.
  const end=performance.now()+2000;
  while(performance.now()<end){
    const files=await readdir(f.directory);
    if(files.includes(path.basename(diagnosticFile(f)))&&!files.some(name=>name.endsWith('.tmp')))return;
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.fail('Best-effort diagnostic publication did not settle in the test observation window');
}
async function readDiagnostic(f,encoding){await settledDiagnostic(f);return readFile(diagnosticFile(f),encoding);}

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
  const receipt=JSON.parse(await readDiagnostic(f));
  assert.deepEqual(Object.keys(receipt).sort(),['version','lease_id','scope_sha256','stage','code','observed_at','elapsed_ms','pulse_margin_ms','checkpoint'].sort());
  assert.equal(receipt.version,'customer-live-preview-guard-failure.v1');
  assert.equal(receipt.lease_id,f.input.lease_id);assert.equal(receipt.scope_sha256,digest(f.input.scope));
  assert.equal(receipt.stage,stage);assert.equal(receipt.code,code);assert.equal(receipt.checkpoint,'before_context');
  assert.ok(Number.isFinite(Date.parse(receipt.observed_at)));assert.ok(receipt.elapsed_ms>=0&&receipt.elapsed_ms<=150000);
  if(change==='expired')assert.ok(receipt.pulse_margin_ms<0);
  if(['claim','pulse-binding'].includes(change))assert.equal(receipt.pulse_margin_ms,null);
  const bytes=await readDiagnostic(f,'utf8');assert.ok(Buffer.byteLength(bytes)<1024);
  for(const secret of [f.input.nonce,f.input.prepared.artifact_sha256,'customer-data','customer-media','private_customer_name','TOKEN',f.input.artifactsRoot])assert.equal(bytes.includes(secret),false);
  assert.deepEqual((await readdir(f.directory)).sort(),[path.basename(diagnosticFile(f)),
    ...(change==='expired'?[f.input.lease_id+'.startup-closed.json']:[])].sort());
});

test('first refusal is retained even after pulse refresh and a different later refusal',async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-50;let original;
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.equal(await authorized(),false);original=await readDiagnostic(f);
    f.pulse.expires_ms=Date.now()+3000;f.claim.nonce='0'.repeat(64);
    assert.equal(await authorized(),false);
    assert.deepEqual(await readDiagnostic(f),original);
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
  await refuse(f);const original=await readDiagnostic(f);
  f.pulse.expires_ms=Date.now()+3000;f.claim.nonce='0'.repeat(64);
  await refuse(f);assert.deepEqual(await readDiagnostic(f),original);
});

test('expired pulse margin is captured before a newer pulse overwrites its private source',async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-50;let captured;
  f.deps.publish=async(file,receipt)=>{if(file.endsWith('.guard-failure.json'))captured=structuredClone(receipt);f.pulse.expires_ms=Date.now()+3000;};
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
    const receipt=JSON.parse(await readDiagnostic(f));
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
  await refuse(f);const raw=await readDiagnostic(f,'utf8'),receipt=JSON.parse(raw);
  assert.equal(receipt.stage,stage);assert.equal(receipt.code,code);assert.equal(raw.includes('PRIVATE'),false);assert.equal(raw.includes('TOKEN'),false);
});

test('startup witness follows settled producer cleanup and binds the exact first refusal and fixed deadline',async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-1;let cleaned=false;
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    try{assert.equal(await authorized(),false);throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});}
    finally{cleaned=true;}
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});
  const file=path.join(f.directory,f.input.lease_id+'.startup-closed.json'),raw=await readFile(file);
  const closed=JSON.parse(raw),guard=JSON.parse(await readDiagnostic(f));
  assert.ok(cleaned);assert.deepEqual(closed,{
    version:'customer-live-preview-startup-closed.v1',lease_id:f.input.lease_id,instance_id:f.input.instance_id,
    nonce:f.input.nonce,request_sha256:f.input.request_sha256,scope_sha256:digest(f.input.scope),
    prepared_sha256:f.input.prepared.artifact_sha256,hard_end_ms:f.input.hard_end_ms,attempt_index:0,
    guard_sha256:digest(guard),cause:'heartbeat_expired',closed_at:closed.closed_at});
  assert.ok(Date.parse(closed.closed_at)>=Date.parse(guard.observed_at));
  await assert.rejects(serveLivePreview({...f.input,attempt_index:1},f.deps),{code:'authorization_revoked'});
  assert.deepEqual(await readFile(file),raw);
});

for(const change of ['cleanup-error','ready','invalid-ready','second-attempt'])test('startup witness is absent after '+change,async t=>{
  const f=await serving(t);f.pulse.expires_ms=Date.now()-1;
  if(change==='second-attempt')f.input.attempt_index=1;
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.equal(await authorized(),false);
    if(change==='ready'||change==='invalid-ready')await writeFile(path.join(f.directory,f.input.lease_id+'.ready.json'),change==='ready'?'{}':'invalid');
    throw Object.assign(Error(change==='cleanup-error'?'cleanup_failed':'authorization_revoked'),{code:change==='cleanup-error'?'cleanup_failed':'authorization_revoked'});
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:change==='cleanup-error'?'cleanup_failed':'authorization_revoked'});
  await assert.rejects(readFile(path.join(f.directory,f.input.lease_id+'.startup-closed.json')),{code:'ENOENT'});
});

for(const [field,value] of [['hard_end_ms',true],['hard_end_ms',Date.now()+200000],['attempt_index',false],['attempt_index',2]])
test('trusted startup protocol rejects invalid '+field+' '+value,async t=>{
  const f=await serving(t);await assert.rejects(serveLivePreview({...f.input,[field]:value},f.deps),{code:'live_preview_input_invalid'});
  assert.deepEqual(await readdir(f.directory),[]);
});

test('the shared original deadline also caps the ready expiry',async t=>{
  const f=await serving(t);f.input.hard_end_ms=Date.now()+5000;
  await serveLivePreview(f.input,f.deps);
  const ready=JSON.parse(await readFile(path.join(f.directory,f.input.lease_id+'.ready.json')));
  assert.equal(Date.parse(ready.expires_at),f.input.hard_end_ms);
});

test('two overlapping canonical monitors share only the ongoing native check, never a finished permission',async t=>{
  const f=await serving(t);let release,entered,loads=0,media=0;
  const blocked=new Promise(resolve=>{release=resolve;}),loading=new Promise(resolve=>{entered=resolve;});
  f.deps.loadContext=async()=>{loads++;entered();await blocked;return {};};
  f.deps.inspectMedia=async()=>{media++;};
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    const producerMonitor=authorized();await loading;
    const inspectionMonitor=authorized();await new Promise(resolve=>setImmediate(resolve));
    release();assert.deepEqual(await Promise.all([producerMonitor,inspectionMonitor]),[true,true]);
    assert.equal(loads,1);assert.equal(media,1);
    assert.equal(await authorized(),true);assert.equal(loads,2);assert.equal(media,2);
    f.details[0].reviewCurrent=false;
    assert.equal(await authorized(),false);assert.equal(loads,3);assert.equal(media,2);
    return {guard:'fresh-again'};
  };
  assert.deepEqual(await serveLivePreview(f.input,f.deps),{guard:'fresh-again'});
});

for(const change of ['claim','pulse'])test('shared monitor check denies all waiters after mid-flight '+change+' loss',async t=>{
  const f=await serving(t);let release,entered,loads=0;
  const blocked=new Promise(resolve=>{release=resolve;}),loading=new Promise(resolve=>{entered=resolve;});
  f.deps.loadContext=async()=>{loads++;entered();await blocked;return {};};
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    const one=authorized();await loading;const two=authorized();await new Promise(resolve=>setImmediate(resolve));
    if(change==='claim')f.claim.nonce='0'.repeat(64);else f.pulse.expires_ms=Date.now()-1;
    release();assert.deepEqual(await Promise.all([one,two]),[false,false]);assert.equal(loads,1);
    throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
  };
  await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});
  assert.equal(JSON.parse(await readDiagnostic(f)).code,change==='claim'?'claim_binding_mismatch':'heartbeat_expired');
  await assert.rejects(readFile(path.join(f.directory,f.input.lease_id+'.ready.json')),{code:'ENOENT'});
});

for(const change of ['claim','pulse','deadline'])test('each joined waiter checks current '+change+' after the shared read',async t=>{
  const f=await serving(t),read=f.deps.readBytes,originalNow=Date.now;let claims=0,clock=originalNow();
  Date.now=()=>clock;
  f.deps.readBytes=async file=>{
    if(path.basename(file)==='active.json'&&++claims===3){
      if(change==='claim')f.claim.nonce='0'.repeat(64);
      if(change==='pulse')f.pulse.expires_ms=clock-1;
      if(change==='deadline'){clock=f.input.hard_end_ms;f.pulse.expires_ms=clock+3000;}
    }
    return read(file);
  };
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.deepEqual(await Promise.all([authorized(),authorized()]),[false,false]);
    throw Object.assign(Error('authorization_revoked'),{code:'authorization_revoked'});
  };
  try{
    await assert.rejects(serveLivePreview(f.input,f.deps),{code:'authorization_revoked'});
    assert.ok(claims>=4);
    const receipt=JSON.parse(await readDiagnostic(f));
    assert.equal(receipt.checkpoint,'after_media');
    assert.equal(receipt.code,{claim:'claim_binding_mismatch',pulse:'heartbeat_expired',deadline:'preview_deadline_elapsed'}[change]);
  }finally{Date.now=originalNow;}
});

test('simultaneous serve scopes never share their native check',async t=>{
  const a=await serving(t),b=await serving(t);let readsA=0,readsB=0;
  a.deps.loadContext=async()=>{readsA++;return {};};b.deps.loadContext=async()=>{readsB++;return {};};
  for(const f of [a,b])f.deps.withPreview=async(body,proof,operation,authorized)=>{
    assert.deepEqual(await Promise.all([authorized(),authorized()]),[true,true]);return {guard:'owned'};
  };
  await Promise.all([serveLivePreview(a.input,a.deps),serveLivePreview(b.input,b.deps)]);
  assert.equal(readsA,1);assert.equal(readsB,1);assert.notEqual(a.input.lease_id,b.input.lease_id);
});

test('an old waiter finishing its own signal cannot erase a newer pending native check',async t=>{
  const f=await serving(t),read=f.deps.readBytes;let claims=0,loads=0,releaseOld,blockedOld,releaseNew,blockedNew;
  const oldGate=new Promise(resolve=>{releaseOld=resolve;}),oldStarted=new Promise(resolve=>{blockedOld=resolve;});
  const newGate=new Promise(resolve=>{releaseNew=resolve;}),newStarted=new Promise(resolve=>{blockedNew=resolve;});
  f.deps.readBytes=async file=>{if(path.basename(file)==='active.json'&&++claims===3){blockedOld();await oldGate;}return read(file);};
  f.deps.loadContext=async()=>{if(++loads===2){blockedNew();await newGate;}return {};};
  f.deps.withPreview=async(body,proof,operation,authorized)=>{
    const old=authorized(),other=authorized();await oldStarted;assert.equal(await other,true);
    const newer=authorized();await newStarted;
    releaseOld();assert.equal(await old,true);
    const joiner=authorized();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(loads,2);releaseNew();assert.deepEqual(await Promise.all([newer,joiner]),[true,true]);
    return {guard:'newer-owned'};
  };
  assert.deepEqual(await serveLivePreview(f.input,f.deps),{guard:'newer-owned'});
});
