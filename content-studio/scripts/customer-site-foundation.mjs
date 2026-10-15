// Trusted native evidence adapter. No model, server, deployment or permission.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstat,readFile,readdir,mkdir,open,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadCustomerContentContext,assertArtifactDirectories,readArtifactBytes} from './customer-content-context.mjs';
import {customerContentWorkflow} from './customer-content-workflow.mjs';
import {stableV2,validateV2Package} from '../src/content-package-v2.mjs';
import {verifyContentRelease} from '../src/content-release.mjs';
import {verifySiteCompletion,requestCompletion} from '../../SKILLS/niche-site-audit/scripts/verify-site-completion.mjs';
import {prepareCustomerSitePreview,withCustomerSitePreview,checkCustomerSitePreview} from './customer-site-preview.mjs';

const ROOT=path.resolve(import.meta.dirname,'../..'),VERSION='native-foundation-evidence.v1';
const VERIFIER=path.join(ROOT,'SKILLS/niche-site-audit/scripts/verify-site-completion.mjs');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),digest=value=>sha(stableV2(value));
const hex=(value,n)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(value);
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const pageId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{1,79}$/.test(value);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fail=code=>{throw Object.assign(new Error(code),{code});};
function exact(value,keys){if(!object(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('foundation_invalid_input');}
const scopeKeys=['user_id','organization_id','portfolio_id','environment_id','session_id','creation_id','approval_id','approval_fingerprint','approval_session_id','discovery_id','report_id','report_revision','report_sha256','accepted','sources','language_review_mode','site_context_sha256','page_snapshot_sha256','required_page_ids'];
const acceptedKeys=['revision_id','accepted_revision','candidate_sha256','accepted_source_revision','site_id','canonical_host','coordinator_event_id','coordinator_sha256','intake_sha256','intake_request_sha256','intake_importer_sha256','intake_site_file_sha256'];
const sourceKeys=['execution_source_revision','public_source_revision','bridge_sha256','verifier_sha256','parser_sha256'];
export function validateScope(scope){
  exact(scope,scopeKeys);exact(scope.accepted,acceptedKeys);exact(scope.sources,sourceKeys);
  for(const key of ['user_id','organization_id','portfolio_id','session_id','creation_id','approval_id','approval_session_id','discovery_id','report_id'])if(!uuid(scope[key]))fail('foundation_invalid_scope');
  const p=scope.accepted;
  if(!uuid(p.revision_id)||!uuid(p.coordinator_event_id)||p.site_id!=='creation-'+scope.creation_id.replaceAll('-','')
      ||!Number.isInteger(p.accepted_revision)||p.accepted_revision<1||p.accepted_revision>20
      ||!Number.isInteger(scope.report_revision)||scope.report_revision<1||scope.report_revision>20
      ||typeof scope.environment_id!=='string'||!scope.environment_id.length||scope.environment_id.length>100
      ||!['required','paused_local_pilot'].includes(scope.language_review_mode)
      ||typeof p.canonical_host!=='string'||p.canonical_host.length>253||!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(p.canonical_host))fail('foundation_invalid_scope');
  for(const k of ['approval_fingerprint','report_sha256','site_context_sha256','page_snapshot_sha256'])if(!hex(scope[k],64))fail('foundation_invalid_scope');
  for(const k of acceptedKeys.filter(k=>k.endsWith('sha256')))if(!hex(p[k],64))fail('foundation_invalid_scope');
  if(!hex(p.accepted_source_revision,40))fail('foundation_invalid_scope');
  for(const k of sourceKeys)if(!hex(scope.sources[k],k.endsWith('revision')?40:64))fail('foundation_invalid_scope');
  const ids=scope.required_page_ids;
  if(!Array.isArray(ids)||!ids.length||ids.length>200||ids.some(i=>!pageId(i))||stableV2(ids)!==stableV2([...new Set(ids)].sort()))fail('foundation_invalid_scope');
  return scope;
}
const revision=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:10000}).trim();
async function sources(publicCore){
  try{
    if(execFileSync('git',['status','--porcelain'],{cwd:publicCore,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:10000}).trim())fail('foundation_source_stale');
    return {execution_source_revision:revision(ROOT),public_source_revision:revision(publicCore),
    bridge_sha256:sha(await readFile(import.meta.filename)),verifier_sha256:sha(await readFile(VERIFIER)),
    parser_sha256:sha(await readFile(path.join(path.dirname(VERIFIER),'rendered_site.py')))};
  }catch(error){if(error.code==='foundation_source_stale')throw error;fail('foundation_source_unavailable');}
}
async function json(file,max=1000000){return JSON.parse((await readArtifactBytes(file,max)).toString('utf8'));}
function observation(scope,state,blockers,release=null,completion=null){
  return {version:VERSION,state,scope_sha256:digest(scope),sources:scope.sources,
    site_context_sha256:scope.site_context_sha256,page_snapshot_sha256:scope.page_snapshot_sha256,
    required_page_ids:scope.required_page_ids,blockers:[...new Set(blockers)].sort(),release,completion,
    synthetic:scope.environment_id.startsWith('test-')||/\.(example|test|invalid|localhost)$/.test(scope.accepted.canonical_host),
    admission:'not_performed',deployment:'not_performed',channel_activation:'not_performed',calibration_status:'UNVERIFIED'};
}
async function current(context,base,scope){
  const native=scope.accepted,manifest=context.manifest;
  if(manifest.requestHash!==native.intake_request_sha256||manifest.importerHash!==native.intake_importer_sha256
      ||manifest.siteFileHash!==native.intake_site_file_sha256)fail('foundation_native_intake_changed');
  const status=await customerContentWorkflow({...base,command:'status'});
  if(status.expectedSiteHash!==scope.site_context_sha256||digest([...status.pages].sort((a,b)=>a.pageId<b.pageId?-1:a.pageId>b.pageId?1:0))!==scope.page_snapshot_sha256)fail('foundation_context_stale');
  const required=new Set(scope.required_page_ids),details=status.pages.filter(p=>required.has(p.pageId));
  if(details.length!==required.size)fail('foundation_page_binding_invalid');
  return {status,details};
}
async function currentMedia(context,details){
  for(const detail of details){
    const page=context.site.pages.find(p=>p.id===detail.pageId);
    for(const media of page.media){
      const asset=context.site.assets.find(a=>a.id===media.id);
      if(!asset||!hex(asset.sha256,64)||!new RegExp(`^/content-assets/${context.siteId}/[a-zA-Z0-9._-]+\\.(webp|avif)$`).test(media.src))fail('foundation_current_media_invalid');
      const folder=path.join(context.data,'media',context.siteId);await assertArtifactDirectories(context.root,folder);
      const bytes=await readArtifactBytes(path.join(folder,path.basename(media.src)),8*1048576);
      if(sha(bytes)!==asset.sha256||bytes.length!==asset.bytes)fail('foundation_current_media_invalid');
    }
  }
}
function readiness(status,details){
  const blockers=[];
  for(const p of details){
    const workflow=status.workflow.pages.find(row=>row.pageId===p.pageId);
    if(!workflow||workflow.revisionHash!==p.revisionHash)fail('foundation_page_binding_invalid');
    if(workflow.blockers.length)blockers.push('content_blocked:'+p.pageId);
    if(!p.reviewCurrent)blockers.push('review_missing:'+p.pageId);
    if(!p.hasApprovedRevision||p.approvedRevisionHash!==p.revisionHash)blockers.push('approval_missing:'+p.pageId);
    if(!p.mediaFilesPresent)blockers.push('media_missing:'+p.pageId);
  }
  for(const type of ['home','index','author','contact','policy'])if(!details.some(p=>p.type===type))blockers.push('first_delivery_missing_'+type);
  if(!details.some(p=>['guide','article'].includes(p.type)))blockers.push('first_delivery_missing_article');
  return blockers;
}
async function releaseEvidence(context,scope,releaseId,details){
  if(!uuid(releaseId))fail('foundation_invalid_release');
  const directory=path.join(context.output,'releases',context.siteId,releaseId);
  await assertArtifactDirectories(context.root,path.join(directory,'assets'));
  const manifestBytes=await readArtifactBytes(path.join(directory,'release-manifest.json'),2000000),manifest=JSON.parse(manifestBytes);
  const packageBytes=await readArtifactBytes(path.join(directory,'content-package.json'),5000000),pkg=JSON.parse(packageBytes);
  if(!Array.isArray(manifest.assets)||manifest.assets.length>2000)fail('foundation_release_binding_invalid');
  for(const asset of manifest.assets){
    if(typeof asset.name!=='string'||path.basename(asset.name)!==asset.name||!/^[a-zA-Z0-9._-]+\.(webp|avif)$/.test(asset.name))fail('foundation_release_binding_invalid');
    await readArtifactBytes(path.join(directory,'assets',asset.name),8*1048576);
  }
  await verifyContentRelease(directory,validateV2Package);
  if(pkg.schemaVersion!==2||pkg.siteId!==context.siteId||pkg.canonicalHost!==scope.accepted.canonical_host||pkg.site.renderer!=='niche'
      ||pkg.pages.length>200||manifest.assets.length>2000||manifest.packageSha256!==sha(packageBytes))fail('foundation_release_binding_invalid');
  for(const p of details){
    const saved=pkg.pages.find(page=>page.id===p.pageId),entry=manifest.pages.find(page=>page.pageId===p.pageId);
    const currentPage=context.site.pages.find(page=>page.id===p.pageId);
    if(!saved||saved.revisionHash!==p.revisionHash||!entry||entry.revisionHash!==p.revisionHash
        ||digest(entry.review)!==digest(currentPage.editorialReview))fail('foundation_release_stale');
  }
  const evidence={release_id:releaseId,manifest_sha256:sha(manifestBytes),package_sha256:sha(packageBytes),
    page_revisions:Object.fromEntries(pkg.pages.map(p=>[p.id,p.revisionHash])),asset_sha256:Object.fromEntries(manifest.assets.map(a=>[a.name,a.sha256]))};
  return {evidence,pkg,directory};
}
async function candidate(context,base,scope,details,directory){
  const file=path.join(directory,'candidate.json');
  try{
    const cached=await json(file);
    exact(cached,['version','scopeSha256','release']);
    if(cached.version!==1||cached.scopeSha256!==digest(scope))fail('foundation_candidate_stale');
    const actual=await releaseEvidence(context,scope,cached.release.release_id,details);
    if(stableV2(actual.evidence)!==stableV2(cached.release))fail('foundation_candidate_stale');
    return actual;
  }catch(error){if(error.code!=='ENOENT')throw error;}
  const result=await customerContentWorkflow({...base,command:'release',expectedSiteHash:scope.site_context_sha256});
  if(result.expectedSiteHash!==scope.site_context_sha256||result.operation?.result?.state!=='exported-not-deployed')fail('foundation_release_binding_invalid');
  const actual=await releaseEvidence(context,scope,result.operation.result.releaseId,details);
  await writeFile(file,JSON.stringify({version:1,scopeSha256:digest(scope),release:actual.evidence})+'\n',{flag:'wx'});
  return actual;
}
export function previewBinding(value,scope,release){
  exact(value,['version','scopeSha256','packageSha256','releaseId','publicSourceRevision','origin',...(value.version>=2?['transportHost']:[]),...(value.version===3?['producerSha256']:[])]);
  if(![1,2,3].includes(value.version)||(value.version>=2&&value.transportHost!=='origin')||(value.version===3&&!hex(value.producerSha256,64))||value.scopeSha256!==digest(scope)||value.packageSha256!==release.package_sha256
      ||value.releaseId!==release.release_id||value.publicSourceRevision!==scope.sources.public_source_revision)fail('foundation_preview_binding_invalid');
  let origin;try{origin=new URL(value.origin);}catch{fail('foundation_preview_binding_invalid');}
  if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname)||!origin.port||origin.pathname!=='/'
      ||origin.username||origin.password||origin.hash||origin.search)fail('foundation_preview_binding_invalid');
  return origin.origin;
}
const REVIEW_AREAS=['facts','sources','media','presentation','enlargement','inquiry','measurement','language'];
async function reviews(directory,scope,release){
  const file=path.join(directory,'review-evidence.json'),raw=await readArtifactBytes(file,1000000),value=JSON.parse(raw);
  exact(value,['version','scopeSha256','packageSha256','publicSourceRevision','reviewer','checkedAt','areas']);
  exact(value.areas,REVIEW_AREAS);
  if(value.version!==1||value.scopeSha256!==digest(scope)||value.packageSha256!==release.package_sha256
      ||value.publicSourceRevision!==scope.sources.public_source_revision||typeof value.reviewer!=='string'||!value.reviewer.trim()
      ||value.reviewer.length>120||!Number.isFinite(Date.parse(value.checkedAt))||Date.parse(value.checkedAt)>Date.now())fail('foundation_review_binding_invalid');
  for(const area of REVIEW_AREAS){
    const item=value.areas[area];exact(item,['status','files']);
    if(item.status!=='PASS'||!Array.isArray(item.files)||!item.files.length||item.files.length>20)fail('foundation_review_incomplete');
    for(const evidence of item.files){
      exact(evidence,['name','sha256']);
      if(typeof evidence.name!=='string'||evidence.name.length>120||!/^evidence-[a-zA-Z0-9._-]+$/.test(evidence.name)
          ||path.basename(evidence.name)!==evidence.name||!hex(evidence.sha256,64))fail('foundation_unsafe_evidence');
      const bytes=await readArtifactBytes(path.join(directory,evidence.name),20*1048576);
      if(!bytes.length||sha(bytes)!==evidence.sha256)fail('foundation_evidence_changed');
    }
  }
  return sha(raw);
}
async function renderer(origin,scope,release,originHost=false){
  const response=await requestCompletion(origin+'/',originHost?new URL(origin).host:scope.accepted.canonical_host,{maxBytes:1000000,timeoutMs:10000,probeOnly:true});
  if(response.status!==200||response.headers.get('x-niche-package-sha256')!==release.package_sha256
      ||response.headers.get('x-niche-source-revision')!==scope.sources.public_source_revision)fail('foundation_renderer_unbound');
}
async function localCompletion(context,scope,release,directory,usingPrepared=false){
  const auditPath=path.join(directory,'PHASE-1-AUDIT.json'),auditRaw=await readArtifactBytes(auditPath,2000000),audit=JSON.parse(auditRaw);
  if(audit.siteId!==context.siteId||audit.canonicalHost!==scope.accepted.canonical_host||audit.version?.packageSha256!==release.evidence.package_sha256
      ||audit.version?.sourceVersion!==scope.sources.public_source_revision)fail('foundation_audit_binding_invalid');
  const reviewSha=await reviews(directory,scope,release.evidence);
  if(scope.language_review_mode!=='required')fail('foundation_language_review_paused');
  const required=release.pkg.pages.filter(p=>scope.required_page_ids.includes(p.id)),articles=required.filter(p=>['guide','article'].includes(p.type));
  const indexes=required.filter(p=>p.type==='index'&&articles.every(a=>a.slug.startsWith(p.slug+'/'))).sort((a,b)=>a.slug.length-b.slug.length);
  if(!indexes.length)fail('foundation_article_index_unavailable');
  if(required.some(p=>!Number.isFinite(Date.parse(p.publishAt))||Date.parse(p.publishAt)>Date.now()))fail('foundation_publication_pending');
  let previewRaw=null,preview=null;
  try{previewRaw=await readArtifactBytes(path.join(directory,'preview.json'),16384);preview=JSON.parse(previewRaw);}catch(error){if(error.code!=='ENOENT')throw error;}
  const markerPath=path.join(directory,'preview-producer.json'),binding={version:2,scopeSha256:digest(scope),releaseId:release.evidence.release_id,packageSha256:release.evidence.package_sha256,publicSourceRevision:scope.sources.public_source_revision};
  let markerRaw=null,marker=null;
  try{markerRaw=await readArtifactBytes(markerPath,16384);marker=JSON.parse(markerRaw);const {buildSha256,...actual}=marker;if(!hex(buildSha256,64)||stableV2(actual)!==stableV2(binding))fail('foundation_preview_binding_invalid');}catch(error){if(error.code!=='ENOENT')throw error;}
  const produced=marker!==null;
  if(preview?.version===3&&(!produced||sha(markerRaw)!==preview.producerSha256))fail('foundation_preview_binding_invalid');
  if(!usingPrepared&&(!preview||produced)){
    const retainedOrigin=preview?previewBinding(preview,scope,release.evidence):null;
    if(preview&&(preview.version!==3||preview.transportHost!=='origin'))fail('foundation_preview_binding_invalid');
    const prepared=await prepareCustomerSitePreview(context,scope,release);
    if(produced&&prepared.buildSha256!==marker.buildSha256)fail('foundation_preview_binding_invalid');
    return withCustomerSitePreview(prepared,async started=>{
      if(!produced){markerRaw=Buffer.from(JSON.stringify({...binding,buildSha256:prepared.buildSha256})+'\n');await writeFile(markerPath,markerRaw,{flag:'wx'});}
      const bound={...started,version:3,producerSha256:sha(markerRaw)};
      if(preview){if(stableV2(bound)!==stableV2(preview))fail('foundation_preview_binding_invalid');}
      else await writeFile(path.join(directory,'preview.json'),JSON.stringify(bound)+'\n',{flag:'wx'});
      return localCompletion(context,scope,release,directory,true);
    },retainedOrigin);
  }
  if(!preview)fail('foundation_preview_binding_invalid');
  const origin=previewBinding(preview,scope,release.evidence),originHost=preview.version>=2;
  await renderer(origin,scope,release.evidence,originHost);
  const publicCore=process.env.STUDIO_PUBLIC_CORE_DIR;
  const python=path.join(ROOT,'agent-business-core/runtime/.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  const report=await verifySiteCompletion(['--package',path.join(release.directory,'content-package.json'),'--origin',origin,
    '--core',publicCore,'--article-index',indexes[0].slug,'--audit',auditPath,'--package-header','x-niche-package-sha256','--python',python,...(originHost?['--loopback-host','origin']:[])]);
  await renderer(origin,scope,release.evidence,originHost);
  // Preserve actual inspection failures as immutable private receipts, not prose or a fabricated PASS.
  const reportBytes=Buffer.from(JSON.stringify(report)+'\n');if(reportBytes.length>5000000)fail('foundation_evidence_limit');
  const reportFile=path.join(directory,'completion-'+digest(report)+'.json');
  try{await writeFile(reportFile,reportBytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;const old=await readArtifactBytes(reportFile,5000000);if(!old.equals(reportBytes))fail('foundation_evidence_changed');}
  if(report.state!=='LOCAL_DELIVERY_CHECKS_PASS'||report.issues.length||report.packageSha256!==release.evidence.package_sha256
      ||report.siteId!==context.siteId||report.canonicalHost!==scope.accepted.canonical_host||report.source.coreCommit!==scope.sources.public_source_revision
      ||report.transportOrigin!==origin||report.transportHost!==(originHost?new URL(origin).host:scope.accepted.canonical_host)
      ||report.inspector.scriptSha256!==scope.sources.verifier_sha256||report.inspector.htmlParserSha256!==scope.sources.parser_sha256
      ||!report.auditScore?.stages?.local?.perfect||report.publicPages<required.length){
    const error=Object.assign(new Error('foundation_local_delivery_incomplete'),{code:'foundation_local_delivery_incomplete',
      blockers:report.issues.slice(0,100).map(issue=>'render_'+String(issue).toLowerCase().replace(/[^a-z0-9_:-]/g,'_').slice(0,150))});throw error;
  }
  for(const [name,hash]of Object.entries(release.evidence.asset_sha256)){
    const request=report.http.find(r=>r.path==='/content-assets/'+context.siteId+'/'+name);
    // Future-only hidden assets are not claimed as rendered pixels.
    if(request?.status===200&&request.sha256!==hash)fail('foundation_rendered_media_changed');
  }
  if(sha(await readArtifactBytes(auditPath,2000000))!==sha(auditRaw)
      ||sha(await readArtifactBytes(path.join(directory,'preview.json'),16384))!==sha(previewRaw)
      ||await reviews(directory,scope,release.evidence)!==reviewSha)fail('foundation_evidence_changed');
  return {state:'LOCAL_DELIVERY_CHECKS_PASS',checked_at:report.checkedAt,report_sha256:digest(report),audit_sha256:sha(auditRaw),
    review_evidence_sha256:reviewSha,preview_sha256:sha(previewRaw),public_pages:report.publicPages,requests:report.http.length};
}
async function retained(context,scope,recorded,details,directory,publicCore){
  // The immutable DB observation is supplied by the trusted caller, not a browser.
  exact(recorded,['version','state','scope_sha256','sources','site_context_sha256','page_snapshot_sha256','required_page_ids','blockers','release','completion','synthetic','admission','deployment','channel_activation','calibration_status']);
  if(recorded.version!==VERSION||recorded.state!=='verified-local'||recorded.scope_sha256!==digest(scope)
      ||stableV2(recorded.sources)!==stableV2(scope.sources)||recorded.site_context_sha256!==scope.site_context_sha256
      ||recorded.page_snapshot_sha256!==scope.page_snapshot_sha256||stableV2(recorded.required_page_ids)!==stableV2(scope.required_page_ids)
      ||!Array.isArray(recorded.blockers)||recorded.blockers.length||recorded.admission!=='not_performed'||recorded.deployment!=='not_performed'
      ||recorded.channel_activation!=='not_performed'||recorded.calibration_status!=='UNVERIFIED'||scope.language_review_mode!=='required')fail('foundation_retained_stale');
  exact(recorded.completion,['state','checked_at','report_sha256','audit_sha256','review_evidence_sha256','preview_sha256','public_pages','requests']);
  if(recorded.completion.state!=='LOCAL_DELIVERY_CHECKS_PASS'||recorded.synthetic!==observation(scope,'blocked',['retained_check']).synthetic)fail('foundation_retained_stale');
  await assertArtifactDirectories(context.root,directory);
  const cached=await json(path.join(directory,'candidate.json'));
  if(cached.version!==1||cached.scopeSha256!==digest(scope)||stableV2(cached.release)!==stableV2(recorded.release))fail('foundation_retained_stale');
  const release=await releaseEvidence(context,scope,recorded.release.release_id,details);
  if(stableV2(release.evidence)!==stableV2(recorded.release))fail('foundation_retained_stale');
  const proof=recorded.completion,previewRaw=await readArtifactBytes(path.join(directory,'preview.json'),16384),preview=JSON.parse(previewRaw);
  const origin=previewBinding(preview,scope,release.evidence),auditRaw=await readArtifactBytes(path.join(directory,'PHASE-1-AUDIT.json'),2000000),audit=JSON.parse(auditRaw);
  const reviewSha=await reviews(directory,scope,release.evidence);
  if(sha(previewRaw)!==proof.preview_sha256||sha(auditRaw)!==proof.audit_sha256||reviewSha!==proof.review_evidence_sha256
      ||audit.siteId!==context.siteId||audit.canonicalHost!==scope.accepted.canonical_host
      ||audit.version?.packageSha256!==release.evidence.package_sha256||audit.version?.sourceVersion!==scope.sources.public_source_revision)fail('foundation_retained_stale');
  if(!hex(proof.report_sha256,64))fail('foundation_retained_stale');
  const report=await json(path.join(directory,'completion-'+proof.report_sha256+'.json'),5000000);
  if(digest(report)!==proof.report_sha256||report.state!=='LOCAL_DELIVERY_CHECKS_PASS'||report.issues.length
      ||report.packageSha256!==release.evidence.package_sha256||report.siteId!==context.siteId||report.canonicalHost!==scope.accepted.canonical_host
      ||report.transportOrigin!==origin||(report.transportHost??scope.accepted.canonical_host)!==(preview.version>=2?new URL(origin).host:scope.accepted.canonical_host)
      ||Date.parse(report.checkedAt)!==Date.parse(proof.checked_at)||report.publicPages!==proof.public_pages
      ||report.http.length!==proof.requests||report.source.coreCommit!==scope.sources.public_source_revision
      ||report.inspector.scriptSha256!==scope.sources.verifier_sha256||report.inspector.htmlParserSha256!==scope.sources.parser_sha256
      ||!report.auditScore?.stages?.local?.perfect)fail('foundation_retained_stale');
  if(preview.version===3){
    const markerRaw=await readArtifactBytes(path.join(directory,'preview-producer.json'),16384),marker=JSON.parse(markerRaw);
    const {buildSha256,...actual}=marker,binding={version:2,scopeSha256:digest(scope),releaseId:release.evidence.release_id,packageSha256:release.evidence.package_sha256,publicSourceRevision:scope.sources.public_source_revision};
    if(sha(markerRaw)!==preview.producerSha256||stableV2(actual)!==stableV2(binding)||!hex(buildSha256,64))fail('foundation_retained_stale');
    await checkCustomerSitePreview(context,scope,release,buildSha256);
  }
  for(const entry of report.source.files){
    // The report contains fixed canonical inspector paths, never free caller paths.
    if(typeof entry.file!=='string'||!/^((scripts|schemas|lib)\/[a-zA-Z0-9._-]+)$/.test(entry.file)
        ||sha(await readArtifactBytes(path.join(publicCore,entry.file),8*1048576))!==entry.sha256)fail('foundation_source_stale');
  }
  // Reject changed tracked runtime/render source under the claimed commit; docs are not execution.
  try{
    execFileSync('git',['diff','--quiet',scope.sources.execution_source_revision,'--','agent-business-core/runtime/src','content-studio/src','content-studio/scripts','SKILLS/niche-site-audit/scripts'],{cwd:ROOT,stdio:'ignore',timeout:10000});
    execFileSync('git',['diff','--quiet',scope.sources.public_source_revision,'--','proxy.ts','components','lib','schemas','scripts'],{cwd:publicCore,stdio:'ignore',timeout:10000});
  }catch{fail('foundation_source_stale');}
  await current(context,baseFor(context,scope),scope);await currentMedia(context,details);
  if(stableV2(await sources(publicCore))!==stableV2(scope.sources))fail('foundation_source_stale');
  return {version:VERSION,state:'retained-current',scope_sha256:digest(scope),observation_sha256:digest(recorded),sources:scope.sources,
    synthetic:recorded.synthetic,admission:'not_performed'};
}
function baseFor(context,scope){return {creationId:scope.creation_id,acceptedRevision:scope.accepted.accepted_revision,sourceHash:scope.accepted.candidate_sha256,
  canonicalHost:scope.accepted.canonical_host,artifactsRoot:context.root,dataDir:context.data,outputDir:context.output};}
