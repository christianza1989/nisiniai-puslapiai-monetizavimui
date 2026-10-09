import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const [data,core,rendererFile]=process.argv.slice(2);
if(!data||!core||!rendererFile)throw Error('Explicit isolated studio DATA, shared public CORE and actual platform renderer required');
process.env.STUDIO_DATA_DIR=path.resolve(data);process.env.STUDIO_OUTPUT_DIR=path.resolve(data,'output');process.env.STUDIO_NETWORK_SETTINGS=path.resolve(core,'config/niche-network.json');
const model=await import('../../../content-studio/src/model.mjs');
const {validateV2Package}=await import('../../../content-studio/src/content-package-v2.mjs');
const {verifyContentRelease}=await import('../../../content-studio/src/content-release.mjs');
const {projectContentPagesV2}=await import(pathToFileURL(path.join(core,'lib/content-projection-v2.mjs')));
const {contentSeoV2}=await import(pathToFileURL(path.join(core,'lib/content-seo-v2.mjs')));
const {renderContentPage}=await import(pathToFileURL(path.resolve(rendererFile)));
const here=new URL('./',import.meta.url),read=async f=>JSON.parse(await readFile(new URL(f,here),'utf8'));
const prior=await read('../content-execution-20261007/batch30/release/content-package.json');
const calendar=await read('PUBLICATION-CALENDAR.json'),plan=await read('PLAN.json');
const source=await model.getSite('madbeauty'),priorById=new Map(prior.pages.map(p=>[p.id,p]));
assert.equal(source.pages.filter(p=>p.publishedRevision).length,39);
for(const p of source.pages.filter(p=>p.publishedRevision))assert.deepEqual(p.publishedRevision,priorById.get(p.id),'Isolated owner snapshot must match deployed source');
const changed=[],planned=[];
for(const e of calendar.entries){
 const p=source.pages.find(p=>p.id===e.pageId);assert.ok(p&&p.slug===e.slug);
 if(e.status==='PUBLISHED'){assert.equal(p.publishAt,e.publishAt);continue;}
 if(Date.parse(p.publishedRevision?.publishAt||p.publishAt)===Date.parse(e.publishAt))continue;
 if(p.publishedRevision){
   assert.ok(Date.parse(p.publishAt)>Date.parse('2026-10-09T23:59:59+03:00'));
   changed.push({pageId:p.id,slug:p.slug,oldRevisionHash:p.publishedRevision.revisionHash,previousPublishAt:p.publishedRevision.publishAt,publishAt:e.publishAt,previousReview:structuredClone(p.editorialReview)});
   await model.editPage('madbeauty',p.id,{publishAt:e.publishAt,editorial:{...p.editorial,datePublished:e.publishAt}});
 }else{
   assert.equal(p.body.length,0);assert.equal(p.media.length,0);
   await model.editPage('madbeauty',p.id,{publishAt:e.publishAt});planned.push(p.id);
 }
}
let site=await model.getSite('madbeauty');
const bySlug=new Map(plan.pages.map(p=>[p.slug,p]));
const reconciliation=await model.reconcilePrivatePlan('madbeauty',{
 canonicalHost:site.canonicalHost,locale:site.locale,expectedSiteHash:createHash('sha256').update(model.stable(site)).digest('hex'),
 sourcePlanSha256:createHash('sha256').update(await readFile(new URL('PLAN.json',here))).digest('hex'),skillFingerprint:plan.seoCoreReview.fingerprint,coverageTarget:299,retire:[],
 updates:site.pages.map(p=>({pageId:p.id,slug:p.slug,brief:bySlug.get(p.slug)||p.planningBrief?.data||{role:'Preserved existing supporting or published page',slug:p.slug},metadata:{},pillarPageId:p.pillarPageId||'',linkSuggestions:p.linkSuggestions||[]}))
});
await model.editSite('madbeauty',{contentPolicy:{...site.contentPolicy,coverageTarget:295}});
site=await model.getSite('madbeauty');
const alignedUnwritten=calendar.entries.filter(e=>e.status==='PLAN_NOT_WRITTEN');
assert.equal(alignedUnwritten.length,260);
for(const e of alignedUnwritten){const p=site.pages.find(p=>p.id===e.pageId);assert.equal(Date.parse(p.publishAt),Date.parse(e.publishAt));assert.equal(p.body.length,0);assert.ok(!p.publishedRevision);}
const proofs=[];
for(const row of changed){
 const old=priorById.get(row.pageId),page=site.pages.find(p=>p.id===row.pageId);
 const original=structuredClone(model.revisionPayload(old)),fresh=structuredClone(model.revisionPayload(page));
 delete original.publishAt;delete fresh.publishAt;delete original.editorial.datePublished;delete fresh.editorial.datePublished;
 assert.deepEqual(fresh,original,'Only publishAt/datePublished may change');
 assert.deepEqual(page.factChecks,source.pages.find(p=>p.id===page.id).factChecks);
 assert.ok(row.previousReview?.revisionHash===row.oldRevisionHash);
 const fragment=renderContentPage({...page,dates:{published:page.editorial.datePublished,modified:page.editorial.dateModified},links:[],editorial:{...page.editorial,relatedPageIds:[]}}, {pages:[]});
 assert.ok(fragment.includes('<time datetime="'+page.publishAt+'">'));
 assert.ok(fragment.includes('aria-label="Kelias"'));
 assert.ok(fragment.includes(page.editorial.featuredImageId?'class="article-cover"':'<article'));
 const priorEvidence=row.previousReview.evidence;
 const suffix=' Historical substantive review remains evidence for unchanged content; this review is a date-only delta, not a new claim/source/pixel or human specialist review.';
 await model.recordEditorialReview('madbeauty',page.id,{reviewer:'codex-root-continuous-calendar-20261009',revisionHash:model.revisionHash(page),evidence:{
  usefulness:priorEvidence.usefulness+suffix,
  facts:'Exact native revision payload comparison proves all factual body and editorial fields unchanged except the future publication date. Prior review '+row.previousReview.checkedAt+' remains factual evidence. No new human professional review claimed.',
  sources:'All source URLs, editorial source records and external links are byte-equivalent to the reviewed 75aa78 release. Prior scoped source reading: '+row.previousReview.checkedAt+'. No new facts added or old observations relabelled as current.',
  media:'All media IDs, dimensions, alt, rights and bytes remain in the prior inspected 180-WebP release; shared exporter verifies every byte. Historical pixel inspection is retained, not claimed repeated for a scheduling-only correction.',
  links:'All typed commerce targets, inline link IDs, editorial related IDs and external links are unchanged; the shared clock projection will hide unavailable destinations at every new instant. Full future graph and unwritten plans retained separately.',
  presentation:'Actual current platform renderContentPage produced a private date-only draft fragment with exact new <time datetime>, breadcrumbs and article cover. Previous desktop/mobile layout acceptance remains historical evidence; hosted runtime checks follow this new immutable export.'
 }});
 proofs.push({pageId:page.id,slug:page.slug,previousPublishAt:row.previousPublishAt,publishAt:page.publishAt,oldRevisionHash:row.oldRevisionHash,newRevisionHash:model.revisionHash(page),onlyFutureDatesChanged:true,actualDraftFragmentTime:true});
}
await model.approveReviewedBatch('madbeauty',changed.map(r=>r.pageId),'codex-root-reviewed-continuous-dates-20261009');
const release=await model.releaseContent('madbeauty');
const directory=path.dirname(release.path),result=await verifyContentRelease(directory,validateV2Package);
const pkg=JSON.parse(await readFile(release.path,'utf8'));assert.equal(pkg.pages.length,39);assert.equal(result.assets,180);
for(const p of pkg.pages){const old=priorById.get(p.id);assert.deepEqual(p.body,old.body);assert.deepEqual(p.media,old.media);if(!changed.some(r=>r.pageId===p.id))assert.deepEqual(p,old);}
const instants=[...new Set(pkg.pages.filter(p=>p.type==='guide'&&Date.parse(p.publishAt)>Date.parse('2026-10-09T23:59:59+03:00')).map(p=>Date.parse(p.publishAt)))].sort((a,b)=>a-b);
for(const instant of instants){
 const before=projectContentPagesV2(pkg,[pkg],{}, {targets:[]},instant-1),at=projectContentPagesV2(pkg,[pkg],{}, {targets:[]},instant);
 assert.equal(at.length,before.length+1,'Only one new article per instant');
 for(const [pages,now]of [[before,instant-1],[at,instant]]){
   const publicIds=new Set(pages.map(p=>p.id));
   for(const p of pages){assert.ok(Date.parse(p.publishAt)<=now);assert.ok(p.links.every(l=>publicIds.has(l.targetPageId)));assert.ok(p.editorial.relatedPageIds.every(id=>publicIds.has(id)));}
   for(const kind of ['sitemap','llms','llms-full']){
    const output=contentSeoV2(pkg,pages,kind).body;
    for(const p of pkg.pages.filter(p=>Date.parse(p.publishAt)>now))assert.ok(!output.includes('https://madbeauty.lt/'+p.slug+'\n')&&!output.includes('<loc>https://madbeauty.lt/'+p.slug+'</loc>'),'Future canonical leaked');
   }
 }
}
const destination=new URL('release/',here);await mkdir(destination,{recursive:true});await mkdir(new URL('assets/',destination),{recursive:true});
await copyFile(release.path,new URL('content-package.json',destination));await copyFile(release.manifestPath,new URL('release-manifest.json',destination));
const manifest=JSON.parse(await readFile(release.manifestPath,'utf8'));
for(const a of manifest.assets)await copyFile(path.join(directory,'assets',a.name),new URL('assets/'+a.name,destination));
const receipt={recordedAt:new Date().toISOString(),state:'verified-export-not-deployed',previousPackageSha256:calendar.previousPackageSha256,packageSha256:release.packageSha256,releasePath:fileURLToPath(destination),pages:39,guides:35,changedFutureDates:changed.length,unchangedApprovedPages:39-changed.length,unwrittenPlansAligned:alignedUnwritten.length,mutatedUnwrittenThisAttempt:planned.length,totalArticlePlans:295,bodyMediaAndClaimsUnchanged:true,historicalThreeDatesUnchanged:true,all180AssetsVerified:true,distinctFutureInstants:instants.length,beforeAtProjectionStates:instants.length*2,privateReconciliation:{activePages:reconciliation.activePages,articleCoverageTarget:295,protectedRevisions:reconciliation.protectedHashes.length},actualRendererSha256:createHash('sha256').update(await readFile(rendererFile)).digest('hex'),proofs,notAccepted:['Actual production deployment','Actual future public dates','The remaining 260 unwritten articles','New clinical review or AI/search visibility']};
await writeFile(new URL('RELEASE-REVIEW.json',here),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({...receipt,proofs:undefined},null,2));
