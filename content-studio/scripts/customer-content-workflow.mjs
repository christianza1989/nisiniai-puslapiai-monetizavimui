// Trusted local agent adapter; caller owns auth, lease and current accepted revision.
// No provider, inferred facts, source fetch, automatic review or deployment.
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCustomerContentContext, assertArtifactDirectories, readArtifactBytes } from './customer-content-context.mjs';
import { stableV2, validateV2Editorial } from '../src/content-package-v2.mjs';
import { workflowOverview, reviewCurrent } from '../src/content-workflow.mjs';
import { IMAGE_POLICY } from '../src/image-pipeline.mjs';

const VERSION = 'customer-content-workflow.v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,79}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const text = (v, max, min = 0) => typeof v === 'string' && v.length <= max && v.trim().length >= min;
function keys(value, allowed) { if (!object(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('workflow_invalid_input'); }
const baseKeys = ['command','creationId','acceptedRevision','sourceHash','canonicalHost','artifactsRoot','dataDir','outputDir','pageId'];
const commands = {
  status: [], prepare: [],
  'amend-page': ['expectedSiteHash','expectedRevisionHash','expectedPlanningHash','patch'],
  'amend-site': ['expectedSiteHash','patch'],
  'import-media': ['expectedSiteHash','sourcePath','metadata'],
  'finalize-links': ['expectedSiteHash','pageIds'],
  'record-review': ['expectedSiteHash','review'],
  'approve-batch': ['expectedSiteHash','pageIds','actorId'],
  release: ['expectedSiteHash'],
};
const pageCommands = new Set(['amend-page','record-review']);
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
  if (['status','prepare'].includes(input.command)) {
    const value = await current(context,input,site);
    if (input.command === 'prepare' && page) value.pageData = structuredClone(page);
    if (Buffer.byteLength(stableV2(value)) > 1000000) fail('workflow_status_limit');
    return value;
  }
  if (!hash(input.expectedSiteHash)) fail('workflow_expected_context_required');
  const expected = {expectedSiteHash:input.expectedSiteHash};
  if (model.studioContextHash(site) !== input.expectedSiteHash) fail('workflow_context_stale');
  let result;
  if (input.command === 'amend-page') {
    if (!hash(input.expectedRevisionHash) || !hash(input.expectedPlanningHash)) fail('workflow_expected_context_required');
    await model.editPage(site.id,page.id,pagePatch(input.patch,site,page),{...expected,
      expectedRevisionHash:input.expectedRevisionHash,expectedPlanningHash:input.expectedPlanningHash});
  } else if (input.command === 'amend-site') {
    await model.editSite(site.id,sitePatch(input.patch),expected);
  } else if (input.command === 'import-media') {
    keys(input.metadata,['mime','alt','rights','credit','prompt']);
    const m = input.metadata;
    if (!['image/png','image/jpeg','image/webp'].includes(m.mime) || !text(m.alt,300,1) || !text(m.rights,300,1)
        || m.credit !== undefined && !text(m.credit,200) || m.prompt !== undefined && !text(m.prompt,20000)) fail('workflow_invalid_media');
    if (!text(input.sourcePath,32767,1) || !path.isAbsolute(input.sourcePath)) fail('workflow_unsafe_media');
    const file = path.resolve(input.sourcePath), sources = path.join(context.directory,'media-inputs');
    const relative = path.relative(sources,file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) fail('workflow_unsafe_media');
    await assertArtifactDirectories(context.root,path.dirname(file));
    const bytes = await readArtifactBytes(file,IMAGE_POLICY.maxInputBytes);
    const asset = await model.saveResponsiveAsset(site.id,m,bytes,expected);
    result = {assetId:asset.id,variants:asset.variants.map(({id,width,height,bytes,sha256})=>({id,width,height,bytes,sha256}))};
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
