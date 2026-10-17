// Fixed trusted bridge only. Canonical code owns readiness/renderer/processes.
import {createHash,randomUUID} from 'node:crypto';
import {open,link,unlink,lstat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {stableV2} from '../src/content-package-v2.mjs';
import {loadCustomerContentContext,assertArtifactDirectories,readArtifactBytes} from './customer-content-context.mjs';
import {validateScope,inspectFoundationContext,foundationReadiness,inspectFoundationMedia,withPreparedCandidatePreview,previewBinding} from './customer-site-foundation.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex'),digest=v=>sha(stableV2(v));
const fail=code=>{throw Object.assign(Error(code),{code});};
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const baseKeys=['creationId','acceptedRevision','sourceHash','canonicalHost','artifactsRoot','dataDir','outputDir'];
const contextFailureCodes=new Set(['foundation_native_intake_changed','foundation_context_stale','foundation_page_binding_invalid',
  'writer_unsafe_artifact','writer_path_outside_artifacts','writer_invalid_identity','writer_absolute_paths_required',
  'writer_runtime_artifacts_required','writer_revision_directory_mismatch','writer_artifacts_alias','writer_intake_busy',
  'writer_intake_binding_mismatch','writer_original_hash_mismatch','writer_studio_context_conflict','writer_page_binding_mismatch']);
const diagnosticNumber=value=>Math.max(-150000,Math.min(150000,Math.trunc(value)));
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('live_preview_input_invalid');}
function checked(input){
  const extras=input?.action==='serve'?['prepared','lease_id','instance_id','nonce','request_sha256','hard_end_ms','attempt_index']:[];
  exact(input,['action','scope',...baseKeys,...extras]);
  if(!['inspect','serve'].includes(input.action))fail('live_preview_input_invalid');
  validateScope(input.scope);
  const p=input.scope.accepted;
  if(input.creationId!==input.scope.creation_id||input.acceptedRevision!==p.accepted_revision||input.sourceHash!==p.candidate_sha256||input.canonicalHost!==p.canonical_host)fail('live_preview_input_invalid');
  if(extras.length&&(!uuid(input.lease_id)||!uuid(input.instance_id)||!hex(input.nonce)||!hex(input.request_sha256)
      ||!Number.isSafeInteger(input.hard_end_ms)||input.hard_end_ms<1||input.hard_end_ms>Date.now()+139000
      ||![0,1].includes(input.attempt_index)))fail('live_preview_input_invalid');
  return Object.fromEntries(baseKeys.map(k=>[k,input[k]]));
}

export async function inspectLivePreview(input,deps={}){
  const base=checked(input);
  if(input.action!=='inspect')fail('live_preview_input_invalid');
  const context=await (deps.loadContext||loadCustomerContentContext)(base);
  const {status,details}=await (deps.inspectContext||inspectFoundationContext)(context,base,input.scope);
  const blockers=foundationReadiness(status,details);
  if(!blockers.length)try{await (deps.inspectMedia||inspectFoundationMedia)(context,details);}
  catch(error){if(['foundation_current_media_invalid','ENOENT'].includes(error.code))blockers.push('foundation_current_media_invalid');else throw error;}
  return {version:'customer-live-preview-inspection.v1',scope_sha256:digest(input.scope),
    site_context_sha256:input.scope.site_context_sha256,can_start:blockers.length===0,
    blocked_reasons:[...new Set(blockers)].sort()};
}

