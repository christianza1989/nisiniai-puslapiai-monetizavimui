// Trusted local agent adapter; caller owns auth, lease and current accepted revision.
// No provider, inferred facts, source fetch, automatic review or deployment.
import { lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCustomerContentContext, assertArtifactDirectories, readArtifactBytes } from './customer-content-context.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { stableV2, validateV2Editorial, normalizeV2Blocks, inlineNodes } from '../src/content-package-v2.mjs';
import { workflowOverview, reviewCurrent } from '../src/content-workflow.mjs';
import { IMAGE_POLICY } from '../src/image-pipeline.mjs';
import { resolveInternalRichLinks } from '../src/internal-rich-links.mjs';

const VERSION = 'customer-content-workflow.v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,79}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const text = (v, max, min = 0) => typeof v === 'string' && v.length <= max && v.trim().length >= min;
function keys(value, allowed) { if (!object(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('workflow_invalid_input'); }
const baseKeys = ['command','creationId','acceptedRevision','sourceHash','canonicalHost','artifactsRoot','dataDir','outputDir','pageId'];
const commands = {
  status: [], prepare: [], 'read-page': [], 'read-media': ['assetId','expectedRevisionHash'],
  'amend-page': ['expectedSiteHash','expectedRevisionHash','expectedPlanningHash','patch'],
  'resolve-internal-links': ['expectedSiteHash','expectedRevisionHash','expectedPlanningHash'],
  'amend-site': ['expectedSiteHash','patch'],
  'import-media': ['expectedSiteHash','sourcePath','metadata','expectedSourceSha256'],
  'attach-media': ['expectedSiteHash','expectedRevisionHash','expectedPlanningHash','sourcePath','metadata','expectedSourceSha256'],
  'finalize-links': ['expectedSiteHash','pageIds'],
  'record-review': ['expectedSiteHash','review'],
  'approve-batch': ['expectedSiteHash','pageIds','actorId'],
  release: ['expectedSiteHash'],
};
const pageCommands = new Set(['amend-page','attach-media','resolve-internal-links','record-review','read-page','read-media']);
const types = new Set(['home','service','product','guide','faq','location','article','index','author','policy','about','contact']);

function pagePatch(value, site, page) {
  keys(value, ['type','title','description','intent','publishAt','factChecks','externalLinks','editorial','media','linkSuggestions']);
  if (!Object.keys(value).length) fail('workflow_invalid_patch');
  for (const [key,max,min] of [['title',160,1],['description',220,1],['intent',300,1]])
    if (key in value && !text(value[key],max,min)) fail('workflow_invalid_patch');
  if ('type' in value && (!types.has(value.type) || (value.type === 'home') !== (page.type === 'home'))) fail('workflow_invalid_patch');
  if ('publishAt' in value && (!text(value.publishAt,40,1) || !Number.isFinite(Date.parse(value.publishAt)))) fail('workflow_invalid_patch');
  if ('factChecks' in value && (!Array.isArray(value.factChecks) || value.factChecks.length > 40
      || value.factChecks.some(v => !text(v,600,1)))) fail('workflow_invalid_patch');
  if ('externalLinks' in value) {
    if (!Array.isArray(value.externalLinks) || value.externalLinks.length > 20) fail('workflow_invalid_patch');
    for (const link of value.externalLinks) {
      keys(link,['url','label','reason','verified']);
      let url; try { url = new URL(link.url); } catch { fail('workflow_invalid_patch'); }
      if (!text(link.url,2048,1) || url.protocol !== 'https:' || url.username || url.password || url.port
          || !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname) || !text(link.label,180,1)
          || !text(link.reason,500,1) || typeof link.verified !== 'boolean') fail('workflow_invalid_patch');
    }
  }
  if ('linkSuggestions' in value) {
    if (!Array.isArray(value.linkSuggestions) || value.linkSuggestions.length > 30) fail('workflow_invalid_patch');
    for (const link of value.linkSuggestions) {
      keys(link,['targetPageId','label','reason']);
      if (!id(link.targetPageId) || link.targetPageId === page.id || !text(link.label,160,1) || !text(link.reason,500,1)
          || !site.pages.some(p => p.id === link.targetPageId && p.siteId === site.id && p.status !== 'revoked')) fail('workflow_unknown_link');
    }
  }
  const media = value.media ?? page.media;
  if ('media' in value) {
    if (!Array.isArray(media) || media.length > 60) fail('workflow_invalid_patch');
    for (const item of media) { keys(item,['id']); if (!id(item.id) || !site.assets.some(a => a.id === item.id)) fail('workflow_unknown_asset'); }
  }
  if ('editorial' in value) {
    try { validateV2Editorial(value.editorial); } catch { fail('workflow_invalid_editorial'); }
    const e = value.editorial, mediaIds = new Set();
    for (const item of media) {
      const asset = site.assets.find(a => a.id === item.id);
      for (const a of asset?.groupId ? site.assets.filter(a => a.groupId === asset.groupId) : [item]) mediaIds.add(a.id);
    }
    if (e.authors.some(a => a.siteId !== site.id || a.locale !== site.locale)
        || e.relatedPageIds.some(i => !site.pages.some(p => p.id === i && p.siteId === site.id && p.status !== 'revoked'))
        || e.featuredImageId && !mediaIds.has(e.featuredImageId)
        || ['authors','sources','commerceTargets'].some(k => new Set(e[k].map(x => x.id)).size !== e[k].length)
        || e.commerceTargets.some(t => t.verified && !t.checkedAt)
        || e.datePublished && e.dateModified && Date.parse(e.dateModified) < Date.parse(e.datePublished)) fail('workflow_invalid_editorial');
  }
  return structuredClone(value);
}

function sitePatch(value) {
  keys(value,['name','offer','audience','facts','contact','operatorName','brand','contentPolicy']);
  if (!Object.keys(value).length) fail('workflow_invalid_patch');
  for (const k of ['name','offer','audience','facts','operatorName'])
    if (k in value && !text(value[k],k === 'facts' ? 12000 : k === 'operatorName' ? 300 : 1000)) fail('workflow_invalid_patch');
  if (value.contact !== undefined) {
    keys(value.contact,['email','phone']);
    if (!text(value.contact.email,250) || value.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contact.email)
        || !text(value.contact.phone,80) || value.contact.phone && !/^\+?[\d\s().-]{7,30}$/.test(value.contact.phone)) fail('workflow_invalid_patch');
  }
  if (value.brand !== undefined) { keys(value.brand,['accent']); if (!/^#[a-f0-9]{6}$/i.test(value.brand.accent)) fail('workflow_invalid_patch'); }
  return structuredClone(value);
}

const digest = value => createHash('sha256').update(stableV2(value)).digest('hex');
async function mediaInput(context,input) {
  keys(input.metadata,['mime','alt','rights','credit','prompt']);
  const m=input.metadata;
  if(!['image/png','image/jpeg','image/webp'].includes(m.mime)||!text(m.alt,300,1)||!text(m.rights,300,1)
      ||m.credit!==undefined&&!text(m.credit,200)||m.prompt!==undefined&&!text(m.prompt,20000))fail('workflow_invalid_media');
  if(!text(input.sourcePath,32767,1)||!path.isAbsolute(input.sourcePath))fail('workflow_unsafe_media');
  const file=path.resolve(input.sourcePath),sources=path.join(context.directory,'media-inputs'),relative=path.relative(sources,file);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative))fail('workflow_unsafe_media');
  await assertArtifactDirectories(context.root,path.dirname(file));
  const bytes=await readArtifactBytes(file,IMAGE_POLICY.maxInputBytes),sourceSha256=createHash('sha256').update(bytes).digest('hex');
  if(input.expectedSourceSha256!==undefined&&(!hash(input.expectedSourceSha256)||input.expectedSourceSha256!==sourceSha256))
    fail('workflow_media_source_mismatch');
  return {m,bytes,sourceSha256};
}

