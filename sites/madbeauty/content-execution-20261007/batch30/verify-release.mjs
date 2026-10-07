import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyContentRelease} from '../../../../content-studio/src/content-release.mjs';
import {validateV2Package} from '../../../../content-studio/src/content-package-v2.mjs';
const get=async p=>JSON.parse(await readFile(new URL(p,import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
const pkg=await get('./release/content-package.json'),manifest=await get('./release/release-manifest.json'),execution=await get('./EXECUTION.json'),calendar=await get('./PUBLICATION-CALENDAR.json'),receipts=await get('./GENERATION-RECEIPTS.json'),media=await get('./MEDIA-PROVENANCE.json'),browser=await get('./BROWSER-REVIEW.json');
assert.equal(sha(await readFile(new URL('./release/content-package.json',import.meta.url))),execution.packageSha256);
assert.equal(execution.packageSha256,'75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4');
assert.equal(pkg.pages.length,39);assert.equal(pkg.pages.filter(p=>p.type==='guide').length,35);assert.equal(calendar.length,30);assert.equal(manifest.assets.length,180);
const verified=await verifyContentRelease(fileURLToPath(new URL('./release',import.meta.url)),validateV2Package);
assert.equal(verified.pages,39);assert.equal(verified.assets,180);
const ids=new Set(pkg.pages.map(p=>p.id));
for(const p of pkg.pages){
 assert.equal(p.approval.status,'approved');assert.equal(p.approval.revisionHash,p.revisionHash);
 assert.ok(p.title.trim()&&p.description.trim());
 for(const link of p.links){assert.ok(ids.has(link.targetPageId));assert.notEqual(link.targetPageId,p.id);}
 for(const a of p.editorial.authors){assert.equal(a.name,'Madbeauty redakcija');assert.equal(a.kind,'organization');assert.equal(a.siteId,'madbeauty');}
 if(p.type==='guide'){assert.ok(p.editorial.datePublished);assert.equal(p.editorial.dateModified,null);assert.ok(p.media.some(m=>m.id===p.editorial.featuredImageId));}
 const text=JSON.stringify(p);assert.ok(!/"(?:planningBrief|generatedDraft|generationReceipt|resultArtifact|prompt|factChecks|editorialReview)"\s*:/.test(text));
}
for(const row of calendar){const p=pkg.pages.find(p=>p.id===row.pageId);assert.equal(row.publishAt,p.publishAt);assert.equal(p.editorial.datePublished,p.publishAt);assert.equal(p.media.length,5);assert.ok(!p.body.some(b=>b.type==='image'&&b.assetId===p.editorial.featuredImageId));assert.equal(row.revisionHash,p.revisionHash);}
assert.equal(receipts.length,44);assert.equal(receipts.filter(r=>r.status==='complete').length,39);assert.equal(receipts.filter(r=>r.status==='failed').length,5);assert.equal(receipts.filter(r=>r.operation==='revise').length,9);
for(const r of receipts){assert.equal(r.model,'gpt-6-luna');assert.equal(r.reasoningEffort,'xhigh');assert.equal(r.observed.model,r.model);assert.equal(r.observed.reasoningEffort,r.reasoningEffort);assert.equal(r.fallback,false);assert.equal(r.rawResultBytesVerified,true);assert.ok(/^[a-f0-9]{64}$/.test(r.resultSha256));}
assert.equal(media.families.length,30);assert.equal(media.families.flatMap(f=>f.variants).length,150);assert.ok(media.families.every(f=>f.actualOriginalPixelsInspected&&f.desktopMobileDecoded));
assert.equal(browser.views,60);assert.equal(browser.pages,30);assert.equal(browser.horizontalOverflow,false);assert.equal(browser.rawMarkup,false);assert.equal(browser.allFeaturedDecoded,true);
const due=pkg.pages.filter(p=>Date.parse(p.publishAt)<=Date.parse('2026-10-07T12:00:00Z')),dueMedia=new Set(due.flatMap(p=>p.media.map(m=>m.id))),allMedia=new Set(pkg.pages.flatMap(p=>p.media.map(m=>m.id)));
assert.equal(due.length,7);assert.equal(dueMedia.size,25);assert.equal(allMedia.size-dueMedia.size,155);
const prior=await get('../native-v2/release/content-package.json');
for(const p of prior.pages){const current=pkg.pages.find(q=>q.id===p.id);assert.ok(current);assert.deepEqual(current.body,p.body);assert.equal(current.publishAt,p.publishAt);assert.deepEqual(current.media,p.media);}
console.log(JSON.stringify({passed:true,packageSha256:execution.packageSha256,pages:39,newArticles:30,assets:180,actualModelReceipts:44,observedModel:'gpt-6-luna/xhigh',initialDuePages:7,futurePages:32,initialDueAssets:25,futureOnlyAssets:155,previousNineProseMediaSchedulesPreserved:true,hostedAcceptanceSeparate:true},null,2));