async function publish(file,value){
  const temporary=path.join(path.dirname(file),randomUUID()+'.tmp'),raw=Buffer.from(stableV2(value));
  let handle;
  try{
    handle=await open(temporary,'wx',0o600);await handle.writeFile(raw);await handle.sync();await handle.close();handle=null;
    await link(temporary,file); // exclusive atomic publication; never overwrite a previous ready proof
  }finally{if(handle)await handle.close();await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}

export async function serveLivePreview(input,deps={}){
  const base=checked(input);
  if(input.action!=='serve')fail('live_preview_input_invalid');
  const directory=path.join(base.artifactsRoot,'customer-live-previews'),scopeHash=digest(input.scope);
  const hardEnd=Math.min(Date.now()+139000,input.hard_end_ms),started=performance.now();
  await (deps.assertDirectories||assertArtifactDirectories)(base.artifactsRoot,directory);
  const json=async file=>JSON.parse((await (deps.readBytes||readArtifactBytes)(path.join(directory,file),16384)).toString('utf8'));
  let firstRefusal,firstRefusalReceipt;
  const recordRefusal=trace=>{
    if(!firstRefusal)firstRefusal=(async()=>{
      const observed=trace.observed??Date.now();
      const receipt={version:'customer-live-preview-guard-failure.v1',lease_id:input.lease_id,scope_sha256:scopeHash,
        stage:trace.stage,code:trace.code,checkpoint:trace.checkpoint,observed_at:new Date(observed).toISOString(),
        elapsed_ms:diagnosticNumber(performance.now()-started),
        pulse_margin_ms:trace.pulseExpires===null?null:diagnosticNumber(trace.pulseExpires-observed)};
      firstRefusalReceipt=receipt;
      const writing=Promise.resolve().then(()=>(deps.publish||publish)(path.join(directory,input.lease_id+'.guard-failure.json'),receipt)).catch(()=>{});
      let timer;
      try{await Promise.race([writing,new Promise(resolve=>{timer=setTimeout(resolve,100);})]);}
      finally{clearTimeout(timer);}
    })();
    return firstRefusal; // at most one bounded best-effort attempt; never overwrite/retry
  };
  const refuse=(trace,code)=>{trace.code=code;trace.observed=Date.now();fail('authorization_revoked');};
  const signal=async trace=>{
    trace.stage='claim';trace.code='claim_read_failed';trace.pulseExpires=null;
    const claim=await json('active.json');trace.code='claim_shape_invalid';
    exact(claim,['lease_id','instance_id','nonce','request_sha256']);
    if(claim.lease_id!==input.lease_id||claim.instance_id!==input.instance_id||claim.nonce!==input.nonce||claim.request_sha256!==input.request_sha256)refuse(trace,'claim_binding_mismatch');
    trace.stage='heartbeat';trace.code='heartbeat_read_failed';
    const pulse=await json(input.lease_id+'.heartbeat.json');trace.code='heartbeat_shape_invalid';
    exact(pulse,['version','lease_id','nonce','scope_sha256','expires_ms']);
    if(pulse.version!=='customer-live-preview-heartbeat.v1'||pulse.lease_id!==input.lease_id||pulse.nonce!==input.nonce||pulse.scope_sha256!==scopeHash)refuse(trace,'heartbeat_binding_mismatch');
    if(!Number.isSafeInteger(pulse.expires_ms))refuse(trace,'heartbeat_expiry_invalid');
    trace.pulseExpires=pulse.expires_ms;
    if(pulse.expires_ms<=Date.now())refuse(trace,'heartbeat_expired');
    if(pulse.expires_ms>Date.now()+3100)refuse(trace,'heartbeat_expiry_unbounded');
    trace.stage='deadline';
    if(Date.now()>=hardEnd)refuse(trace,'preview_deadline_elapsed');
  };
  const check=async()=>{
    const trace={stage:'claim',code:'claim_read_failed',checkpoint:'before_context',pulseExpires:null};
    try{
      await signal(trace);trace.stage='context';trace.code='context_check_failed';
      const context=await (deps.loadContext||loadCustomerContentContext)(base);
      const {status,details}=await (deps.inspectContext||inspectFoundationContext)(context,base,input.scope);
      if(foundationReadiness(status,details).length)refuse(trace,'foundation_preview_content_blocked');
      trace.stage='media';trace.code='media_check_failed';
      await (deps.inspectMedia||inspectFoundationMedia)(context,details);
      trace.checkpoint='after_media';await signal(trace);return true;
    }catch(error){
      let code;try{code=error?.code;}catch{}
      if(trace.stage==='context'&&contextFailureCodes.has(code))trace.code=code;
      if(trace.stage==='media'&&code==='foundation_current_media_invalid')trace.code=code;
      if(trace.stage==='media'&&code==='ENOENT')trace.code='media_unavailable';
      try{await recordRefusal(trace);}catch{} // diagnostics cannot override the original refusal
      return false;
    }
  };
  // The producer and inspection monitors can overlap. Share only their live
  // fixed-scope read, never a completed permission. Every waiter rechecks the
  // current claim, pulse and deadline after joining the native read.
  let checking;
  const authorized=async()=>{
    checking??=check().finally(()=>{checking=undefined;});
    if(!await checking)return false;
    const trace={stage:'claim',code:'claim_read_failed',checkpoint:'after_media',pulseExpires:null};
    try{await signal(trace);return true;}
    catch{try{await recordRefusal(trace);}catch{}return false;}
  };
  const invoke=deps.withPreview||withPreparedCandidatePreview;
  let waitTimer;
  try{return await invoke({command:'prepare-preview',scope:input.scope,...base},input.prepared,async preview=>{
    if(!await authorized())fail('authorization_revoked');
    const origin=previewBinding(preview,input.scope,input.prepared.release);
    if(!/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(origin))fail('live_preview_origin_invalid');
    const expires=Math.min(hardEnd,Date.now()+89000);
    if(expires-Date.now()<1000)fail('live_preview_expired');
    const ready={version:'customer-live-preview-ready.v1',lease_id:input.lease_id,nonce:input.nonce,scope_sha256:scopeHash,
      prepared_sha256:input.prepared.artifact_sha256,preview_url:origin+'/',expires_at:new Date(expires).toISOString()};
    await (deps.publish||publish)(path.join(directory,input.lease_id+'.ready.json'),ready);
    // No detached producer: returning, rejection, expiry or authority loss always
    // returns through the canonical callback's owned child-tree cleanup.
    await (deps.wait||((ms)=>new Promise(resolve=>{waitTimer=setTimeout(resolve,ms);}))) (expires-Date.now());
    return {version:'customer-live-preview-completed.v1',state:'expired'};
  },authorized);}catch(error){
    // Only the canonical producer's settled rejection is a cleanup witness.
    // Unknown cleanup or any published/ambiguous Ready file cannot mint this
    // proof. It proves producer cleanup, not the later CLI exit mechanism.
    // Keep the original refusal and never overwrite it.
    if(input.attempt_index===0&&error?.code==='authorization_revoked'&&firstRefusalReceipt?.code==='heartbeat_expired')try{
      let absent=false;
      try{await lstat(path.join(directory,input.lease_id+'.ready.json'));}catch(missing){if(missing.code==='ENOENT')absent=true;}
      if(absent)await (deps.publish||publish)(path.join(directory,input.lease_id+'.startup-closed.json'),{
        version:'customer-live-preview-startup-closed.v1',lease_id:input.lease_id,instance_id:input.instance_id,
        nonce:input.nonce,request_sha256:input.request_sha256,scope_sha256:scopeHash,
        prepared_sha256:input.prepared.artifact_sha256,hard_end_ms:input.hard_end_ms,attempt_index:0,
        guard_sha256:digest(firstRefusalReceipt),cause:'heartbeat_expired',closed_at:new Date().toISOString()});
    }catch{} // no receipt means no retry; diagnostics never replace the refusal
    throw error;
  }finally{clearTimeout(waitTimer);}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    const chunks=[];let bytes=0;
    for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>1000000)fail('live_preview_input_limit');chunks.push(chunk);}
    const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result=await(input.action==='inspect'?inspectLivePreview(input):serveLivePreview(input));
    process.stdout.write(JSON.stringify(result)+'\n');
  }catch(error){process.stderr.write(JSON.stringify({code:/^[a-z][a-z0-9_]{0,79}$/.test(error.code||'')?error.code:'live_preview_failed'})+'\n');process.exitCode=1;}
}
