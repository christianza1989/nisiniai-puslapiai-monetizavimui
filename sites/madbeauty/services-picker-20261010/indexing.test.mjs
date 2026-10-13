import test from 'node:test';
import assert from 'node:assert/strict';
import {captureServerPage,serverPageFor,restoreServerMetadata} from '../prototype/public/server-recovery.mjs';
import {catalogueRoute} from '../prototype/catalogue-page.mjs';
import {createContentTargetRegistry} from '../prototype/content-targets.mjs';
import {publicModuleEntries} from '../cloudflare/public-modules.mjs';
const doc=()=>{
 const fields={'meta[name="robots"]':{content:'index,follow'},'meta[name="description"]':{content:'Paskelbtas turinys'},'link[rel="canonical"]':{href:'https://madbeauty.lt/'},'#main':{innerHTML:'<article><h1>Madbeauty</h1><p>Paskelbtas turinys.</p></article>',textContent:'Madbeauty Paskelbtas turinys.',querySelector:()=>({textContent:'Madbeauty'})}};
 return {title:'Madbeauty',querySelector:s=>fields[s]};
};
test('A public enhancement failure preserves exact server content/metadata only on its own route, never another page or private/demo workspace',()=>{
 const page=doc(),snapshot=captureServerPage(page,'https://madbeauty.lt/');assert.match(snapshot.html,/Paskelbtas turinys/);assert.equal(serverPageFor(snapshot,'https://madbeauty.lt/#kategorijos'),snapshot);
 for(const path of ['/paieska','/paskyra','/?q=x'])assert.equal(serverPageFor(snapshot,'https://madbeauty.lt'+path),null);
 for(const path of ['/paskyra','/meistrui','/operatorius/turinys','/registracija/paslauga'])assert.equal(captureServerPage(page,'https://madbeauty.lt'+path),null);
 assert.equal(captureServerPage(page,'https://madbeauty.lt/',{temporaryTest:true}),null);assert.equal(captureServerPage(page,'https://madbeauty.lt/',{privatePrototype:true}),null);
 page.title='Klaida';page.querySelector('meta[name="robots"]').content='noindex';restoreServerMetadata(page,snapshot);assert.equal(page.title,'Madbeauty');assert.equal(page.querySelector('meta[name="robots"]').content,'index,follow');
});
test('Catalogue and provider hubs become discoverable; leaf/empty city/facet search gates remain separate',()=>{
 const entries=publicModuleEntries([],{},[]),registry=createContentTargetRegistry({deployed:true}),eligible=registry.routes.filter(r=>r.indexEligible);
 assert.equal(entries.length,17);assert.equal(eligible.length,14);
 for(const e of entries.filter(e=>e.path.startsWith('/paslaugos')))assert.equal(catalogueRoute(e.path).indexEligible,true,e.path);
 assert.equal(catalogueRoute('/paslaugos/manikiuras').indexEligible,false);assert.equal(catalogueRoute('/paslaugos/manikiuras-klasikinis-manikiuras').indexEligible,false);assert.equal(catalogueRoute('/paslaugos/nagai/akmene'),null);
 assert.ok(registry.routes.filter(r=>r.cityId).every(r=>!r.indexEligible));
});
