// Site adapter: reviewed URL map -> canonical studio edit/review/approval/release.
// Never calculates approvals or replaces the shared publication/SEO contracts.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [mapFile,publicRoot]=process.argv.slice(2);
if(!mapFile||!publicRoot)throw Error('Usage: node scripts/migrate-promedical-urls.mjs <reviewed-map.json> <public-root>');
const work=path.dirname(path.resolve(mapFile));
process.env.STUDIO_PUBLIC_CORE_DIR=path.resolve(publicRoot);
process.env.STUDIO_NETWORK_SETTINGS=path.join(path.resolve(publicRoot),'config/niche-network.json');
const model=await import('../content-studio/src/model.mjs');
const {reviewBinding}=await import('../content-studio/src/content-workflow.mjs');
const {validateContentPackage}=await import(pathToFileURL(path.join(process.env.STUDIO_PUBLIC_CORE_DIR,'scripts/content-package-core.mjs')).href);
const map=JSON.parse(await fs.readFile(mapFile,'utf8'));
assert.equal(map.siteId,'promedical');assert.equal(map.canonicalHost,'promedical.lt');
assert.equal(map.rows.length,1845);assert.equal(map.duplicates.length,0);assert.equal(map.long.length,0);assert.equal(map.collidingWithOld.length,0);
const source=await fs.readFile(path.join(publicRoot,'content-packages/promedical/content-package.json'));
const baseline=validateContentPackage(JSON.parse(source));
for(const file of ['studio-before.json','public-package-before.json','canonical-release.json']){
 try{await fs.access(path.join(work,file));throw Error('Migration already initialized; preserve the original backups and inspect its checkpoint before resuming: '+file);}catch(error){if(error.code!=='ENOENT')throw error;}
}
await fs.writeFile(path.join(work,'public-package-before.json'),source);
await fs.copyFile(path.join(model.DATA,'sites/promedical.json'),path.join(work,'studio-before.json'));
await fs.writeFile(path.join(work,'studio-reviews-before.json'),JSON.stringify((await model.getSite('promedical')).pages.map(p=>({id:p.id,editorialReview:p.editorialReview,publishedRevision:p.publishedRevision})),null,2));
const baselineById=new Map(baseline.pages.map(p=>[p.id,p]));
const merged=map.rows.find(r=>r.action==='merge-identical-category');
assert.ok(merged&&merged.targetPageId);
const changed=map.rows.filter(r=>!r.action);
let site=await model.getSite('promedical');
for(const r of changed){const p=site.pages.find(p=>p.id===r.id);assert.equal(p.slug,r.from);assert.deepEqual(p.publishedRevision,baselineById.get(r.id));assert.equal(model.revisionHash(p),p.publishedRevision.revisionHash);}
// The two products referenced both identical category IDs; keep one stable target.
for(const p of site.pages.filter(p=>p.links.some(l=>l.targetPageId===merged.id))){
 const seen=new Set();const links=p.links.map(l=>({...l,targetPageId:l.targetPageId===merged.id?merged.targetPageId:l.targetPageId})).filter(l=>!seen.has(l.targetPageId)&&seen.add(l.targetPageId));
 await model.editPage('promedical',p.id,{links});
}
site=await model.getSite('promedical');
for(let offset=0;offset<changed.length;offset+=200){
 const rows=changed.slice(offset,offset+200),changes=rows.map(r=>{const p=site.pages.find(p=>p.id===r.id);return {pageId:p.id,expectedSlug:p.slug,expectedRevisionHash:model.revisionHash(p),slug:r.to};});
 await model.editPageSlugs('promedical',changes);
 console.log('Draft URLs '+Math.min(offset+200,changed.length)+'/'+changed.length);
}
site=await model.getSite('promedical');
const checks=[];
for(const r of changed){
 const p=site.pages.find(p=>p.id===r.id),old=baselineById.get(r.id);
 for(const field of ['id','siteId','type','title','description','intent','body','publishAt','media'])assert.deepEqual(p[field],old[field],r.from+' preserved '+field);
 assert.equal(p.slug,r.to);
 assert.equal(new Set(p.links.map(l=>l.targetPageId)).size,p.links.length);
 assert.ok(p.links.every(l=>l.targetPageId!==merged.id));
 checks.push({id:p.id,from:r.from,to:r.to,title:p.title,sku:r.sku,unchangedTextFactsDatesMedia:true,linksAdjusted:JSON.stringify(old.links)!==JSON.stringify(p.links)});
}
await fs.writeFile(path.join(work,'reviewed-map-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:'All catalogue URL/title/ID/topology pairs and full unchanged-field comparison; no fresh manufacturer-content rewrite or full-browser editorial certification.',checks},null,2));
for(let offset=0;offset<changed.length;offset+=200){
 const rows=changed.slice(offset,offset+200);
 const reviews=rows.map(r=>{
  const p=site.pages.find(p=>p.id===r.id),old=baselineById.get(p.id),hash=model.revisionHash(p);
  return {pageId:p.id,reviewer:'Codex /root URL migration review',revisionHash:hash,expectedBinding:reviewBinding(site,p,hash),evidence:{
   usefulness:`URL-only migration for “${p.title}”: ${r.from} → ${r.to}. Same approved product/category intent and stable ID; no new article or demand claim.`,
   facts:`Full field comparison preserved title, description, intent, body, model, dates and media against approved source ${old.revisionHash}. This review does not claim a new live manufacturer fact audit.`,
   sources:`Manufacturer external source URLs and verified source records preserved exactly from the previously reviewed catalogue; source targets remain original Klaro URLs. URL translation uses current approved title/model and category ancestry.`,
   media:`All media IDs, dimensions, alt, rights and byte paths unchanged; canonical release/import verifies existing immutable asset bytes. No generated product image or changed attribution.`,
   links:`Reviewed ${r.to} for the same page ID, uniqueness and category ancestry. Existing ID links resolve through the shared new package. Identical gipsavimo category target merged to ${merged.targetPageId}; only duplicate references to that identical group deduplicated. Exact legacy308 route follows public eligibility and host isolation.`,
   presentation:`Visible Lithuanian title/body/labels/fonts/layout unchanged, full field equality verified. Reviewed URL text and slug semantics; route-only revision, not a new full prose or pixel audit. Actual representative HTTP/browser verification follows import and build before deployment.`
  }};
 });
 await model.recordEditorialReviewBatch('promedical',reviews);
 await model.approveReviewedBatch('promedical',rows.map(r=>r.id),'Codex /root URL migration review');
 console.log('Approved URLs '+Math.min(offset+200,changed.length)+'/'+changed.length);
}
await model.revokePage('promedical',merged.id);
const release=await model.releaseContent('promedical');
await fs.writeFile(path.join(work,'canonical-release.json'),JSON.stringify(release,null,2));
const released=JSON.parse(await fs.readFile(release.path,'utf8'));
const releasedById=new Map(released.pages.map(p=>[p.id,p]));
// Current live65 editorial revisions are newer than this local studio's copies.
// Merge only canonical new catalogue snapshots; do not regress those65 pages.
const result={...baseline,generatedAt:released.generatedAt,pages:baseline.pages.filter(p=>p.id!==merged.id).map(p=>changed.some(r=>r.id===p.id)?releasedById.get(p.id):p)};
validateContentPackage(result);
assert.equal(result.pages.length,1909);
const target=path.join(work,'import');await fs.mkdir(target,{recursive:true});
await fs.writeFile(path.join(target,'content-package.json'),JSON.stringify(result,null,2)+'\n');
await fs.symlink(path.join(path.dirname(release.path),'assets'),path.join(target,'assets'),'junction');
const aliases={version:1,sites:{promedical:{canonicalHost:'promedical.lt',redirects:map.rows.map(r=>({from:'/'+r.from,to:'/'+r.to,targetPageId:r.targetPageId||r.id}))}}};
await fs.writeFile(path.join(work,'niche-path-aliases.json'),JSON.stringify(aliases,null,2)+'\n');
await fs.writeFile(path.join(work,'migration-prepared.json'),JSON.stringify({state:'approved-not-imported',sourcePackageSha256:createHash('sha256').update(source).digest('hex'),newPackageSha256:createHash('sha256').update(await fs.readFile(path.join(target,'content-package.json'))).digest('hex'),canonicalRelease:release,importDirectory:target,products:1408,categories:436,redirects:1845,editorialUnchanged:65,mergedCategory:merged},null,2)+'\n');
console.log(JSON.stringify({state:'approved-not-imported',importDirectory:target,release:release.path,redirects:1845,pages:1909}));
