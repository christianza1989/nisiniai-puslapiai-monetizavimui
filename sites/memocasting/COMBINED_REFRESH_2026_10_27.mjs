// Reconcile two independently reviewed, disjoint overlays against the exact live baseline.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {stable,releaseSha} from '../../content-studio/src/scoped-content-release.mjs';
import {productClarityChanges} from './PRODUCT_CLARITY_2026_10_27.mjs';
import {holidayRefresh} from './HOLIDAY_REFRESH_2026_10_27.mjs';

const data=process.env.MEMO_ACTUAL_STUDIO_DATA, pub=process.env.MEMO_PUBLIC_CORE_DIR, baseDir=process.env.MEMO_BASE_RELEASE;
const productDir=process.env.MEMO_PRODUCT_REVIEW, holidayDir=process.env.MEMO_HOLIDAY_REVIEW;
assert.ok(data&&pub&&baseDir&&productDir&&holidayDir,'Explicit native paths required.');
process.env.STUDIO_DATA_DIR=data; process.env.STUDIO_OUTPUT_DIR=path.resolve(data,'../studio-output');
process.env.STUDIO_PUBLIC_CORE_DIR=pub; process.env.STUDIO_NETWORK_SETTINGS=path.join(pub,'config/niche-network.json');
const m=await import('../../content-studio/src/model.mjs');
const baseRaw=await fs.readFile(path.join(baseDir,'content-package.json'));
const baseSha=releaseSha(baseRaw);
assert.equal(baseSha,'dfe2f7bf5ea4ef9550a68221e85468f62f380fd53e133f102f2346a4457e544a');
assert.equal(releaseSha(await fs.readFile(path.join(pub,'content-packages/memocasting/content-package.json'))),baseSha,'Public source drift');
const base=JSON.parse(baseRaw), before=await m.getSite('memocasting');
assert.equal((await m.listJobs()).filter(j=>j.siteId==='memocasting'&&['queued','running'].includes(j.status)).length,0,'Concurrent Studio job');
const changes=[...productClarityChanges(base,new Date().toISOString()),...holidayRefresh(before,base)];
assert.equal(changes.length,4); assert.equal(new Set(changes.map(c=>c.id)).size,4);
const reviewed=[];
for(const dir of [productDir,holidayDir]){
 const raw=await fs.readFile(path.join(dir,'content-package.json')), manifest=JSON.parse(await fs.readFile(path.join(dir,'release-manifest.json'),'utf8'));
 assert.equal(releaseSha(raw),manifest.packageSha256,'Reviewed release changed');
 assert.equal(manifest.scope.baseline.sha256,baseSha,'Reviewed baseline differs');
 const pkg=JSON.parse(raw); for(const id of manifest.scope.pageIds){const page=pkg.pages.find(p=>p.id===id),entry=manifest.pages.find(p=>p.pageId===id);assert.ok(page&&entry?.review);assert.equal(entry.review.revisionHash,page.revisionHash);reviewed.push({page,review:entry.review});}
}
assert.deepEqual(new Set(changes.map(c=>c.id)),new Set(reviewed.map(r=>r.page.id)));
for(const c of changes){const current=before.pages.find(p=>p.id===c.id),expected=base.pages.find(p=>p.id===c.id);assert.ok(current&&expected);assert.equal(m.revisionHash(current),c.expectedRevisionHash,c.slug+': draft changed');assert.equal(current.publishedRevision?.revisionHash,expected.revisionHash,c.slug+': published changed');assert.equal(current.publishAt,c.publishAt,c.slug+': date changed');assert.ok(!current.factChecks?.length,c.slug+': unresolved facts');}
const ids=new Set(changes.map(c=>c.id)), unrelated=new Map(before.pages.filter(p=>!ids.has(p.id)).map(p=>[p.id,stable(p)]));
function verifyUnrelated(site){assert.equal(site.pages.length,before.pages.length);for(const [id,value] of unrelated)assert.equal(stable(site.pages.find(p=>p.id===id)),value,'Unrelated draft changed '+id);}
const baseManifest=JSON.parse(await fs.readFile(path.join(baseDir,'release-manifest.json'),'utf8'));
assert.equal(baseManifest.packageSha256,baseSha);
if(!process.argv.includes('--apply')){console.log(JSON.stringify({state:'dry-run',pages:changes.map(c=>c.slug),baseSha,assets:baseManifest.assets.length}));process.exit(0);}
const sourceVersion=process.env.MEMO_ACTIVE_WORKER_VERSION,deploymentId=process.env.MEMO_ACTIVE_DEPLOYMENT_ID,observedAt=process.env.MEMO_PROVIDER_OBSERVED_AT;
assert.equal(sourceVersion,'e8b4cca1-4023-42d6-a3dc-d1b83308d3ce');assert.equal(deploymentId,'e2d92a39-9aac-4bb8-829a-42ebf0dc8d29');assert.ok(Date.parse(observedAt)&&Date.now()-Date.parse(observedAt)<15*60*1000,'Fresh provider observation required');
const backup=path.join(data,'..','combined-refresh-before-'+Date.now()+'.private.json');
await fs.writeFile(backup,JSON.stringify({pages:before.pages.filter(p=>ids.has(p.id))},null,2),{flag:'wx'});
for(const change of changes)await m.editPage('memocasting',change.id,change.input);
await m.finalizeInternalLinks('memocasting',[...ids]);
const after=await m.getSite('memocasting');verifyUnrelated(after);
for(const r of reviewed){const page=after.pages.find(p=>p.id===r.page.id);assert.equal(m.revisionHash(page),r.page.revisionHash,page.slug+': differs from reviewed revision');const result=await m.recordEditorialReview('memocasting',page.id,{revisionHash:r.page.revisionHash,reviewer:r.review.reviewer,evidence:r.review.evidence});assert.equal(result.binding,r.review.binding,page.slug+': review context changed');}
const expectedRevisionHashes=Object.fromEntries(reviewed.map(r=>[r.page.id,r.page.revisionHash]));
await m.approveReviewedOverlay('memocasting',{pageIds:[...ids],expectedRevisionHashes,basePackagePath:path.join(baseDir,'content-package.json'),expectedBasePackageSha256:baseSha},'codex-combined-refresh-2026-10-27');
verifyUnrelated(await m.getSite('memocasting'));
const result=await m.releaseReviewedOverlay('memocasting',{pageIds:[...ids],basePackagePath:path.join(baseDir,'content-package.json'),expectedBasePackageSha256:baseSha,baseAssetsDirectory:path.join(baseDir,'assets'),expectedBaseAssets:baseManifest.assets,expectedBaseAssetsSha256:releaseSha(stable(baseManifest.assets)),baselineEvidence:{sourceVersion,deploymentId,observedAt}});
const {verifyContentRelease}=await import('../../content-studio/src/content-release.mjs');
const {validateContentPackage}=await import(pathToFileURL(path.join(pub,'scripts/content-package-core.mjs')));
const verification=await verifyContentRelease(path.dirname(result.path),validateContentPackage);
console.log(JSON.stringify({path:result.path,sha:result.packageSha256,pages:[...ids].length,verified:verification.state??verification.status??'completed',backup}));