async function persistReceipt(file,value) {
  const temporary=file+'.'+randomUUID()+'.tmp',handle=await open(temporary,'wx',0o600);
  try {await handle.writeFile(stableV2(value)+'\n');await handle.sync();} finally {await handle.close();}
  await rename(temporary,file);
}

async function existingFamily(context,site,source) {
  const matches=[],groups=[...new Set(site.assets.map(a=>a.groupId).filter(g=>typeof g==='string'&&/^[a-f0-9-]{36}$/.test(g)))];
  for(const groupId of groups) {
    const family=site.assets.filter(a=>a.groupId===groupId);
    if(family.some(a=>a.alt!==source.m.alt.trim()||a.rights!==source.m.rights.trim()
        ||a.credit!==(source.m.credit??'').trim()))continue;
    const originals=path.join(context.data,'media-originals',site.id);
    await assertArtifactDirectories(context.root,originals);
    let original;
    try {original=JSON.parse((await readArtifactBytes(path.join(originals,groupId+'.json'),100000)).toString('utf8'));}
    catch {fail('workflow_media_receipt_invalid');}
    if(original.mime===source.m.mime&&original.sourceSha256===source.sourceSha256&&original.sourceBytes===source.bytes.length
        &&original.prompt===(source.m.prompt??''))matches.push(family);
  }
  if(matches.length>1)fail('workflow_media_receipt_conflict');
  if(!matches.length)return null;
  const variants=matches[0].sort((a,b)=>b.width-a.width);
  return {...variants[0],variants};
}

