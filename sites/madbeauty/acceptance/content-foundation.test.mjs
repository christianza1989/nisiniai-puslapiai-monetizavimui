import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,copyFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {TAXONOMY_NODES,taxonomyNode,matchesTaxonomy} from '../prototype/taxonomy.mjs';
import {CITIES} from '../prototype/cities.mjs';
import {planTarget,createContentTargetRegistry,resolveContentTarget,REGISTRY_TTL_MS} from '../prototype/content-targets.mjs';
import {catalogueRoute,renderCataloguePage} from '../prototype/catalogue-page.mjs';
import {createAppServer} from '../prototype/app-server.mjs';
import {openStore} from '../backend/store.mjs';
import {createApiHandler} from '../backend/http.mjs';
import {contentProjection} from '../content/adapter.mjs';
import {articleFixture,signFixture,createApprovedOffer,FIXTURE_NOW} from '../content-foundation-20261006/fixture.mjs';
import {commerceDestination} from '../../../../dovanos-memorycasting/lib/content-projection-v2.mjs';
const now=FIXTURE_NOW;

test('SSR sharing and GEO are projected from reviewed content, disappear before due time and use uncached HTTP responses',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-sharing-')),packagePath=path.join(dir,'content-package.json'),pkg=articleFixture(),article=pkg.pages[1];
 article.title='Manikiūras "pagal apimtį" & laiką';article.media=[{id:'share-image',src:'/content-assets/madbeauty/share.webp',width:1200,height:800,alt:'Nagų priežiūros iliustracija',rights:'Testinė iliustracija'}];article.editorial.featuredImageId='share-image';
 const author={...structuredClone(pkg.pages[0]),id:'fixture-author',type:'author',slug:'autoriai/fixture-editor',title:'Testinė redakcija'};pkg.pages.push(author);signFixture(pkg);await writeFile(packagePath,JSON.stringify(pkg));
 let current=now;const server=createAppServer({contentClock:()=>current,contentPackagePath:packagePath,contentDiscovery:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(origin+'/'+article.slug),html=await response.text();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(html,/property="og:title" content="Manikiūras &quot;pagal apimtį&quot; &amp; laiką"/);assert.match(html,/property="og:url" content="https:\/\/madbeauty.lt\/gidai\/katalogo-nuorodos-testas"/);assert.match(html,/property="og:image" content="https:\/\/madbeauty.lt\/content-assets\/madbeauty\/share.webp"/);assert.match(html,/article:published_time" content="2026-10-06T08:00:00Z/);assert.match(html,/twitter:image:alt" content="Nagų priežiūros iliustracija/);
  const full=await fetch(origin+'/llms-full.txt'),text=await full.text();assert.equal(full.headers.get('cache-control'),'no-store');assert.match(text,/Publikavimo data: 2026-10-06T08:00:00Z/);assert.match(text,/Autoriaus profilis: .*https:\/\/madbeauty.lt\/autoriai\/fixture-editor/);
  current=Date.parse(article.publishAt)-1;const future=await fetch(origin+'/'+article.slug);assert.equal(future.status,404);assert.doesNotMatch(await future.text(),/og:title|twitter:image|share.webp|article:published_time/);assert.doesNotMatch(await fetch(origin+'/llms-full.txt').then(r=>r.text()),/katalogo-nuorodos-testas|Autoriaus profilis:/);
  current=now;author.publishAt='2026-10-07T08:00:00Z';signFixture(pkg);await writeFile(packagePath,JSON.stringify(pkg));assert.doesNotMatch(await fetch(origin+'/llms-full.txt').then(r=>r.text()),/Autoriaus profilis:/);
  assert.doesNotMatch(await fetch(origin+'/paskyra').then(r=>r.text()),/og:image|article:published_time/);
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});

test('Madbeauty V2 shared schemas and visible breadcrumbs use the projected Gidai index and reviewed editorial dates',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-editorial-')),packagePath=path.join(dir,'content-package.json'),pkg=articleFixture();
 try{
  const index={...structuredClone(pkg.pages[0]),id:'fixture-index',type:'index',slug:'gidai',title:'Gidai'};pkg.pages.push(index);pkg.pages[1].editorial.datePublished='2026-10-06T22:35:02.542Z';pkg.pages[1].editorial.dateModified='2026-10-07T01:00:00Z';signFixture(pkg);await writeFile(packagePath,JSON.stringify(pkg));
  const content=await contentProjection({packagePath,now,registry:{targets:[]}}),article=content.pages.find(p=>p.id==='fixture-guide'),schemas=content.schema(article);
  assert.equal(schemas[0].datePublished,pkg.pages[1].editorial.datePublished);assert.equal(schemas[0].dateModified,pkg.pages[1].editorial.dateModified);assert.equal(schemas[0].author[0]['@type'],'Organization');assert.equal(schemas[0].reviewedBy,undefined);
  assert.deepEqual(schemas[1].itemListElement.map(x=>x.name),['Madbeauty','Gidai',article.title]);assert.equal(schemas[1].itemListElement[1].item,'https://madbeauty.lt/gidai');assert.match(content.html(article),/href="\/gidai">Gidai<\/a>/);assert.match(content.html(article),/datetime="2026-10-06T22:35:02.542Z">2026 m. spalio 7 d./);assert.match(content.html(article),/Atnaujinta <time datetime="2026-10-07T01:00:00Z">2026 m. spalio 7 d./);
  const collection=content.schema(content.pages.find(p=>p.id===index.id))[0];assert.equal(collection['@type'],'CollectionPage');assert.equal(collection.mainEntity.itemListElement.length,1);
  index.publishAt='2026-10-07T08:00:00Z';signFixture(pkg);await writeFile(packagePath,JSON.stringify(pkg));const future=await contentProjection({packagePath,now,registry:{targets:[]}}),due=future.pages.find(p=>p.id===article.id);
  assert.equal(future.schema(due)[1].itemListElement.length,2);assert.doesNotMatch(future.html(due),/href="\/gidai">Gidai<\/a>/);
 }finally{if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-editorial-'))await rm(dir,{recursive:true,force:true});}
});
test('New V2 release media is served from its immutable release, and future/unknown media stays404',async()=>{
 const f=fixture(),dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-v2-media-')),packagePath=path.join(dir,'content-package.json'),pkg=articleFixture();
 const initial=JSON.parse(await readFile(new URL('../content/initial-release/content-package.json',import.meta.url),'utf8')),m=initial.pages.find(p=>p.type==='guide').media[0],filename=path.basename(m.src);
 pkg.pages[1].media=[m];pkg.pages[1].editorial.featuredImageId=m.id;signFixture(pkg);await mkdir(path.join(dir,'assets'));await copyFile(new URL('../content/initial-release/assets/'+filename,import.meta.url),path.join(dir,'assets',filename));await writeFile(packagePath,JSON.stringify(pkg));
 const server=createAppServer({apiHandler:f.handler,contentClock:()=>now,contentPackagePath:packagePath});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const image=await fetch(origin+m.src);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');assert.ok((await image.arrayBuffer()).byteLength>100);
  const article=await fetch(origin+'/gidai/katalogo-nuorodos-testas').then(r=>r.text());assert.ok(article.includes(m.src));assert.match(article,/srcset=/);
  assert.equal((await fetch(origin+'/content-assets/madbeauty/unknown.webp')).status,404);
  pkg.pages[1].publishAt='2026-10-07T08:00:00Z';signFixture(pkg);await writeFile(packagePath,JSON.stringify(pkg));assert.equal((await fetch(origin+m.src)).status,404);assert.equal((await fetch(origin+'/gidai/katalogo-nuorodos-testas')).status,404);
 }finally{await new Promise(r=>server.close(r));f.store.close();}
});
function fixture(){const store=openStore({filename:':memory:',clock:()=>now,secret:'x'.repeat(64)}),handler=createApiHandler(store);return {store,handler,...createApprovedOffer(store,handler.platform,handler.auth)};}
test('Stable taxonomy/city IDs cover all planned procedures; aliases preserve meaning without guessing',()=>{
 assert.equal(TAXONOMY_NODES.filter(n=>n.kind==='treatment').length,225);assert.equal(CITIES.length,103);
 assert.equal(new Set(TAXONOMY_NODES.map(n=>n.id)).size,TAXONOMY_NODES.length);
 for(const n of TAXONOMY_NODES){const p=planTarget({taxonomyNodeId:n.id});assert.equal(p.canonicalPath,'/paslaugos/'+n.id);assert.ok(p.routeRegistryId.length<=100);assert.equal(p.deployed,false);}
 assert.equal(taxonomyNode('kirpimas').id,'kirpimai');assert.equal(matchesTaxonomy('kirpimas','kirpimai-moteru-kirpimas'),false);
 assert.equal(matchesTaxonomy('gelinis-lakavimas','nagai'),true);
 assert.equal(planTarget({taxonomyNodeId:'unknown'}),null);assert.equal(planTarget({taxonomyNodeId:'nagai',cityId:'unknown'}),null);
});
test('Functional CTA readiness is independent of indexing, public supply, deployment and expiry',()=>{
 const f=fixture();try{
  const offers=f.handler.platform.catalog({}),registry=createContentTargetRegistry({offers,deployed:true,now});
  const input={taxonomyNodeId:'lakavimas-gelinis-lakavimas',cityId:'vilnius'},ready=resolveContentTarget(input,registry,{now});
  assert.equal(ready.status,'ready');assert.equal(ready.indexEligible,false);assert.equal(ready.routeRegistryId,'mb:catalog:lakavimas-gelinis-lakavimas:vilnius');
  assert.equal(resolveContentTarget({...input,cityId:'kaunas'},registry,{now}).status,'unavailable');
  assert.equal(resolveContentTarget({...input,cityId:'kaunas'},registry,{now,fallbackNational:true}).cityId,null);
  assert.equal(resolveContentTarget(input,registry,{now:now+REGISTRY_TTL_MS}).status,'planned');
  assert.equal(createContentTargetRegistry({offers,now}).targets.length,0);
  const snapshot=articleFixture().pages[1].editorial.commerceTargets[0];assert.equal(commerceDestination(snapshot,registry,now),ready.canonicalUrl);
  for(const suffix of ['#time','?diena=1','?rikiuoti=kaina','?miestas=kaunas'])assert.equal(commerceDestination({...snapshot,url:snapshot.url+suffix},registry,now),null);
  assert.equal(commerceDestination(snapshot,createContentTargetRegistry({offers:[],deployed:true,now}),now),null);
  assert.ok(!JSON.stringify(registry).includes('content-fixture@example.com'));
 }finally{f.store.close();}
});
test('SSR national→city→real provider, empty-city404, unknown and inactive extensions never become supply',async()=>{
 const f=fixture(),server=createAppServer({apiHandler:f.handler,contentClock:()=>now});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal(f.handler.platform.catalog({taxonomyServiceId:'nagai',city:'Vilnius'})[0].id,f.service.id);
  assert.equal(f.handler.platform.catalog({taxonomyServiceId:'kirpimai-moteru-kirpimas'}).length,0);
  const national=await fetch(origin+'/paslaugos/nagai');assert.equal(national.status,200);const html=await national.text();assert.match(html,/href="\/paslaugos\/nagai\/vilnius"/);assert.match(html,/id="catalogue-city"/);assert.equal((html.match(/<option value="/g)||[]).length,104);assert.match(national.headers.get('x-robots-tag'),/noindex/);
  const local=await fetch(origin+'/paslaugos/lakavimas-gelinis-lakavimas/vilnius');assert.equal(local.status,200);assert.match(await local.text(),new RegExp('/meistrai/'+f.org.id));
  for(const url of ['/paslaugos/lakavimas-gelinis-lakavimas/kaunas','/paslaugos/unknown','/paslaugos/nagai/unknown'])assert.equal((await fetch(origin+url)).status,404,url);
  const ext=TAXONOMY_NODES.find(n=>n.scope==='extension');assert.equal((await fetch(origin+'/paslaugos/'+ext.id)).status,404);
  const selected=await fetch(origin+'/paslaugos/nagai?miestas=vilnius',{redirect:'manual'});assert.equal(selected.status,303);assert.equal(selected.headers.get('location'),'/paslaugos/nagai/vilnius');
  const registry=await fetch(origin+'/content-targets.json').then(r=>r.json());assert.equal(registry.deployed,false);assert.equal(registry.targets.length,0);
  f.store.transaction(()=>{const d=f.store.read();d.organizations.find(o=>o.id===f.org.id).approved=false;f.store.write(d);});
  assert.equal((await fetch(origin+'/paslaugos/nagai/vilnius')).status,404);
 }finally{await new Promise(r=>server.close(r));f.store.close();}
});
test('The current service catalogue remains available when an unrelated editorial package cannot be read',async()=>{
 const f=fixture(),dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-catalogue-content-failure-')),packagePath=path.join(dir,'content-package.json');await writeFile(packagePath,'{"incomplete":');const server=createAppServer({apiHandler:f.handler,contentClock:()=>now,contentPackagePath:packagePath});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{for(const url of ['/paslaugos','/paslaugos/nagai','/paslaugos/lakavimas-gelinis-lakavimas/vilnius']){const response=await fetch(origin+url);assert.equal(response.status,200,url);assert.match(await response.text(),/<h1 class="page-title">/);}assert.equal((await fetch(origin+'/paslaugos/nagai/kaunas')).status,404);assert.equal((await fetch(origin+'/gidai/nezinomas-gidas')).status,404);}
 finally{await new Promise(r=>server.close(r));f.store.close();const absolute=path.resolve(dir);if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-catalogue-content-failure-'))await rm(absolute,{recursive:true,force:true});}
});

test('V2 immutable intake, shared projection and HTML/schema/discovery use the same current targets',async()=>{
 const f=fixture(),dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-content-')),packagePath=path.join(dir,'content-package.json'),pkg=articleFixture();
 try{
  await writeFile(packagePath,JSON.stringify(pkg));const registry=createContentTargetRegistry({offers:f.handler.platform.catalog({}),deployed:true,now});
  const projected=await contentProjection({packagePath,registry,now}),article=projected.pages.find(p=>p.id==='fixture-guide');
  const html=projected.html(article);assert.match(html,/href="https:\/\/madbeauty.lt\/paslaugos\/lakavimas-gelinis-lakavimas\/vilnius"/);assert.match(html,/<ol><li>Pasitikrink kainą ir trukmę\.<\/li>/);assert.match(JSON.stringify(projected.schema(article)),/"@type":"Article"/);
  const plain=await contentProjection({packagePath,now,registry:{targets:[]}});assert.doesNotMatch(plain.html(plain.pages[1]),/href="https:\/\/madbeauty.lt\/paslaugos/);assert.match(plain.html(plain.pages[1]),/Gelinis lakavimas Vilniuje/);
  const notDue=await contentProjection({packagePath,registry,now:Date.parse(pkg.pages[1].publishAt)-1});assert.equal(notDue.pages.length,0);
  assert.match(projected.seo.nicheSitemapXml(),/gidai\/katalogo-nuorodos-testas/);assert.match(projected.seo.nicheLlmsFull(),/lakavimas-gelinis-lakavimas\/vilnius/);
  const changed=structuredClone(pkg);changed.pages[1].title='Unapproved change';await writeFile(packagePath,JSON.stringify(changed));await assert.rejects(()=>contentProjection({packagePath,registry,now}),/approval\/hash mismatch/);
  const future=structuredClone(pkg);future.pages[1].publishAt='2026-10-07T08:00:00Z';signFixture(future);await writeFile(packagePath,JSON.stringify(future));const later=await contentProjection({packagePath,registry,now});assert.equal(later.pages.length,1);assert.doesNotMatch(later.seo.nicheSitemapXml(),/katalogo-nuorodos-testas/);
  const wrong=structuredClone(pkg);wrong.siteId='different';await writeFile(packagePath,JSON.stringify(wrong));await assert.rejects(()=>contentProjection({packagePath,registry,now}));
  for(const slug of ['meistrui/turinys','paslaugos/nagai','paieska']){const collision=structuredClone(pkg);collision.pages[1].slug=slug;signFixture(collision);await writeFile(packagePath,JSON.stringify(collision));await assert.rejects(()=>contentProjection({packagePath,registry,now}),/Private platform|Catalogue route|articles must/);}
 }finally{f.store.close();}
});
