// Dedicated private studio copy + generated preview data; never modifies approved source.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url),qa=new URL('qa/lifecycle/',root);
const generated=new URL('../../../dovanos-memorycasting/lib/generated/content-packages.json',root);
const phase=process.argv[2];await mkdir(qa,{recursive:true});
if(phase==='restore'){await writeFile(generated,await readFile(new URL('generated.backup.json',qa)));console.log('Restored exact generated package bytes.');process.exit(0);}
if(phase==='prepare'){
 await writeFile(new URL('generated.backup.json',qa),await readFile(generated));
 await cp(new URL('studio-data/',root),new URL('studio-data/',qa),{recursive:true});
}
process.env.STUDIO_DATA_DIR=fileURLToPath(new URL('studio-data/',qa));
process.env.STUDIO_OUTPUT_DIR=fileURLToPath(new URL('studio-output/',qa));
const m=await import('../../content-studio/src/model.mjs');
let site=await m.getSite('memocasting'),page=site.pages.find(p=>p.slug==='gidai/liejinio-dazymas-ir-prieziura');
const reviews=JSON.parse(await readFile(new URL('EDITORIAL-REVIEW.private.json',root)));
async function review(p){const old=reviews.find(r=>r.slug===p.slug);assert.ok(old);await m.recordEditorialReview(site.id,p.id,{...old,revisionHash:m.revisionHash(p),evidence:{...old.evidence,presentation:'Isolated lifecycle copy only. Original full text reviewed in current task; this QA changes publication date, removes incoming links for revocation or adds an explicit local QA correction marker. Not deployed or an actual new customer article.'}});}
if(phase==='prepare'){
 page=await m.editPage(site.id,page.id,{publishAt:new Date(Date.now()+90000).toISOString()});await review(page);await m.approveReviewedBatch(site.id,[page.id],'memocasting-lifecycle-qa');
}else if(phase==='correct'){
 page=await m.editPage(site.id,page.id,{description:page.description+' Vietinės QA kopijos pataisa.'});await review(page);await m.approveReviewedBatch(site.id,[page.id],'memocasting-lifecycle-qa');
}else if(phase==='revoke'){
 const incoming=site.pages.filter(p=>p.publishedRevision?.links?.some(l=>l.targetPageId===page.id));
 for(const p of incoming){const edited=await m.editPage(site.id,p.id,{links:p.links.filter(l=>l.targetPageId!==page.id)});await review(edited);}
 if(incoming.length)await m.approveReviewedBatch(site.id,incoming.map(p=>p.id),'memocasting-lifecycle-qa');
 await m.revokePage(site.id,page.id);
}else if(phase!=='project')throw Error('prepare / correct / revoke / project / restore');
site=await m.getSite(site.id);const pkg=m.packageForSite(site);
const all=JSON.parse(await readFile(new URL('generated.backup.json',qa)));all[all.findIndex(p=>p.siteId===site.id)]=pkg;
await writeFile(generated,JSON.stringify(all));await writeFile(new URL('state.json',qa),JSON.stringify({phase,publishAt:page.publishAt,slug:page.slug,pageId:page.id,packagePages:pkg.pages.length}));
console.log(JSON.stringify({phase,publishAt:page.publishAt,slug:page.slug,packagePages:pkg.pages.length}));
