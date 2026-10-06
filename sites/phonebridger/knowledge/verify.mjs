import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('.',import.meta.url)),core=path.resolve(here,'../../../../dovanos-memorycasting');
const runtime=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Supply actual homepage source.');
const {projectPublicPages}=await import(pathToFileURL(path.join(core,'lib/niche-links.mjs')).href);
const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')).href);
const {nicheSchemaGraph}=await import(pathToFileURL(path.join(core,'lib/niche-schema-core.mjs')).href);
const pkg=validateContentPackage(JSON.parse(await readFile(path.join(here,'package/content-package.json'),'utf8')));
const settings=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8'));
const pages=projectPublicPages(pkg,[pkg],settings),now=Date.parse(pkg.generatedAt);
assert.equal(pages.length,14);assert.equal(pages.filter(p=>p.type==='guide').length,4);
for(const slug of ['login','register','account','recover'])assert.ok(!pages.some(p=>p.slug===slug));
const changed=structuredClone(pkg);changed.pages[0].body[0].text+=' invalid edit';assert.throws(()=>validateContentPackage(changed));
for(const state of ['future','revoked']){
 const clone=structuredClone(pkg),removed=clone.pages.find(p=>p.type==='guide');
 if(state==='future')removed.publishAt='2099-01-01T00:00:00Z';else removed.approval=null;
 const selected=projectPublicPages(clone,[clone],settings,now);
 assert.ok(!selected.some(p=>p.id===removed.id));assert.ok(selected.every(p=>p.links.every(l=>l.targetPageId!==removed.id)));
}
const base='http://127.0.0.1:4177/design/website/homepage/';let links=0,variants=0;
for(const page of pages.filter(p=>p.slug)){
 const response=await fetch(base+page.slug+'/');assert.equal(response.status,200,page.slug);assert.match(response.headers.get('x-robots-tag'),/noindex/);
 const html=await response.text();assert.equal((html.match(/<h1\b/g)||[]).length,1,page.slug);
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.deepEqual(graph,nicheSchemaGraph(pkg,page,pages,'MB Pinet'));
 assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
 if(page.type==='guide'){
  const prose=html.match(/<article class="guide-prose">([\s\S]*?)<\/article>/)[1];
  for(const link of page.links){
   if(!page.body.some(block=>[block.text||'',...(block.items||[])].some(text=>text.includes(link.label))))continue;
   const label=link.label.replaceAll('&','&amp;').replaceAll("'",'&#39;');
   assert.ok(prose.includes(`>${label}</a>`),`${page.slug}: contextual prose link missing: ${link.label}`);
  }
  for(const block of page.body){const plain=html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ');if(block.type==='heading')assert.ok(plain.includes(block.text),`${page.slug}: heading dropped`);if(block.type==='list')for(const text of block.items)assert.ok(plain.includes(text),`${page.slug}: list dropped`);}
  assert.ok(html.includes('MB Pinet'));assert.equal(page.media.length,5);
  assert.ok(html.includes('srcset='));assert.equal((html.match(/<figure/g)||[]).length,1);
 }
 const url=new URL(page.slug+'/',base);
 for(const match of html.matchAll(/href="([^"]+)"/g)){
  const target=new URL(match[1].replaceAll('&amp;','&'),url);
  if(target.origin!==url.origin)continue;
  if(target.hash&&target.pathname===url.pathname){assert.ok(html.includes(`id="${target.hash.slice(1)}"`),target.href);continue;}
  if(/\.(?:css|svg|ttf)$/.test(target.pathname)||target.pathname.includes('/release/'))continue;
  const r=await fetch(target,{method:'HEAD'});assert.equal(r.status,200,target.href);links++;
 }
}
for(const asset of new Map(pkg.pages.flatMap(p=>p.media.map(m=>[m.id,m]))).values()){
 const r=await fetch(base+asset.src.slice(1));assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/webp/);variants++;
}
for(const hidden of ['missing-guide/','guides/future/','knowledge/package/content-package.json','content-assets/phonebridger/../secret.json'])assert.equal((await fetch(base+hidden)).status,404);
for(const filename of ['sitemap.xml','llms.txt','llms-full.txt']){const r=await fetch(base+filename);assert.equal(r.status,200);assert.match(r.headers.get('x-robots-tag'),/noindex/);const text=await r.text();assert.ok(text.includes('https://phonebridger.com'));assert.ok(!text.includes('/account')&&!text.includes('/login')&&!text.includes('/register'));}
assert.equal(await (await fetch(base+'robots.txt')).text(),'User-agent: *\nDisallow: /\n');
const freeze=JSON.parse(await readFile(path.resolve(runtime,'../../source/site-pages-v1/frozen-files.json'),'utf8'));
for(const item of freeze){if(path.resolve(item.path)===path.join(runtime,'index.html'))continue;const bytes=await readFile(item.path);assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(),item.sha256,item.path);}
const outsideFooter=s=>s.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/,'FROZEN_FOOTER_REGION');
assert.equal(outsideFooter(await readFile(path.join(runtime,'index.html'),'utf8')),outsideFooter(await readFile(path.resolve(runtime,'../../source/site-pages-v1/index-before.html'),'utf8')));
const result={status:'PASS',preparedPages:pages.length,individualGuides:4,httpLinks:links,actualResponsiveMedia:variants,approvedEditRejected:true,futureRevokedLinksHidden:true,privateUrls404:true,accountsExcluded:true,homepageOutsideFooterUnchanged:true,frozenFiles:freeze.length,productionPublication:false};
await mkdir(path.join(here,'../qa/knowledge-v1'),{recursive:true});await writeFile(path.join(here,'../qa/knowledge-v1/verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
