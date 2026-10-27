// Selectively replay the reviewed overlay into the actual Studio, without deployment.
// Dry-run by default. --apply is intentionally explicit and requires live provider evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {memocastingContextChanges} from './CONTEXT_LINKS_2026_10_27.mjs';
import {stable,releaseSha} from '../../content-studio/src/scoped-content-release.mjs';
const local=path.resolve(import.meta.dirname,'../..');
const actual=process.env.MEMO_ACTUAL_STUDIO_DATA;
const publicRoot=process.env.MEMO_PUBLIC_CORE_DIR;
const releaseDir=process.env.MEMO_REVIEWED_RELEASE;
const baseRelease=process.env.MEMO_BASE_RELEASE;
assert.ok(actual&&publicRoot&&releaseDir&&baseRelease,'Set MEMO_ACTUAL_STUDIO_DATA, MEMO_PUBLIC_CORE_DIR, MEMO_REVIEWED_RELEASE and MEMO_BASE_RELEASE.');
assert.notEqual(path.resolve(actual),path.resolve(local,'sites/memocasting/studio-data'),'Actual Studio must be explicit, not this isolated copy.');
const reviewed=JSON.parse(await fs.readFile(path.join(releaseDir,'release-manifest.json'),'utf8'));
const verifiedBytes=await fs.readFile(path.join(releaseDir,'content-package.json'));
assert.equal(releaseSha(verifiedBytes),reviewed.packageSha256,'Reviewed package changed.');
const baselineBytes=await fs.readFile(path.join(releaseDir,'baseline-content-package.json'));
const baseSha=releaseSha(baselineBytes);
assert.equal(baseSha,'4b326c5c3547d164950631fe5b793b6b38a65cd84b16bfd545a47f5d04c8c548');
assert.equal(releaseSha(await fs.readFile(path.join(publicRoot,'content-packages/memocasting/content-package.json'))),baseSha,'Actual public checkout no longer matches baseline.');
const base=JSON.parse(baselineBytes), intended=JSON.parse(verifiedBytes);
const changes=memocastingContextChanges(base,new Date().toISOString());
const ids=changes.map(x=>x.id), expectedIds=new Set(ids);
assert.deepEqual(new Set(reviewed.scope.pageIds),expectedIds);
process.env.STUDIO_DATA_DIR=actual;process.env.STUDIO_PUBLIC_CORE_DIR=publicRoot;
process.env.STUDIO_NETWORK_SETTINGS=path.join(publicRoot,'config/niche-network.json');
process.env.STUDIO_OUTPUT_DIR=process.env.MEMO_ACTUAL_STUDIO_OUTPUT || path.resolve(actual,'../studio-output');
const model=await import(pathToFileURL(local+'/content-studio/src/model.mjs'));
const before=await model.getSite('memocasting');
const reference=JSON.parse(await fs.readFile(path.join(local,'sites/memocasting/qa/context-links-final-20261027/before-native.private.json'),'utf8'));
for(const key of ['name','offer','facts','audience','contact','canonicalHost','timezone','locale','brand','operatorName','renderer'])
 assert.equal(stable(before[key]??null),stable(reference[key]??null),'Studio review context drift: '+key);
