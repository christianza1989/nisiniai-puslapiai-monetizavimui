import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {pathToFileURL} from 'node:url';
import {composeReviewedOverlay,assertScopedDiff} from '../src/scoped-content-release.mjs';
import {verifyContentRelease} from '../src/content-release.mjs';
const fixtureRoot=path.resolve(import.meta.dirname,'../../output/test-tmp');await mkdir(fixtureRoot,{recursive:true});
const workspace=await mkdtemp(path.join(fixtureRoot,'reviewed-overlay-'));
process.env.STUDIO_DATA_DIR=path.join(workspace,'data');process.env.STUDIO_OUTPUT_DIR=path.join(workspace,'output');
const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR||path.resolve(import.meta.dirname,'../../../dovanos-memorycasting');
const {validateContentPackage}=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
const {projectPublicPages}=await import(pathToFileURL(path.join(publicRoot,'lib/niche-links.mjs')));
const model=await import('../src/model.mjs');await model.initialize();
const areas=['usefulness','facts','sources','media','links','presentation'];
async function review(siteId,p){await model.recordEditorialReview(siteId,p.id,{reviewer:'isolated-scoped-fixture',revisionHash:model.revisionHash(p),evidence:Object.fromEntries(areas.map(a=>[a,'Synthetic scoped-release '+a+' evidence; not a real source, medical claim or UI review.']))});}
const s=await model.createSite({siteId:'overlay-fixture',canonicalHost:'overlay-fixture.example',name:'Scoped synthetic fixture',offer:'Original synthetic public envelope'});
await model.editSite(s.id,{facts:'Isolated synthetic fixture facts, no real business or source claims.'});
const raster=await sharp({create:{width:32,height:24,channels:3,background:'#123456'}}).png().toBuffer();const asset=await model.saveResponsiveAsset(s.id,{mime:'image/png',alt:'Synthetic fixture pixels',rights:'Only an isolated test asset'},raster);
const original=[];for(const [slug,type]of [['','home'],['accepted-page','service'],['held-future','guide']]){let p=await model.addPage(s.id,{slug,type,title:'Original synthetic page',description:'Synthetic retained baseline.',intent:'Isolated data-scope fixture.',publishAt:slug==='held-future'?'2099-01-01T10:00:00.000Z':'2020-01-01T10:00:00.000Z',body:[{type:'paragraph',text:'Original isolated fixture text explains that the baseline includes a reviewed page, a separate homepage draft and a paused future guide. It contains no user data or actual business claims.'}]});if(type==='guide')p=await model.editPage(s.id,p.id,{media:[{id:asset.id}]});await review(s.id,p);original.push(p);}
await model.approveReviewedBatch(s.id,original.map(p=>p.id),'synthetic-actor');const first=await model.releaseContent(s.id),baseBytes=await readFile(first.path),base=JSON.parse(baseBytes);
const edited=await model.editPage(s.id,original[1].id,{title:'Reviewed selected update',body:[{type:'paragraph',text:'A complete new isolated selected answer replaces only this reviewed page. It is distinct from the baseline and must not adopt the unaccepted homepage draft or alter future publication rules.'}]});await review(s.id,edited);await model.approveReviewedBatch(s.id,[edited.id],'synthetic-actor');
await model.editPage(s.id,original[0].id,{body:[{type:'paragraph',text:'Unaccepted homepage draft must never replace baseline.'}]});
await model.editSite(s.id,{offer:'Unaccepted changed private offer'});
// Context changes require a genuine new selected review/approval as usual.
const selected=(await model.getSite(s.id)).pages.find(p=>p.id===edited.id);await review(s.id,selected);await model.approveReviewedBatch(s.id,[selected.id],'synthetic-actor');
const firstManifest=JSON.parse(await readFile(first.manifestPath));
const {releaseSha}=await import('../src/scoped-content-release.mjs');
const input={pageIds:[selected.id],basePackagePath:first.path,expectedBasePackageSha256:first.packageSha256,expectedBaseAssets:firstManifest.assets,expectedBaseAssetsSha256:releaseSha(model.stable(firstManifest.assets)),baseAssetsDirectory:path.join(path.dirname(first.path),'assets'),baselineEvidence:{sourceVersion:'synthetic-pinned-source',deploymentId:'synthetic-observed-deployment',observedAt:new Date().toISOString()}};
let scoped;
test('scoped release preserves unselected drafts and entire public envelope; full release still refuses them',async()=>{
 await assert.rejects(()=>model.releaseContent(s.id),/peržiūros/);
 scoped=await model.releaseReviewedOverlay(s.id,input);const result=JSON.parse(await readFile(scoped.path));assert.deepEqual(result.site,base.site);assert.deepEqual(result.pages[0],base.pages[0]);assert.deepEqual(result.pages[2],base.pages[2]);assert.notDeepEqual(result.pages[1],base.pages[1]);
 const manifest=JSON.parse(await readFile(scoped.manifestPath));assert.equal(manifest.pages[0].review,undefined);assert.equal(manifest.pages[0].inheritedApproval.kind,'pinned-baseline');assert.equal(manifest.pages[1].review.revisionHash,result.pages[1].revisionHash);
 assert.equal((await verifyContentRelease(path.dirname(scoped.path),validateContentPackage)).state,'verified-export-not-deployed');
 const cutoff={guidePublicationPausedAtBySite:{[s.id]:'2020-01-02T00:00:00.000Z'}};
 assert.equal(projectPublicPages(result,[result],cutoff,Date.parse('2100-01-01')).some(p=>p.id===original[2].id),false,'future guide stays paused even after its date');
 assert.deepEqual(projectPublicPages(result,[result],cutoff,Date.parse('2100-01-01')).map(p=>p.id),projectPublicPages(base,[base],cutoff,Date.parse('2100-01-01')).map(p=>p.id),'publication remains the common projection decision');
});
test('baseline media changed before release and wrong pinned inventory are rejected',async()=>{
 const file=path.join(input.baseAssetsDirectory,firstManifest.assets[0].name),bytes=await readFile(file);
 await writeFile(file,'unapproved overwritten baseline image');
 try{await assert.rejects(()=>model.releaseReviewedOverlay(s.id,input),/baseline media bytes/);}finally{await writeFile(file,bytes);}
 await assert.rejects(()=>model.releaseReviewedOverlay(s.id,{...input,expectedBaseAssets:[]}),/media inventory/);
 await assert.rejects(()=>model.releaseReviewedOverlay(s.id,{...input,expectedBaseAssetsSha256:'0'.repeat(64)}),/inventory hash/);
});
test('baseline identity/hash, selected scope, and current review cannot be bypassed',async()=>{
 await assert.rejects(()=>model.releaseReviewedOverlay(s.id,{...input,expectedBasePackageSha256:'0'.repeat(64)}),/baseline/);
 await assert.rejects(()=>model.releaseReviewedOverlay(s.id,{...input,pageIds:[selected.id,selected.id]}),/unique/);
 await assert.rejects(()=>model.releaseReviewedOverlay(s.id,{...input,pageIds:['missing-id']}),/Unknown/);
 const site=await model.getSite(s.id);assert.throws(()=>composeReviewedOverlay({...site,id:'another-site'},base,[selected.id],model.revisionHash,validateContentPackage),/identity/);
 const stale=structuredClone(site);stale.pages.find(p=>p.id===selected.id).description='Unreviewed draft change';assert.throws(()=>composeReviewedOverlay(stale,base,[selected.id],model.revisionHash,validateContentPackage),/peržiūros/);
 const dep=structuredClone(site);dep.pages.find(p=>p.id===selected.id).links=[{targetPageId:'not-in-baseline',label:'Invalid target'}];assert.throws(()=>composeReviewedOverlay(dep,base,[selected.id],model.revisionHash,validateContentPackage));
});
test('scope verifier rejects unselected page/site/date/URL changes and fake inherited reviews',async()=>{
 const pkg=JSON.parse(await readFile(scoped.path));for(const mutate of [p=>p.site.offer='Drift',p=>p.pages[0].title='Drift',p=>p.pages[1].slug='renamed',p=>p.pages[1].publishAt='2021-01-01T00:00:00.000Z']){const changed=structuredClone(pkg);mutate(changed);assert.throws(()=>assertScopedDiff(base,changed,[selected.id]));}
 assert.throws(()=>assertScopedDiff({...base,schemaVersion:2},{...pkg,schemaVersion:2},[selected.id]),/V2/);
 const dir=path.dirname(scoped.path),manifest=JSON.parse(await readFile(scoped.manifestPath));const bad=structuredClone(manifest);bad.pages[0].review={revisionHash:pkg.pages[0].revisionHash};await writeFile(scoped.manifestPath,JSON.stringify(bad));await assert.rejects(()=>verifyContentRelease(dir,validateContentPackage),/fake fresh review/);await writeFile(scoped.manifestPath,JSON.stringify(manifest));
 const saved=await readFile(path.join(dir,'baseline-content-package.json'));await writeFile(path.join(dir,'baseline-content-package.json'),'tampered');await assert.rejects(()=>verifyContentRelease(dir,validateContentPackage),/baseline bytes/);await writeFile(path.join(dir,'baseline-content-package.json'),saved);
});
test('a new selected image requires a new genuine review and approval, and retains baseline images',async()=>{
 const pixels=await sharp({create:{width:40,height:30,channels:3,background:'#abcdef'}}).png().toBuffer();
 const added=await model.saveResponsiveAsset(s.id,{mime:'image/png',alt:'New selected synthetic image',rights:'Isolated test only'},pixels);
 const updated=await model.editPage(s.id,selected.id,{media:[{id:added.id}]});
 await assert.rejects(()=>model.releaseReviewedOverlay(s.id,input),/peržiūros/);
 await review(s.id,updated);await model.approveReviewedBatch(s.id,[selected.id],'synthetic-actor');
 const fresh=await model.releaseReviewedOverlay(s.id,input),manifest=JSON.parse(await readFile(fresh.manifestPath));
 for(const asset of firstManifest.assets)assert.deepEqual(manifest.assets.find(a=>a.name===asset.name),asset);
 assert.ok(manifest.assets.length>firstManifest.assets.length);
 assert.equal((await verifyContentRelease(path.dirname(fresh.path),validateContentPackage)).state,'verified-export-not-deployed');
});