// Private, byte-bound import + existing fenced amend. No provider or arbitrary body.
// The runtime caller owns current Session/RLS/Creation/GUIDE admission fencing.
export async function attachMedia(context,input) {
  if(!hash(input.expectedSourceSha256)||!hash(input.expectedSiteHash)||!hash(input.expectedRevisionHash)
      ||!hash(input.expectedPlanningHash))fail('workflow_expected_context_required');
  const source=await mediaInput(context,input),{model}=context;
  const identity={creationId:input.creationId,acceptedRevision:input.acceptedRevision,sourceHash:input.sourceHash,
    canonicalHost:input.canonicalHost,pageId:input.pageId,sourceSha256:source.sourceSha256,metadata:source.m};
  const requestHash=digest(identity),binding={...identity,expectedSiteHash:input.expectedSiteHash,
    expectedRevisionHash:input.expectedRevisionHash,expectedPlanningHash:input.expectedPlanningHash};
  const directory=path.join(context.directory,'media-attachments');
  try {await mkdir(directory);} catch(error) {if(error.code!=='EEXIST')throw error;}
  await assertArtifactDirectories(context.root,directory);
  const file=path.join(directory,requestHash+'.json'),lockFile=path.join(directory,requestHash+'.lock');
  let lock;
  try {lock=await open(lockFile,'wx',0o600);} catch(error) {if(error.code==='EEXIST')fail('workflow_media_busy');throw error;}
  const token=randomUUID();await lock.writeFile(token);
  try {
    let receipt;
    try {receipt=JSON.parse((await readArtifactBytes(file,100000)).toString('utf8'));}
    catch(error) {if(error.code!=='ENOENT')fail('workflow_media_receipt_invalid');}
    let site=await model.getSite(context.site.id),page=site.pages.find(p=>p.id===input.pageId&&p.siteId===site.id&&p.status!=='revoked');
    if(!page)fail('workflow_unknown_link');
    if(receipt&&(receipt.version!=='native-media-attachment.v1'||receipt.requestHash!==requestHash
        ||stableV2(receipt.binding)!==stableV2(binding)||!['prepared','imported','attached'].includes(receipt.state)))
      fail('workflow_media_receipt_conflict');
    const replayed=Boolean(receipt);let changed=false;
    if(!receipt) {
      if(model.studioContextHash(site)!==input.expectedSiteHash||model.revisionHash(page)!==input.expectedRevisionHash
          ||model.planningContextHash(page)!==input.expectedPlanningHash)fail('workflow_context_stale');
      receipt={version:'native-media-attachment.v1',requestHash,binding,state:'prepared'};
      const existing=await existingFamily(context,site,source);
      // A crash during import is ambiguous. Retain prepared and refuse another import.
      await persistReceipt(file,receipt);
      const asset=existing??await model.saveResponsiveAsset(site.id,source.m,source.bytes,{expectedSiteHash:input.expectedSiteHash});
      // saveResponsiveAsset changes only assets. Derive the exact expected
      // transition from its actual records, never adopt an unrelated concurrent edit.
      const importedSiteHash=model.studioContextHash({...site,assets:existing?site.assets:[...site.assets,...asset.variants]});
      site=await model.getSite(site.id);
      receipt={...receipt,state:'imported',assetId:asset.id,groupId:asset.groupId,
        variants:asset.variants.map(({id,width,height,bytes,sha256})=>({id,width,height,bytes,sha256})),
        importedSiteHash};
      await persistReceipt(file,receipt);
      if(model.studioContextHash(site)!==importedSiteHash)fail('workflow_context_stale');
    }
    if(receipt.state==='prepared')fail('workflow_media_import_uncertain');
    if(!id(receipt.assetId)||!hash(receipt.importedSiteHash)||typeof receipt.groupId!=='string'
        ||! /^[a-f0-9-]{36}$/.test(receipt.groupId)||!Array.isArray(receipt.variants)
        ||!receipt.variants.length||receipt.variants.length>5||!receipt.variants.some(v=>v.id===receipt.assetId))
      fail('workflow_media_receipt_invalid');
    const family=site.assets.filter(a=>a.groupId===receipt.groupId);
    if(family.length!==receipt.variants.length||new Set(receipt.variants.map(v=>v.id)).size!==family.length)
      fail('workflow_media_receipt_invalid');
    const originals=path.join(context.data,'media-originals',site.id);
    await assertArtifactDirectories(context.root,originals);
    let original;
    try {original=JSON.parse((await readArtifactBytes(path.join(originals,receipt.groupId+'.json'),100000)).toString('utf8'));}
    catch {fail('workflow_media_receipt_invalid');}
    const originalName=receipt.groupId+'.'+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[source.m.mime]);
    if(original.groupId!==receipt.groupId||original.mime!==source.m.mime||original.filename!==originalName||original.sourceSha256!==source.sourceSha256
        ||original.sourceBytes!==source.bytes.length||original.prompt!==(source.m.prompt??''))
      fail('workflow_media_receipt_invalid');
    const originalBytes=await readArtifactBytes(path.join(originals,originalName),IMAGE_POLICY.maxInputBytes);
    if(originalBytes.length!==source.bytes.length||createHash('sha256').update(originalBytes).digest('hex')!==source.sourceSha256)
      fail('workflow_media_integrity');
    for(const variant of receipt.variants) {
      const asset=family.find(a=>a.id===variant.id);
      if(!asset||['width','height','bytes','sha256'].some(k=>asset[k]!==variant[k])
          ||asset.alt!==source.m.alt.trim()||asset.rights!==source.m.rights.trim()
          ||asset.credit!==(source.m.credit??'').trim()
          ||!new RegExp('^/content-assets/'+site.id+'/[a-f0-9-]{36}\\.webp$').test(asset.src))
        fail('workflow_media_receipt_invalid');
      const mediaDirectory=path.join(context.data,'media',site.id);
      await assertArtifactDirectories(context.root,mediaDirectory);
      const bytes=await readArtifactBytes(path.join(mediaDirectory,path.basename(asset.src)),IMAGE_POLICY.maxInputBytes);
      if(bytes.length!==variant.bytes||createHash('sha256').update(bytes).digest('hex')!==variant.sha256)
        fail('workflow_media_integrity');
    }
    page=site.pages.find(p=>p.id===input.pageId);
    if(receipt.state==='attached') {
      if(!hash(receipt.appliedRevisionHash)||!hash(receipt.appliedPlanningHash)
          ||model.revisionHash(page)!==receipt.appliedRevisionHash||model.planningContextHash(page)!==receipt.appliedPlanningHash
          ||page.editorial.featuredImageId!==receipt.assetId||family.some(a=>!page.media.some(m=>m.id===a.id)))
        fail('workflow_context_stale');
    } else {
      if(model.studioContextHash(site)!==receipt.importedSiteHash||model.revisionHash(page)!==input.expectedRevisionHash
          ||model.planningContextHash(page)!==input.expectedPlanningHash)fail('workflow_context_stale');
      const patch=pagePatch({media:[...new Set([receipt.assetId,...page.media.map(a=>a.id)])].map(id=>({id})),
        editorial:{...page.editorial,featuredImageId:receipt.assetId}},site,page);
      const alreadyAttached=page.editorial.featuredImageId===receipt.assetId&&family.every(a=>page.media.some(m=>m.id===a.id));
      const updated=alreadyAttached?page:await model.editPage(site.id,page.id,patch,{expectedSiteHash:receipt.importedSiteHash,
        expectedRevisionHash:input.expectedRevisionHash,expectedPlanningHash:input.expectedPlanningHash});
      receipt={...receipt,state:'attached',appliedRevisionHash:model.revisionHash(updated),
        appliedPlanningHash:model.planningContextHash(updated)};
      await persistReceipt(file,receipt);
      changed=!alreadyAttached;
    }
    return {requestHash,state:'attached',sourceSha256:source.sourceSha256,pageId:page.id,assetId:receipt.assetId,
      variantIds:receipt.variants.map(v=>v.id),appliedRevisionHash:receipt.appliedRevisionHash,
      appliedPlanningHash:receipt.appliedPlanningHash,receiptSha256:digest(receipt),changed,
      replayed,approval:'not-performed',mediaVerification:'not-performed',generation:'not-performed'};
  } finally {
    await lock.close();
    if((await readArtifactBytes(lockFile,100)).toString('utf8')!==token)fail('workflow_media_lock_changed');
    await unlink(lockFile);
  }
}

