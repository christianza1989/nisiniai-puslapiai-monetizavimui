// Server-owned, read-only continuity of an already imported private native case.
// Initial intake/replay, review/approval and public admission remain separate.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {loadCustomerContentContext,assertArtifactDirectories,readArtifactBytes} from './customer-content-context.mjs';
import {stableV2,normalizeV2Blocks,validateV2Editorial,validateV2Draft,v2RevisionHash,inlineNodes} from '../src/content-package-v2.mjs';
import {workflowOverview} from '../src/content-workflow.mjs';

const VERSION='private-native-continuity.v1',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=value=>sha(stableV2(value));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{1,79}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const text=(v,max,min=0)=>typeof v==='string'&&v.length<=max&&v.trim().length>=min;
const fail=code=>{throw Object.assign(new Error(code),{code});};
function exact(value,keys){if(!object(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('private_continuity_invalid_input');}
const types=new Set(['home','service','product','guide','faq','location','article','index','author','policy','about','contact']);
const transport=['manifestPath','dataDir','outputDir','replayed','workflow'];
const flags={import:'not-performed',generation:'not-performed',sourceVerification:'not-performed',mediaVerification:'not-performed',
  editorialReview:'not-performed',approval:'not-performed',release:'not-performed',deployment:'not-performed',channelActivation:'not-performed'};

async function executionProof(anchor){
  const currentImporter=sha(await readArtifactBytes(new URL('./customer-creation-intake.mjs',import.meta.url),1000000));
  if(anchor.version==='private-native-anchor.v1')return currentImporter;
  for(const sources of [anchor.origin_native_sources,anchor.execution_native_sources]){
    exact(sources,['public_source_revision','importer_sha256','network_sha256']);
    if(!/^[a-f0-9]{40}$/.test(sources.public_source_revision)||!hex(sources.importer_sha256)||!hex(sources.network_sha256))fail('private_continuity_anchor_changed');
  }
  const original=anchor.origin_native_sources,current=anchor.execution_native_sources;
  if(!/^[a-f0-9]{40}$/.test(anchor.origin_source_revision)||!/^[a-f0-9]{40}$/.test(anchor.execution_source_revision)
      ||anchor.origin_source_revision===anchor.execution_source_revision||stableV2(original)===stableV2(current)
      ||original.network_sha256!==current.network_sha256||current.importer_sha256!==currentImporter)fail('private_continuity_anchor_changed');
  const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR,network=process.env.STUDIO_NETWORK_SETTINGS;
  if(typeof publicRoot!=='string'||!path.isAbsolute(publicRoot)||typeof network!=='string'||!path.isAbsolute(network))fail('private_continuity_anchor_changed');
  let revision,dirty;
  try{
    const options={cwd:publicRoot,encoding:'utf8',timeout:10000,windowsHide:true,stdio:['ignore','pipe','pipe']};
    revision=execFileSync('git',['rev-parse','HEAD'],options).trim();
    dirty=execFileSync('git',['status','--porcelain'],options).trim();
  }catch{fail('private_continuity_anchor_changed');}
  if(dirty||revision!==current.public_source_revision||sha(await readArtifactBytes(network,1000000))!==current.network_sha256)fail('private_continuity_anchor_changed');
  return original.importer_sha256;
}

function privateSite(site,identity,snapshot=false){
  if(snapshot)exact(site,['id','name','canonicalHost','locale','timezone','brand','offer','contact','renderer','operatorName']);
  if(!object(site)||site.id!==identity.id||site.canonicalHost!==identity.canonicalHost||site.locale!==identity.locale
      ||site.timezone!==identity.timezone||site.renderer!=='niche'||!text(site.name,1000)||!text(site.offer,1000)
      ||!text(site.operatorName,300)||!object(site.brand)||!/^#[a-f0-9]{6}$/i.test(site.brand.accent)
      ||!object(site.contact)||Object.keys(site.contact).some(k=>!['email','phone'].includes(k))
      ||Object.keys(site.brand).some(k=>k!=='accent')||!text(site.contact.email,250)||!text(site.contact.phone??'',80)
      ||site.contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contact.email))fail('private_continuity_native_invalid');
  // Empty, unverified private contact/operator fields are allowed. Never invent
  // public facts merely to validate a draft against the publication schema.
}
function nativePages(site,model){
  if(site.schemaVersion!==2||site.contentWorkflowVersion!==1||!text(site.locale,30,1)||!text(site.timezone,100,1)
      ||!text(site.audience,1000)||!text(site.facts,12000)||!Array.isArray(site.pages)||!site.pages.length||site.pages.length>200
      ||!Array.isArray(site.assets)||site.assets.length>2000)fail('private_continuity_native_invalid');
  privateSite(site,site);
  const ids=new Set(),slugs=new Set(),assets=new Map(site.assets.map(a=>[a.id,a]));let homes=0;
  if(assets.size!==site.assets.length)fail('private_continuity_native_invalid');
  for(const p of site.pages){
    if(!id(p.id)||ids.has(p.id)||p.siteId!==site.id||p.contentVersion!==2||!types.has(p.type)
        ||typeof p.slug!=='string'||p.slug.length>150||!/^(?:[a-z0-9]+(?:[-/][a-z0-9]+)*)?$/.test(p.slug)
        ||/^(api|niche)(\/|$)/.test(p.slug)||slugs.has(p.slug)||(p.type==='home')!==(p.slug==='')
        ||!['planned','draft','review','approved','revoked'].includes(p.status)
        ||!text(p.title,1000,1)||!text(p.description,1000,1)||!text(p.intent,1000,1)
        ||typeof p.publishAt!=='string'||!Number.isFinite(Date.parse(p.publishAt))
        ||!Array.isArray(p.media)||p.media.length>60||!Array.isArray(p.links)||p.links.length>30)fail('private_continuity_native_invalid');
    ids.add(p.id);slugs.add(p.slug);if(p.type==='home')homes++;
    normalizeV2Blocks(p.body);validateV2Editorial(p.editorial);privateSite(p.siteSnapshot,site,true);
    if(p.editorial.authors.some(a=>a.siteId!==site.id||a.locale!==site.locale)
        ||['authors','sources','commerceTargets'].some(k=>new Set(p.editorial[k].map(x=>x.id)).size!==p.editorial[k].length)
        ||p.editorial.datePublished&&p.editorial.dateModified&&Date.parse(p.editorial.dateModified)<Date.parse(p.editorial.datePublished)
        ||!Array.isArray(p.factChecks)||p.factChecks.length>40||p.factChecks.some(v=>!text(v,600,1))
        ||!hex(model.revisionHash(p))||!hex(model.planningContextHash(p)))fail('private_continuity_native_invalid');
    const media=new Set();
    for(const m of p.media){
      const a=assets.get(m.id);
      if(media.has(m.id)||!a||['id','src','alt','width','height','rights'].some(k=>m[k]!==a[k])
          ||(m.credit??'')!==(a.credit??''))fail('private_continuity_media_invalid');
      media.add(m.id);
    }
    if(p.editorial.featuredImageId&&!media.has(p.editorial.featuredImageId)
        ||p.body.some(b=>b.type==='image'&&!media.has(b.assetId)))fail('private_continuity_media_invalid');
    if(p.planningBrief)model.normalizePlanningBrief(p.planningBrief);
    if(p.publishedRevision){
      validateV2Draft(p.publishedRevision);
      if(p.publishedRevision.id!==p.id||p.publishedRevision.siteId!==site.id
          ||p.publishedRevision.revisionHash!==v2RevisionHash(p.publishedRevision)
          ||p.publishedRevision.approval?.revisionHash!==p.publishedRevision.revisionHash)fail('private_continuity_native_invalid');
    }
    if(p.approval&&(p.approval.status!=='approved'||p.approval.revisionHash!==model.revisionHash(p)))fail('private_continuity_native_invalid');
  }
  if(homes!==1)fail('private_continuity_native_invalid');
  for(const p of site.pages){
    const targets=[...p.links.map(l=>l.targetPageId),...p.editorial.relatedPageIds,
      ...inlineNodes(p).filter(n=>n.type==='link'&&n.target.kind==='page').map(n=>n.target.pageId),
      ...(p.linkSuggestions??[]).map(l=>l.targetPageId)];
    if(targets.some(target=>!ids.has(target)||target===p.id)||!Array.isArray(p.linkSuggestions)||p.linkSuggestions.length>30
        ||[...p.links,...p.linkSuggestions].some(l=>!text(l.label,1000,1))
        ||!Array.isArray(p.externalLinks)||p.externalLinks.length>20)fail('private_continuity_native_invalid');
    for(const link of p.externalLinks){
      let url;try{url=new URL(link.url);}catch{fail('private_continuity_native_invalid');}
      if(url.protocol!=='https:'||url.username||url.password||url.port||!text(link.label,1000,1)||!text(link.reason,1000,1)
          ||typeof link.verified!=='boolean')fail('private_continuity_native_invalid');
    }
  }
}

export async function observeRetainedNative(input){
  exact(input,['version','creationId','acceptedRevision','sourceHash','canonicalHost','artifactsRoot','dataDir','outputDir','anchorIntake','anchor']);
  const a=input.anchor,r=input.anchorIntake;
  exact(a,['version','recovery_id','receipt_id','context_sha256','intake_sha256','manifest_sha256','observer_sha256',
    ...(a.version==='private-native-anchor.v2'?['origin_source_revision','execution_source_revision','origin_native_sources','execution_native_sources']:[])]);
  if(input.version!=='private-native-continuity-request.v1'||!['private-native-anchor.v1','private-native-anchor.v2'].includes(a.version)
      ||!uuid(input.creationId)||input.canonicalHost!==input.creationId.replaceAll('-','')+'.preview.invalid'
      ||!uuid(a.recovery_id)||!uuid(a.receipt_id)||!hex(a.context_sha256)||!hex(a.intake_sha256)||!hex(a.manifest_sha256)||!hex(a.observer_sha256)
      ||a.observer_sha256!==sha(await readFile(import.meta.filename))||!object(r)||digest(r)!==a.intake_sha256
      ||Object.hasOwn(r,'nativeContinuity'))fail('private_continuity_anchor_changed');
  const originalImporter=await executionProof(a);
  if(r.version!=='customer-content-intake.v1'||r.state!=='private-draft-imported'||r.creationId!==input.creationId
      ||r.acceptedRevision!==input.acceptedRevision||r.sourceHash!==input.sourceHash||r.canonicalHost!==input.canonicalHost
      ||r.fullF1!=='UNVERIFIED'||r.launch!=='UNVERIFIED'||r.deployment!=='not-performed'
      ||typeof r.replayed!=='boolean'||!object(r.workflow)||!hex(r.requestHash)||!hex(r.importerHash)||!hex(r.siteFileHash)
      ||r.importerHash!==originalImporter)fail('private_continuity_anchor_changed');
  const context=await loadCustomerContentContext(input),{site,model}=context;
  const manifestPath=path.join(context.directory,'intake-manifest.json'),sitePath=path.join(context.data,'sites',context.siteId+'.json');
  if(r.siteId!==context.siteId||r.manifestPath!==manifestPath||r.dataDir!==context.data||r.outputDir!==context.output)fail('private_continuity_anchor_changed');
  const files={source:path.join(context.directory,'source-draft.json'),intake:path.join(context.directory,'intake-context.json'),manifest:manifestPath,site:sitePath};
  const limits={source:200000,intake:300000,manifest:1000000,site:2000000},raw={};
  for(const [key,file]of Object.entries(files))raw[key]=await readArtifactBytes(file,limits[key]);
  const anchoredManifest=Object.fromEntries(Object.entries(r).filter(([k])=>!transport.includes(k)));
  if(sha(raw.source)!==input.sourceHash||sha(raw.intake)!==r.requestHash
      ||sha(raw.manifest)!==a.manifest_sha256||!raw.manifest.equals(Buffer.from(stableV2(anchoredManifest)))
      ||stableV2(site)!==stableV2(JSON.parse(raw.site)))fail('private_continuity_artifact_changed');
  nativePages(site,model);
  if(!Array.isArray(r.pageMappings)||!r.pageMappings.length||new Set(r.pageMappings.map(m=>m.pageId)).size!==r.pageMappings.length)fail('private_continuity_anchor_changed');
  for(const m of r.pageMappings){
    const p=site.pages.find(p=>p.id===m.pageId);
    if(!p||(p.type==='home'?'/':'/'+p.slug+'/')!==m.path||m.pageId!=='page-'+sha(m.path).slice(0,24)
        ||m.origin==='draft'&&!p.body.length)fail('private_continuity_native_invalid');
  }
  const assets={};
  if(site.assets.length)await assertArtifactDirectories(context.root,path.join(context.data,'media',site.id));
  for(const asset of site.assets){
    if(!id(asset.id)||!new RegExp(`^/content-assets/${site.id}/[a-zA-Z0-9._-]+\\.(webp|avif)$`).test(asset.src)
        ||!hex(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||!text(asset.alt,1000,1)||!text(asset.rights,1000,1)
        ||!Number.isSafeInteger(asset.width)||!Number.isSafeInteger(asset.height)||asset.width<1||asset.height<1
        ||Object.hasOwn(assets,asset.src))fail('private_continuity_media_invalid');
    const bytes=await readArtifactBytes(path.join(context.data,'media',site.id,path.basename(asset.src)),8*1048576);
    if(bytes.length!==asset.bytes||sha(bytes)!==asset.sha256)fail('private_continuity_media_invalid');
    const info=await sharp(bytes,{limitInputPixels:40000000}).metadata();
    if(!['webp','avif','heif'].includes(info.format)||info.width!==asset.width||info.height!==asset.height)fail('private_continuity_media_invalid');
    assets[asset.src]=asset.sha256;
  }
  const workflow=workflowOverview(site,model.revisionHash);
  for(const [key,file]of Object.entries(files))if(!(await readArtifactBytes(file,limits[key])).equals(raw[key]))fail('private_continuity_artifact_changed');
  if(await executionProof(a)!==originalImporter)fail('private_continuity_anchor_changed');
  return {...r,replayed:true,workflow,nativeContinuity:{version:VERSION,anchor:a,observed_at:new Date().toISOString(),
    source_draft_sha256:sha(raw.source),intake_context_sha256:sha(raw.intake),manifest_sha256:sha(raw.manifest),
    site_sha256:sha(raw.site),assets_sha256:assets,native_state:'private-v2',...flags}};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>1000000)fail('private_continuity_input_limit');chunks.push(chunk);}
    const value=await observeRetainedNative(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    if(Buffer.byteLength(JSON.stringify(value))>1000000)fail('private_continuity_output_limit');
    process.stdout.write(JSON.stringify(value)+'\n');
  }catch(error){process.stderr.write(JSON.stringify({version:VERSION,state:'failed',code:/^[a-z_]{1,80}$/.test(error.code||'')?error.code:'private_continuity_invalid'})+'\n');process.exitCode=1;}
}
