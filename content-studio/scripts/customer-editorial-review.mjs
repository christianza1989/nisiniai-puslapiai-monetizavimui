// Session-owned review/approval operations. Canonical model writers own all gates.
import {mkdir,open,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {stableV2,v2RevisionPayload} from '../src/content-package-v2.mjs';
import {editorialReview,reviewCurrent} from '../src/content-workflow.mjs';
import {assertArtifactDirectories,readArtifactBytes,loadCustomerContentContext} from './customer-content-context.mjs';

const VERSION='native-editorial-review.v1';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const same=(a,b)=>stableV2(a)===stableV2(b);
const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const pageId=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{1,79}$/.test(v);
const areas=['usefulness','facts','sources','media','links','presentation'];
function exact(value,keys){if(!object(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('workflow_review_receipt_invalid');}
function inputBinding(input){
  const fields=['creationId','acceptedRevision','sourceHash','canonicalHost','operationId','action','expectedSiteHash','pages','actorId','sourceRevision'];
  const extra=input.action==='record-review'?['evidence']:[];
  exact(input,[...fields,...extra,'command','artifactsRoot','dataDir','outputDir','authorizingSessionId']);
  if(!uuid(input.operationId)||!['record-review','approve-batch'].includes(input.action)||!hash(input.expectedSiteHash)
      ||!uuid(input.authorizingSessionId)||!/^session-user:[a-f0-9-]{36}$/.test(input.actorId)
      ||!uuid(input.actorId.slice('session-user:'.length))||!/^[a-f0-9]{40}$/.test(input.sourceRevision)
      ||!Array.isArray(input.pages)||!input.pages.length||input.pages.length>200
      ||input.action==='record-review'&&input.pages.length!==1||new Set(input.pages.map(p=>p.pageId)).size!==input.pages.length)
    fail('workflow_invalid_review');
  for(const pin of input.pages){exact(pin,['pageId','revisionHash','planningHash']);if(!pageId(pin.pageId)||!hash(pin.revisionHash)||!hash(pin.planningHash))fail('workflow_invalid_review');}
  if(extra.length){
    exact(input.evidence,areas);
    if(areas.some(k=>typeof input.evidence[k]!=='string'||input.evidence[k].trim().length<20||input.evidence[k].length>4000))fail('workflow_invalid_review');
  }
  // Stable user actor permits a fresh authorized Session to reconcile the SAME
  // request; the original/executing Session identities stay private in receipts.
  return Object.fromEntries([...fields,...extra].map(k=>[k,structuredClone(input[k])]));
}
async function read(file){try{return JSON.parse((await readArtifactBytes(file,5000000)).toString('utf8'));}catch(error){if(error.code==='ENOENT')return null;fail('workflow_review_receipt_invalid');}}
async function preserve(file,value){
  const handle=await open(file,'wx',0o600);
  try{await handle.writeFile(stableV2(value)+'\n');await handle.sync();}finally{await handle.close();}
}
function time(value,minimum){return typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value&&Date.parse(value)>=Date.parse(minimum)&&Date.parse(value)<=Date.now();}
function pinned(site,binding,model){
  return binding.pages.map(pin=>{
    const page=site.pages.find(p=>p.id===pin.pageId&&p.siteId===site.id&&p.status!=='revoked');
    if(!page||page.contentVersion!==2||model.revisionHash(page)!==pin.revisionHash||model.planningContextHash(page)!==pin.planningHash)fail('workflow_context_stale');
    return page;
  });
}
function pageReceipts(site,binding,model){return pinned(site,binding,model).map(p=>({pageId:p.id,revisionHash:model.revisionHash(p),planningHash:model.planningContextHash(p),
  // editPage can clear current approval while retaining the older immutable
  // publishedRevision. Bind that snapshot's own approval, never relabel it.
  reviewSha256:digest(p.editorialReview),reviewer:p.editorialReview.reviewer,approvedRevisionHash:p.publishedRevision?.revisionHash??null,
  approvalSha256:p.publishedRevision?.approval?digest(p.publishedRevision.approval):null}));}
function validateApplied(before,dispatch,site,nativeResult,model){
  const b=before.binding,selected=pinned(site,b,model),expected=structuredClone(before.site);
  if(selected.some(p=>!reviewCurrent(site,p,model.revisionHash(p))))fail('workflow_review_uncertain');
  if(b.action==='record-review'){
    const page=selected[0],old=before.site.pages.find(p=>p.id===page.id),review=page.editorialReview;
    if(!time(review?.checkedAt,dispatch.dispatchedAt)||!same(nativeResult,review)
        ||!same(review,editorialReview(before.site,old,b.pages[0].revisionHash,{reviewer:b.actorId,revisionHash:b.pages[0].revisionHash,evidence:b.evidence},Date.parse(review.checkedAt))))
      fail('workflow_review_uncertain');
    expected.pages.find(p=>p.id===page.id).editorialReview=structuredClone(review);
  }else{
    if(!same(nativeResult,{siteId:site.id,approved:b.pages.map(p=>p.pageId),deployment:'not-performed'}))fail('workflow_review_uncertain');
    const assetIds=new Set();
    for(const page of selected){
      const pin=b.pages.find(p=>p.pageId===page.id),a=page.approval;
      exact(a,['status','revisionHash','approvedAt','actorId']);
      if(a.status!=='approved'||a.revisionHash!==pin.revisionHash||a.actorId!==b.actorId
          ||!time(a.approvedAt,dispatch.dispatchedAt)||!time(page.updatedAt,a.approvedAt)
          ||!same(page.publishedRevision,{...v2RevisionPayload(page),id:page.id,revisionHash:pin.revisionHash,approval:a}))fail('workflow_review_uncertain');
      Object.assign(expected.pages.find(p=>p.id===page.id),{status:'approved',approval:structuredClone(a),revisionHash:pin.revisionHash,
        publishedRevision:structuredClone(page.publishedRevision),updatedAt:page.updatedAt});
      page.media.forEach(asset=>assetIds.add(asset.id));
    }
    for(const asset of expected.assets)if(assetIds.has(asset.id))asset.metadataPublished=true;
  }
  if(!same(expected,site))fail('workflow_review_uncertain');
}
function result(before,after,replayed){
  const b=before.binding;
  return {version:VERSION,state:'applied',operationId:b.operationId,creationId:b.creationId,acceptedRevision:b.acceptedRevision,
    sourceHash:b.sourceHash,canonicalHost:b.canonicalHost,siteId:before.siteId,action:b.action,actorId:b.actorId,
    requestHash:before.requestHash,beforeSiteHash:b.expectedSiteHash,appliedSiteHash:after.siteHash,
    beforeEvidenceSha256:digest(before),receiptSha256:digest(after),pageRevisions:after.pageRevisions,
    changed:replayed?false:!same(before.site,after.site),replayed,
    editorialReview:b.action==='record-review'?'recorded':'not-performed',approval:b.action==='approve-batch'?'approved':'not-performed',
    release:'not-performed',deployment:'not-performed',fullSite:'UNVERIFIED',launch:'UNVERIFIED'};
}

export async function reviewEditorial(context,input){
  const binding=inputBinding(input),requestHash=digest(binding),{model}=context;
  const directory=path.join(context.directory,'editorial-review-operations');
  await mkdir(directory,{recursive:true});await assertArtifactDirectories(context.root,directory);
  const lockFile=path.join(context.directory,'.editorial-review.lock'),token=randomUUID();let lock;
  try{lock=await open(lockFile,'wx',0o600);await lock.writeFile(stableV2({token,pid:process.pid}));await lock.sync();}
  catch(error){if(error.code==='EEXIST')fail('workflow_review_busy');throw error;}
  const file=suffix=>path.join(directory,binding.operationId+'.'+suffix+'.json');
  try{
    let before=await read(file('before')),dispatch=await read(file('dispatch')),after=await read(file('applied')),rejected=await read(file('rejected'));
    let current=await loadCustomerContentContext(input),site=current.site;
    if((dispatch||after||rejected)&&!before)fail('workflow_review_receipt_invalid');
    if(before){
      exact(before,['version','binding','requestHash','siteId','site','preparedAt','initialSessionId']);
      if(before.version!=='native-editorial-review-before.v1'||!same(before.binding,binding)||before.requestHash!==requestHash
          ||before.siteId!==context.siteId||before.site?.id!==context.siteId||model.studioContextHash(before.site)!==binding.expectedSiteHash
          ||!uuid(before.initialSessionId)||!time(before.preparedAt,'2000-01-01T00:00:00.000Z'))fail('workflow_review_conflict');
    }else{
      if(model.studioContextHash(site)!==binding.expectedSiteHash)fail('workflow_context_stale');
      pinned(site,binding,model);
      if(Buffer.byteLength(stableV2(site))>4000000)fail('workflow_review_snapshot_limit');
      before={version:'native-editorial-review-before.v1',binding,requestHash,siteId:site.id,site:structuredClone(site),
        preparedAt:new Date().toISOString(),initialSessionId:input.authorizingSessionId};
      await preserve(file('before'),before);
    }
    pinned(before.site,binding,model);
    if(dispatch){
      exact(dispatch,['version','requestHash','beforeEvidenceSha256','authorizingSessionId','dispatchedAt']);
      if(dispatch.version!=='native-editorial-review-dispatch.v1'||dispatch.requestHash!==requestHash||dispatch.beforeEvidenceSha256!==digest(before)
          ||!uuid(dispatch.authorizingSessionId)||!time(dispatch.dispatchedAt,before.preparedAt))fail('workflow_review_receipt_invalid');
    }
    if(after){
      exact(after,['version','state','requestHash','beforeEvidenceSha256','dispatchSha256','siteHash','site','nativeResult','pageRevisions']);
      if(!dispatch||rejected||after.version!==VERSION||after.state!=='applied'||after.requestHash!==requestHash
          ||after.beforeEvidenceSha256!==digest(before)||after.dispatchSha256!==digest(dispatch)
          ||after.siteHash!==model.studioContextHash(after.site))fail('workflow_review_receipt_invalid');
      validateApplied(before,dispatch,after.site,after.nativeResult,model);
      if(!same(after.pageRevisions,pageReceipts(after.site,binding,model)))fail('workflow_review_receipt_invalid');
      if(!same(site,after.site))fail('workflow_context_stale');
      return result(before,after,true);
    }
    if(rejected){
      exact(rejected,['version','requestHash','beforeEvidenceSha256','dispatchSha256','siteHash','code']);
      if(!dispatch||rejected.version!=='native-editorial-review-rejected.v1'||rejected.requestHash!==requestHash
          ||rejected.beforeEvidenceSha256!==digest(before)||rejected.dispatchSha256!==digest(dispatch)
          ||rejected.siteHash!==binding.expectedSiteHash||rejected.code!=='workflow_review_rejected')fail('workflow_review_receipt_invalid');
      fail('workflow_review_rejected');
    }
    // A dispatch without an immutable applied/rejected receipt is ambiguous.
    // Do not infer a write from timestamps, repeat it or overwrite the evidence.
    if(dispatch)fail('workflow_review_uncertain');
    if(!same(site,before.site))fail('workflow_context_stale');
    dispatch={version:'native-editorial-review-dispatch.v1',requestHash,beforeEvidenceSha256:digest(before),
      authorizingSessionId:input.authorizingSessionId,dispatchedAt:new Date().toISOString()};
    await preserve(file('dispatch'),dispatch);
    let nativeResult;
    try{
      const expected={expectedSiteHash:binding.expectedSiteHash};
      if(binding.action==='record-review')nativeResult=await model.recordEditorialReview(site.id,binding.pages[0].pageId,
        {reviewer:binding.actorId,revisionHash:binding.pages[0].revisionHash,evidence:binding.evidence},expected);
      else nativeResult=await model.approveReviewedBatch(site.id,binding.pages.map(p=>p.pageId),binding.actorId,expected);
    }catch{
      current=await loadCustomerContentContext(input);site=current.site;
      if(!same(site,before.site))fail('workflow_review_uncertain');
      rejected={version:'native-editorial-review-rejected.v1',requestHash,beforeEvidenceSha256:digest(before),dispatchSha256:digest(dispatch),
        siteHash:model.studioContextHash(site),code:'workflow_review_rejected'};
      await preserve(file('rejected'),rejected);fail('workflow_review_rejected');
    }
    current=await loadCustomerContentContext(input);site=current.site;
    validateApplied(before,dispatch,site,nativeResult,model);
    after={version:VERSION,state:'applied',requestHash,beforeEvidenceSha256:digest(before),dispatchSha256:digest(dispatch),
      siteHash:model.studioContextHash(site),site:structuredClone(site),nativeResult,pageRevisions:pageReceipts(site,binding,model)};
    await preserve(file('applied'),after);
    return result(before,after,false);
  }finally{
    await lock.close();const owner=JSON.parse((await readArtifactBytes(lockFile,1000)).toString('utf8'));
    if(owner.token!==token||owner.pid!==process.pid)fail('workflow_review_lock_changed');
    await unlink(lockFile);
  }
}