async function filesPresent(context, page) {
  for (const asset of page.media) {
    // Presence is an observation, not a format/quality/publication acceptance.
    // The canonical V2 approval/release validator still enforces its formats.
    if (!new RegExp(`^/content-assets/${context.site.id}/[a-zA-Z0-9._-]+\\.(webp|avif|png|jpe?g)$`).test(asset.src)) return false;
    const directory = path.join(context.data,'media',context.site.id);
    try { await assertArtifactDirectories(context.root,directory); const s = await lstat(path.join(directory,path.basename(asset.src)));
      if (!s.isFile() || s.isSymbolicLink() || !s.size) return false; } catch { return false; }
  }
  return true;
}

async function current(context, input, site) {
  const {model} = context, active = site.pages.filter(p => p.status !== 'revoked');
  if (active.length > 200) fail('workflow_status_limit');
  const pages = [];
  for (const p of active) {
    const revisionHash = model.revisionHash(p), reviewed = reviewCurrent(site,p,revisionHash);
    pages.push({pageId:p.id,type:p.type,path:p.type === 'home' ? '/' : '/' + p.slug + '/',title:p.title,
      revisionHash,planningHash:model.planningContextHash(p),factChecks:p.factChecks || [],externalLinks:p.externalLinks || [],
      mediaCount:p.media.length,mediaFilesPresent:await filesPresent(context,p),reviewCurrent:reviewed,
      reviewedAt:reviewed ? p.editorialReview.checkedAt : null,reviewer:reviewed ? p.editorialReview.reviewer : null,
      hasApprovedRevision:Boolean(p.publishedRevision),approvedRevisionHash:p.publishedRevision?.revisionHash ?? null});
  }
  const value = {version:VERSION,state:'current',creationId:input.creationId,acceptedRevision:input.acceptedRevision,
    sourceHash:input.sourceHash,canonicalHost:site.canonicalHost,siteId:site.id,observedAt:new Date().toISOString(),
    expectedSiteHash:model.studioContextHash(site),workflow:workflowOverview(site,model.revisionHash),pages,release:'UNVERIFIED'};
  if (Buffer.byteLength(stableV2(value)) > 1000000) fail('workflow_status_limit');
  return value;
}

