import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {v2Fixture} from './fixtures/v2.mjs';
import {validateV2Package,v2RevisionHash,normalizeV2Blocks,bodyPlainText} from '../src/content-package-v2.mjs';
const publicRoot=path.resolve(process.env.STUDIO_PUBLIC_CORE_DIR || fileURLToPath(new URL('../../../dovanos-memorycasting/',import.meta.url)));
const publicCore=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
const root=await mkdtemp(path.join(os.tmpdir(),'niche-v2-'));
process.env.STUDIO_DATA_DIR=path.join(root,'data');process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
process.env.STUDIO_PORT='4329';
const model=await import('../src/model.mjs');
await model.initialize();

test('v2 validator/hash/schema copies match; v1 packages remain readable unchanged',async()=>{
  assert.equal(await readFile(new URL('../src/content-package-v2.mjs',import.meta.url),'utf8'),await readFile(path.join(publicRoot,'scripts/content-package-v2.mjs'),'utf8'));
  assert.equal(await readFile(new URL('../schemas/content-package.v2.schema.json',import.meta.url),'utf8'),await readFile(path.join(publicRoot,'schemas/content-package.v2.schema.json'),'utf8'));
  const packages=JSON.parse(await readFile(path.join(publicRoot,'lib/generated/content-packages.json'),'utf8'));
  const directories=await readdir(path.join(publicRoot,'content-packages'),{withFileTypes:true});
  const sourcePackages=await Promise.all(directories.filter(d=>d.isDirectory()).map(d=>readFile(path.join(publicRoot,'content-packages',d.name,'content-package.json'),'utf8').then(JSON.parse)));
  const legacy=packages.filter(p=>p.schemaVersion===1);
  assert.ok(legacy.length>0,'current registry must contain legacy packages');
  assert.deepEqual(legacy.map(p=>p.siteId).sort(),sourcePackages.filter(p=>p.schemaVersion===1).map(p=>p.siteId).sort(),'all current V1 source packages remain compiled');
  for(const p of legacy){const source=sourcePackages.find(s=>s.siteId===p.siteId);assert.deepEqual(p,source,'compile preserves the exact source package');assert.equal(publicCore.validateContentPackage(p),p);for(const page of p.pages)assert.equal(model.revisionHash(page),publicCore.pageRevisionHash(page));}
  const pkg=v2Fixture();assert.equal(validateV2Package(pkg),pkg);assert.equal(publicCore.validateContentPackage(pkg),pkg);
});
test('every editorial/public field changes approval hash; unknown/private/cross-site data rejected',()=>{
  const fixture=v2Fixture();
  const edits=[p=>p.id+='-edited',p=>p.body[0].content[1].target.pageId='different',p=>p.body[0].content.reverse(),p=>p.editorial.authors[0].bio='Changed',p=>p.editorial.sources[0].title='Changed',p=>p.editorial.datePublished='2026-09-01T00:00:00.000Z',p=>p.editorial.dateModified='2026-10-03T00:00:00.000Z',p=>p.editorial.productRecommendation=true,p=>p.siteSnapshot.contact.email='different@example.org',p=>p.publishAt='2026-10-24T04:30:00.000Z'];
  for(const edit of edits){const pkg=structuredClone(fixture);edit(pkg.pages[0]);assert.notEqual(v2RevisionHash(pkg.pages[0]),fixture.pages[0].revisionHash);assert.throws(()=>validateV2Package(pkg));}
  for(const edit of [p=>p.editorial.sources[0].public=false,p=>p.editorial.authors[0].siteId='another-site',p=>p.editorial.extra='Unhashed?',p=>p.publishAt='2026-02-30T00:00:00.000Z',p=>p.body[0].content[1].target={kind:'external',url:'javascript:alert(1)'}]){
    const pkg=structuredClone(fixture);edit(pkg.pages[0]);pkg.pages[0].revisionHash=v2RevisionHash(pkg.pages[0]);pkg.pages[0].approval.revisionHash=pkg.pages[0].revisionHash;assert.throws(()=>validateV2Package(pkg));
  }
  assert.throws(()=>normalizeV2Blocks([{type:'richParagraph',content:[{type:'text',text:'x'.repeat(12001)}]}]));
});
test('studio v2 stable IDs, UTC dates, metadata round trip and site contact binding',async()=>{
  const fixture=v2Fixture();
  const site=await model.createSite({canonicalHost:fixture.canonicalHost,name:fixture.site.name,offer:fixture.site.offer,schemaVersion:2,renderer:'gift'});
  await model.editSite(site.id,{facts:'Bandomasis fixture. Ne tikras verslas.'});
  for(const source of fixture.pages){await model.addPage(site.id,source);}
  for(const source of fixture.pages)await model.approvePage(site.id,source.id,'fixture-editor');
  let pkg=model.packageForSite(await model.getSite(site.id));assert.equal(pkg.schemaVersion,2);publicCore.validateContentPackage(pkg);
  const a=pkg.pages[1];assert.equal(a.id,'gift-article-1');assert.equal(a.slug,'straipsniai/bandomasis-gidas');assert.equal(a.publishAt,'2026-10-23T04:30:00.000Z');assert.deepEqual(a.editorial,fixture.pages[1].editorial);assert.deepEqual(a.body,fixture.pages[1].body);
  assert.equal(model.isPublic(a,Date.parse(a.publishAt)-1),false);assert.equal(model.isPublic(a,Date.parse(a.publishAt)),true);
  await model.editPage(site.id,a.id,{editorial:{...a.editorial,category:'New draft'}});
  pkg=model.packageForSite(await model.getSite(site.id));assert.equal(pkg.pages[1].editorial.category,'Testas');
  const exported=await model.exportPackage(site.id);assert.equal(JSON.parse(await readFile(exported.path,'utf8')).schemaVersion,2);
  await model.editSite(site.id,{contact:{email:'changed@example.org',phone:''}});
  const changedSite=await model.getSite(site.id);
  assert.throws(()=>model.packageForSite(changedSite),/siteSnapshot mismatch/);
  assert.match(bodyPlainText(a.body),/gidas ir antras gidas/);
});
test('v2 normal importer refuses activation; explicit shadow does not touch compiled bytes',async()=>{
  // Run the actual scripts in a tiny isolated public-repo layout, no real staging mutation.
  const isolated=path.join(root,'public');await mkdir(path.join(isolated,'scripts'),{recursive:true});await mkdir(path.join(isolated,'schemas'),{recursive:true});
  for(const file of ['content-package-core.mjs','content-package-v2.mjs','content-v2-admission.mjs','import-content-package.mjs','compile-content-packages.mjs'])await writeFile(path.join(isolated,'scripts',file),await readFile(path.join(publicRoot,'scripts',file)));
  await writeFile(path.join(isolated,'schemas/content-package.v2.schema.json'),await readFile(path.join(publicRoot,'schemas/content-package.v2.schema.json')));
  const source=path.join(root,'export');await mkdir(source,{recursive:true});await writeFile(path.join(source,'content-package.json'),JSON.stringify(v2Fixture()));
  const before=await readFile(path.join(publicRoot,'lib/generated/content-packages.json'));
  const rejected=spawnSync(process.execPath,[path.join(isolated,'scripts/import-content-package.mjs'),source],{encoding:'utf8'});assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/--shadow/);
  const accepted=spawnSync(process.execPath,[path.join(isolated,'scripts/import-content-package.mjs'),source,'--shadow'],{encoding:'utf8'});assert.equal(accepted.status,0,accepted.stderr);
  assert.equal(JSON.parse(await readFile(path.join(isolated,'content-staging/v2-fixture/content-package.json'),'utf8')).schemaVersion,2);
  assert.deepEqual(await readFile(path.join(publicRoot,'lib/generated/content-packages.json')),before);
  await mkdir(path.join(isolated,'content-packages/v2-fixture'),{recursive:true});await writeFile(path.join(isolated,'content-packages/v2-fixture/content-package.json'),JSON.stringify(v2Fixture()));
  const compile=spawnSync(process.execPath,[path.join(isolated,'scripts/compile-content-packages.mjs')],{encoding:'utf8'});assert.notEqual(compile.status,0);assert.match(compile.stderr,/gated/);
});
test('HTTP v2 draft preview escapes HTML, keeps exact links and generator cannot flatten it',async()=>{
  const {createServer}=await import('../src/server.mjs');
  const server=await createServer();await new Promise(resolve=>server.listen(4329,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const page=(await model.getSite('v2-fixture')).pages[1];
    await model.editPage('v2-fixture',page.id,{body:[...page.body,{type:'richHeading',level:2,content:[{type:'text',text:'<script>alert(1)</script>'}]},{type:'richList',ordered:true,items:[[{type:'text',text:'Pirmas'}],[{type:'text',text:'Antras'}]]}]});
    const response=await fetch(`${base}/preview/v2-fixture/${page.id}`);const html=await response.text();
    assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(html,/&lt;script&gt;alert/);assert.doesNotMatch(html,/<script>alert/);
    assert.equal((html.match(/href="\/preview\/v2-fixture\/gift-article-1"/g)||[]).length,2);assert.match(html,/<ol><li>Pirmas<\/li><li>Antras<\/li><\/ol>/);
    const generated=await fetch(`${base}/api/sites/v2-fixture/pages/${page.id}/generate`,{method:'POST',headers:{'content-type':'application/json','x-studio-request':'1'},body:'{}'});assert.equal(generated.status,400);assert.match((await generated.json()).error,/V2 generavimo/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test.after(async()=>{await rm(root,{recursive:true,force:true});});