export async function customerSiteFoundation(input){
  const retainedCommand=input?.command==='check-retained';
  exact(input,['command','scope','creationId','acceptedRevision','sourceHash','canonicalHost','artifactsRoot','dataDir','outputDir',...(retainedCommand?['observation']:[])]);
  if(!['candidate','verify-local','check-retained'].includes(input.command))fail('foundation_invalid_command');
  const scope=validateScope(input.scope),p=scope.accepted;
  if(input.creationId!==scope.creation_id||input.acceptedRevision!==p.accepted_revision||input.sourceHash!==p.candidate_sha256||input.canonicalHost!==p.canonical_host)fail('foundation_invalid_scope');
  const publicCore=process.env.STUDIO_PUBLIC_CORE_DIR;
  if(!publicCore||!path.isAbsolute(publicCore))fail('foundation_source_unavailable');
  if(stableV2(await sources(publicCore))!==stableV2(scope.sources))fail('foundation_source_stale');
  const base=Object.fromEntries(['creationId','acceptedRevision','sourceHash','canonicalHost','artifactsRoot','dataDir','outputDir'].map(k=>[k,input[k]]));
  if(retainedCommand){
    try{
      const context=await loadCustomerContentContext(base),{status,details}=await current(context,base,scope);
      if(readiness(status,details).length)fail('foundation_retained_stale');
      await currentMedia(context,details);
      return await retained(context,scope,input.observation,details,path.join(context.directory,'foundation',digest(scope)),publicCore);
    }catch(error){
      if(['foundation_source_stale','foundation_source_unavailable'].includes(error.code))throw error;
      fail('foundation_invalid_evidence');
    }
  }
  const context=await loadCustomerContentContext(base),{status,details}=await current(context,base,scope);
  const blockers=readiness(status,details);
  if(blockers.length)return observation(scope,'blocked',blockers);
  await currentMedia(context,details);
  const parent=path.join(context.directory,'foundation');
  // Validate every existing parent before any write; recursive mkdir could follow an alias.
  await assertArtifactDirectories(context.root,context.directory);
  try{await mkdir(parent);}catch(error){if(error.code!=='EEXIST')throw error;}
  await assertArtifactDirectories(context.root,parent);
  const directory=path.join(parent,digest(scope));
  try{await mkdir(directory);}catch(error){if(error.code!=='EEXIST')throw error;}
  await assertArtifactDirectories(context.root,directory);
  let lock;
  for(let n=0;n<30;n++)try{lock=await open(path.join(directory,'operation.lock'),'wx');break;}catch(error){if(error.code!=='EEXIST')throw error;await new Promise(resolve=>setTimeout(resolve,100));}
  if(!lock)return observation(scope,'blocked',['foundation_busy']);
  try{
    let release;
    try{release=await candidate(context,base,scope,details,directory);}catch(error){if(error.code?.startsWith('foundation_'))throw error;return observation(scope,'blocked',['foundation_release_unavailable']);}
    let completion=null,remaining=['local_evidence_pending'];
    if(input.command==='verify-local'){
      try{completion=await localCompletion(context,scope,release,directory);remaining=[];}
      catch(error){remaining=error.blockers?.length?error.blockers:[error.code==='ENOENT'?'local_evidence_missing':/^foundation_[a-z_]+$/.test(error.code||'')?error.code:'foundation_verification_failed'];}
    }
    await current(context,base,scope);
    await currentMedia(context,details);
    const after=await releaseEvidence(context,scope,release.evidence.release_id,details);
    if(stableV2(after.evidence)!==stableV2(release.evidence)||stableV2(await sources(publicCore))!==stableV2(scope.sources))fail('foundation_source_stale');
    return observation(scope,completion?'verified-local':'candidate',remaining,release.evidence,completion);
  }finally{await lock.close();await unlink(path.join(directory,'operation.lock'));}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>500000)fail('foundation_input_limit');chunks.push(chunk);}
    const result=await customerSiteFoundation(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    if(Buffer.byteLength(JSON.stringify(result))>1000000)fail('foundation_output_limit');
    process.stdout.write(JSON.stringify(result)+'\n');
  }catch(error){process.stderr.write(JSON.stringify({version:VERSION,state:'failed',code:/^foundation_[a-z_]{1,80}$/.test(error.code||'')?error.code:'foundation_failed'})+'\n');process.exitCode=1;}
}