export async function customerContentWorkflow(input) {
  if (!object(input) || !Object.hasOwn(commands,input.command)) fail('workflow_invalid_command');
  keys(input,[...baseKeys,...commands[input.command]]);
  const context = await loadCustomerContentContext(input,{requirePage:pageCommands.has(input.command)});
  const {model,site,page} = context;
  if (['read-page','read-media'].includes(input.command)) {
    const revisionHash=model.revisionHash(page);
    if(input.command==='read-media' && (!id(input.assetId) || !hash(input.expectedRevisionHash)
        || input.expectedRevisionHash!==revisionHash)) fail('workflow_context_stale');
    const media=page.media.map(asset=>{
      const stored=site.assets.find(a=>a.id===asset.id);
      if(!new RegExp(`^/content-assets/${site.id}/[a-zA-Z0-9._-]+\\.(webp|avif)$`).test(asset.src)
          || !stored || stored.src!==asset.src || stored.width!==asset.width || stored.height!==asset.height)
        fail('workflow_unknown_asset');
      return {id:asset.id,alt:asset.alt,width:asset.width,height:asset.height,bytes:stored.bytes,sha256:stored.sha256,
        credit:asset.credit||'',mime:asset.src.endsWith('.webp')?'image/webp':'image/avif'};
    });
    const value=await current(context,input,site);
    if(input.command==='read-media') {
      const asset=media.find(a=>a.id===input.assetId);
      if(!asset) fail('workflow_unknown_asset');
      const stored=page.media.find(a=>a.id===asset.id),directory=path.join(context.data,'media',site.id);
      await assertArtifactDirectories(context.root,directory);
      const bytes=await readArtifactBytes(path.join(directory,path.basename(stored.src)),IMAGE_POLICY.maxInputBytes);
      if(bytes.length!==asset.bytes || createHash('sha256').update(bytes).digest('hex')!==asset.sha256) fail('workflow_media_integrity');
      return {...value,mediaData:{pageId:page.id,revisionHash,asset,base64:bytes.toString('base64')}};
    }
    const body=normalizeV2Blocks(page.body),targets=new Set([...page.links.map(l=>l.targetPageId),
      ...inlineNodes({body}).filter(n=>n.type==='link'&&n.target.kind==='page').map(n=>n.target.pageId)]);
    if([...targets].some(target=>target===page.id||!site.pages.some(p=>p.id===target&&p.siteId===site.id&&p.status!=='revoked')))
      fail('workflow_unknown_link');
    const links=[...targets].map(target=>{const p=site.pages.find(p=>p.id===target);return {pageId:p.id,
      path:p.type==='home'?'/':'/'+p.slug+'/',title:p.title};});
    const doc={pageId:page.id,revisionHash,title:page.title,description:page.description,intent:page.intent,
      body,media,links};
    if(Buffer.byteLength(stableV2(doc))>500000) fail('workflow_status_limit');
    return {...value,pageDocument:doc,pageDocumentHash:createHash('sha256').update(stableV2(doc)).digest('hex')};
  }
  if (['status','prepare'].includes(input.command)) {
    const value = await current(context,input,site);
    if (input.command === 'prepare' && page) value.pageData = structuredClone(page);
    if (Buffer.byteLength(stableV2(value)) > 1000000) fail('workflow_status_limit');
    return value;
  }
  if (!hash(input.expectedSiteHash)) fail('workflow_expected_context_required');
  if(input.command==='attach-media') {
    const result=await attachMedia(context,input);
    return {...await current(context,input,await model.getSite(site.id)),
      operation:{command:input.command,result,deployment:'not-performed'}};
  }
  const expected = {expectedSiteHash:input.expectedSiteHash};
  if (model.studioContextHash(site) !== input.expectedSiteHash) fail('workflow_context_stale');
  let result;
  if (input.command === 'amend-page') {
    if (!hash(input.expectedRevisionHash) || !hash(input.expectedPlanningHash)) fail('workflow_expected_context_required');
    await model.editPage(site.id,page.id,pagePatch(input.patch,site,page),{...expected,
      expectedRevisionHash:input.expectedRevisionHash,expectedPlanningHash:input.expectedPlanningHash});
  } else if (input.command === 'resolve-internal-links') {
    if(!hash(input.expectedRevisionHash)||!hash(input.expectedPlanningHash)
        ||input.expectedRevisionHash!==model.revisionHash(page)
        ||input.expectedPlanningHash!==model.planningContextHash(page))fail('workflow_context_stale');
    const body=resolveInternalRichLinks(page.body,site.pages,page.id);
    result={changed:stableV2(body)!==stableV2(page.body)};
    if(result.changed)await model.editPage(site.id,page.id,{body},{...expected,
      expectedRevisionHash:input.expectedRevisionHash,expectedPlanningHash:input.expectedPlanningHash});
  } else if (input.command === 'amend-site') {
    await model.editSite(site.id,sitePatch(input.patch),expected);
  } else if (input.command === 'import-media') {
    const {m,bytes,sourceSha256}=await mediaInput(context,input);
    const asset = await model.saveResponsiveAsset(site.id,m,bytes,expected);
    result = {assetId:asset.id,variants:asset.variants.map(({id,width,height,bytes,sha256})=>({id,width,height,bytes,sha256})),
      ...(input.expectedSourceSha256!==undefined?{sourceSha256}:{})};
  } else if (input.command === 'record-review') {
    keys(input.review,['reviewer','revisionHash','evidence']);
    keys(input.review.evidence,['usefulness','facts','sources','media','links','presentation']);
    result = await model.recordEditorialReview(site.id,page.id,input.review,expected);
  } else if (input.command === 'release') {
    const released = await model.releaseContent(site.id,expected);
    result = {state:released.state,releaseId:path.basename(path.dirname(released.path)),packageSha256:released.packageSha256};
  } else {
    if (!Array.isArray(input.pageIds) || !input.pageIds.length || input.pageIds.length > 200
        || new Set(input.pageIds).size !== input.pageIds.length || input.pageIds.some(v=>!id(v))) fail('workflow_invalid_pages');
    if (input.command === 'approve-batch') {
      if (!text(input.actorId,120,1)) fail('workflow_actor_required');
      result = await model.approveReviewedBatch(site.id,input.pageIds,input.actorId,expected);
    } else result = await model.finalizeInternalLinks(site.id,input.pageIds,expected);
  }
  return {...await current(context,input,await model.getSite(site.id)),operation:{command:input.command,result:result ?? null,deployment:'not-performed'}};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const chunks=[];let size=0;
    for await (const chunk of process.stdin) {size+=chunk.length;if(size>500000)fail('workflow_input_limit');chunks.push(chunk);}
    process.stdout.write(JSON.stringify(await customerContentWorkflow(JSON.parse(Buffer.concat(chunks).toString('utf8'))))+'\n');
  } catch(error) {
    process.stderr.write(JSON.stringify({version:VERSION,state:'failed',code:/^[a-z_]{1,80}$/.test(error.code||'')?error.code:'workflow_failed'})+'\n');
    process.exitCode=1;
  }
}
