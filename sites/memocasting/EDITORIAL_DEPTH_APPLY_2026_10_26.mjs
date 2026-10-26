// Site-scoped editorial client. Native Studio APIs own all state and releases.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {editorialDepthChanges} from './EDITORIAL_DEPTH_CONTENT_2026_10_26.mjs';
import {stable,releaseSha} from '../../content-studio/src/scoped-content-release.mjs';
const core=path.resolve(import.meta.dirname,'../..'),pub=path.resolve(core,'../dovanos-memorycasting');
const dir=path.join(import.meta.dirname,'qa/editorial-depth-20261026');
process.env.STUDIO_DATA_DIR=path.join(import.meta.dirname,'studio-data');
process.env.STUDIO_OUTPUT_DIR=path.join(import.meta.dirname,'studio-output');
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
process.env.STUDIO_NETWORK_SETTINGS=pub+'/config/niche-network.json';
const m=await import(pathToFileURL(core+'/content-studio/src/model.mjs'));
const baselinePath=dir+'/baseline-content-package.private.json',bytes=await fs.readFile(baselinePath);
const baselineSha='b02879f7df3fdc9207248e3f45775a0f3e3f90ce88f1f525ae4c10e94c89a4dc';
assert.equal(releaseSha(bytes),baselineSha);
const pkg=JSON.parse(bytes),changes=editorialDepthChanges(pkg),ids=changes.map(c=>c.id),selected=new Set(ids);
const mode=process.argv[2];assert.ok(['draft','release'].includes(mode));
const before=await m.getSite('memocasting');
if(mode==='draft'){
 assert.equal((await m.listJobs()).filter(j=>['queued','running'].includes(j.status)).length,0,'Foreign active Studio job');
 for(const c of changes)assert.equal(m.revisionHash(before.pages.find(p=>p.id===c.id)),c.expectedRevisionHash,c.slug+' changed before draft');
 await fs.writeFile(dir+'/before-native.private.json',JSON.stringify(before,null,2),{flag:'wx'});
 for(const c of changes)await m.editPage('memocasting',c.id,c.input);
 await m.finalizeInternalLinks('memocasting',ids);
 const after=await m.getSite('memocasting');
 for(const c of changes){const p=after.pages.find(p=>p.id===c.id),old=before.pages.find(p=>p.id===c.id);assert.equal(stable(p.body),stable(c.input.body),'Body normalization lost content');assert.equal(stable(p.publishedRevision),stable(old.publishedRevision),'Draft changed approved snapshot');assert.equal(p.publishAt,old.publishAt);}
 for(const p of before.pages.filter(p=>!selected.has(p.id)))assert.equal(stable(p),stable(after.pages.find(q=>q.id===p.id)),'Unselected draft changed');
 const rows=ids.map(id=>{const p=after.pages.find(p=>p.id===id);return {id,slug:p.slug,revisionHash:m.revisionHash(p),publishAt:p.publishAt};});
 await fs.writeFile(dir+'/drafts.private.json',JSON.stringify(rows,null,2));
 console.log(JSON.stringify({state:'drafted-not-approved',count:rows.length,unchangedOtherDrafts:after.pages.length-rows.length}));
}else{
 const rows=JSON.parse(await fs.readFile(dir+'/drafts.private.json','utf8'));
 const reviews=JSON.parse(await fs.readFile(dir+'/review-evidence.private.json','utf8'));assert.equal(reviews.length,12);
 for(const row of rows){const r=reviews.find(r=>r.pageId===row.id);assert.ok(r,'Missing actual review');assert.equal(r.revisionHash,row.revisionHash);assert.equal(m.revisionHash(before.pages.find(p=>p.id===row.id)),row.revisionHash);await m.recordEditorialReview('memocasting',row.id,{revisionHash:row.revisionHash,reviewer:'Codex owner-requested full Lithuanian self-review',evidence:r.evidence});}
 await m.approveReviewedOverlay('memocasting',{basePackagePath:baselinePath,expectedBasePackageSha256:baselineSha,pageIds:ids,expectedRevisionHashes:Object.fromEntries(rows.map(r=>[r.id,r.revisionHash]))},'owner-authorized-editorial-depth-20261026');
 const releaseDir=path.join(import.meta.dirname,'studio-output/releases/memocasting/5be826b7-33ee-40c6-8f05-f7ed24b48f8c');
 const manifest=JSON.parse(await fs.readFile(releaseDir+'/release-manifest.json','utf8'));assert.equal(manifest.packageSha256,baselineSha);
 const provider=JSON.parse(await fs.readFile(dir+'/provider-before.private.json','utf8')),deployment=provider.workers['memocasting-site'].deployments.deployments[0];
 assert.equal(deployment.versions.length,1);assert.equal(deployment.versions[0].percentage,100);
 const result=await m.releaseReviewedOverlay('memocasting',{basePackagePath:baselinePath,expectedBasePackageSha256:baselineSha,baseAssetsDirectory:releaseDir+'/assets',expectedBaseAssets:manifest.assets,expectedBaseAssetsSha256:releaseSha(stable(manifest.assets)),pageIds:ids,baselineEvidence:{sourceVersion:deployment.versions[0].version_id,deploymentId:deployment.id,observedAt:provider.observedAt}});
 const after=await m.getSite('memocasting');
 const original=JSON.parse(await fs.readFile(dir+'/before-native.private.json','utf8'));
 for(const p of original.pages.filter(p=>!selected.has(p.id)))assert.equal(stable(p),stable(after.pages.find(q=>q.id===p.id)),'Unselected draft changed during release');
 await fs.writeFile(dir+'/release.private.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}
