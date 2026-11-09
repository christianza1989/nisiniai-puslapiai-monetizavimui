// Read-only structural checks for unapproved private drafts. Not editorial approval.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const site=JSON.parse(await readFile(`${root}/memo-keywords-bulk-studio-20261109/studio-data/sites/memocasting.json`,'utf8'));
const base=JSON.parse(await readFile(`${root}/memo-keywords-public-20261109/content-packages/memocasting/content-package.json`,'utf8'));
const {memoIsGiftCollection}=await import(pathToFileURL(`${root}/memo-keywords-public-20261109/lib/memocasting-gift-collections.mjs`));
const {contextualParts}=await import(pathToFileURL(`${root}/memo-keywords-public-20261109/lib/niche-links.mjs`));
const pages=site.pages,byId=new Map(pages.map(p=>[p.id,p])),collections=pages.filter(memoIsGiftCollection);
assert.equal(collections.length,20);
const words=p=>p.body.flatMap(b=>[b.text||'',...(b.items||[])]).join(' ').match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length||0;
function renderedTargets(page){
 const links=page.links.map(l=>({label:l.label,href:'/'+byId.get(l.targetPageId)?.slug}));
 return new Set(page.body.flatMap(b=>[b.text||'',...(b.items||[])]).flatMap(text=>contextualParts(text,links).filter(p=>p.href).map(p=>p.href)));
}
for(const page of collections){
 assert.ok(words(page)>=1000,`${page.slug} has ${words(page)} words`);
 const incoming=pages.filter(p=>p.slug.startsWith('gidai/')&&renderedTargets(p).has('/'+page.slug));
 assert.ok(incoming.length,`${page.slug} missing contextual guide link`);
 const linked=renderedTargets(page);
 assert.ok(linked.has('/rinkinys-porai'),`${page.slug}: couple link missing`);
 assert.ok(linked.has('/seimos-rinkinys'),`${page.slug}: family link missing`);
}
for(const old of base.pages){
 const current=byId.get(old.id);assert.ok(current,old.slug);
 assert.equal(current.publishAt,old.publishAt,`${old.slug}: publishAt changed`);
}
const hub=pages.find(p=>p.slug==='dovanos');
const reached=renderedTargets(hub);
for(const page of collections){
 const path='/'+page.slug;
 if(!reached.has(path))assert.ok(collections.some(parent=>renderedTargets(parent).has(path)),`${page.slug}: no hub or parent route`);
}
console.log(JSON.stringify({collections:collections.length,wordCounts:collections.map(p=>({slug:p.slug,words:words(p)})),draftContextualLinks:'PASS (not hosted)',baselineDates:'PASS',notes:'Drafts remain unapproved; no editorial, browser, source or hosted review implied.'},null,2));