const active=(await model.listJobs()).filter(j=>j.siteId==='memocasting'&&['queued','running'].includes(j.status));
assert.equal(active.length,0,'Studio has active jobs; do not race them.');
for(const change of changes){
 const page=before.pages.find(p=>p.id===change.id);assert.ok(page,change.slug);
 assert.equal(model.revisionHash(page),change.expectedRevisionHash,change.slug+': current draft drift');
 assert.equal(page.publishedRevision?.revisionHash,change.expectedRevisionHash,change.slug+': approved source drift');
 assert.equal(page.publishAt,change.publishAt,change.slug+': publication date drift');
 assert.ok(!page.factChecks?.length,change.slug+': unresolved checks');
 const original=reference.pages.find(p=>p.id===change.id);
 for(const key of ['factChecks','linkSuggestions','networkLinkSuggestions'])assert.equal(stable(page[key]??[]),stable(original[key]??[]),change.slug+': review inputs drift: '+key);
}
const unrelated=new Map(before.pages.filter(p=>!expectedIds.has(p.id)).map(p=>[p.id,stable(p)]));
const verifyUnrelated=site=>{assert.equal(site.pages.length,before.pages.length,'Page inventory changed.');for(const [id,contents] of unrelated)assert.equal(stable(site.pages.find(p=>p.id===id)),contents,'Unrelated draft changed: '+id);};
const manifest=JSON.parse(await fs.readFile(path.join(baseRelease,'release-manifest.json'),'utf8'));
assert.equal(releaseSha(stable(manifest.assets)),reviewed.scope.baseline.assetsSha256,'Baseline inventory changed.');
const selectedNames=new Set(intended.pages.filter(p=>expectedIds.has(p.id)).flatMap(p=>p.media.map(m=>path.basename(m.src))));
for(const name of selectedNames){const expected=manifest.assets.find(a=>a.name===name)?.sha256;assert.ok(expected);assert.equal(releaseSha(await fs.readFile(path.join(actual,'media/memocasting',name))),expected,'Native asset differs: '+name);}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({state:'dry-run-only',pages:ids.length,baselineSha256:baseSha,selectedAssets:selectedNames.size}));process.exit(0);}
const sourceVersion=process.env.MEMO_ACTIVE_WORKER_VERSION,deploymentId=process.env.MEMO_ACTIVE_DEPLOYMENT_ID,observedAt=process.env.MEMO_PROVIDER_OBSERVED_AT;
assert.equal(sourceVersion,'e568ee43-ea76-4e97-afd5-ea5bd25cd0f3','Deployed worker drift requires fresh release review.');
assert.equal(deploymentId,'93c18329-0af8-4252-b307-1da23ef58a41','Deployment drift requires fresh release review.');
assert.ok(Date.parse(observedAt)&&Date.now()-Date.parse(observedAt)<15*60*1000,'Need provider observation less than 15 minutes old.');
const backup=path.join(actual,'..','context-links-native-before-'+Date.now()+'.private.json');
await fs.writeFile(backup,JSON.stringify({pages:before.pages.filter(p=>expectedIds.has(p.id))},null,2),{flag:'wx'});
for(const change of changes)await model.editPage('memocasting',change.id,change.input);
await model.finalizeInternalLinks('memocasting',ids);
const after=await model.getSite('memocasting');
verifyUnrelated(after);
for(const change of changes){
 const page=after.pages.find(p=>p.id===change.id), wanted=intended.pages.find(p=>p.id===change.id);
 assert.equal(model.revisionHash(page),wanted.revisionHash,change.slug+': edited revision mismatch');
 const entry=reviewed.pages.find(p=>p.pageId===change.id);
 assert.equal(entry.review?.revisionHash,wanted.revisionHash,change.slug+': missing review');
 const review=await model.recordEditorialReview('memocasting',change.id,{revisionHash:wanted.revisionHash,reviewer:entry.review.reviewer,evidence:entry.review.evidence});
 assert.equal(review.binding,entry.review.binding,change.slug+': Studio context drift');
}
const expectedRevisionHashes=Object.fromEntries(intended.pages.filter(p=>expectedIds.has(p.id)).map(p=>[p.id,p.revisionHash]));
await model.approveReviewedOverlay('memocasting',{pageIds:ids,expectedRevisionHashes,basePackagePath:path.join(releaseDir,'baseline-content-package.json'),expectedBasePackageSha256:baseSha},'codex-content-links-2026-10-27');
verifyUnrelated(await model.getSite('memocasting'));
const result=await model.releaseReviewedOverlay('memocasting',{pageIds:ids,basePackagePath:path.join(releaseDir,'baseline-content-package.json'),expectedBasePackageSha256:baseSha,baseAssetsDirectory:path.join(baseRelease,'assets'),expectedBaseAssets:manifest.assets,expectedBaseAssetsSha256:releaseSha(stable(manifest.assets)),baselineEvidence:{sourceVersion,deploymentId,observedAt}});
const {verifyContentRelease}=await import('../../content-studio/src/content-release.mjs');
const {validateContentPackage}=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
const verification=await verifyContentRelease(path.dirname(result.path),validateContentPackage);
console.log(JSON.stringify({backup,result,verification},null,2));
