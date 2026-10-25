import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../content/catalog-consolidation.json';
import seed from '../content/seed.json';
import {allProductModels,productModels,resolveCatalogProduct,modelProduct} from '../src/lib/product-models';
import {consolidatedRedirect,historicalCatalogPreset,catalogModelVisible} from '../src/lib/catalog-consolidation';
import {matchesSearch} from '../src/lib/seo-collections';
import {standardSitePages} from '../src/lib/site-reading-pages';
import type {Product,Seed} from '../src/lib/types';
const products=seed.products as Product[],path=(p:Product)=>`/produktai/${p.categorySlug}/${p.slug}/`;

test('One reviewed card survives each exact base code; all original1111 examples remain intact',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync('content/seed.json')).digest('hex'),manifest.sourceSeedSha256);
 const active=productModels(products),originals=allProductModels(products);
 assert.equal(originals.length,1111);assert.equal(active.length,797);assert.equal(new Set(active.map(path)).size,797);
 const baseCodes=(items:Product[])=>[...new Set(items.map(p=>p.id+':'+(p.configurations.find(c=>c.id===p.modelConfigurationId)?.code||p.modelConfigurationId||'no-example')))].sort();
 assert.deepEqual(baseCodes(active),baseCodes(originals),'No distinct base article may disappear');
 assert.equal(manifest.groups.length,212);assert.equal(manifest.groups.flatMap(g=>g.members).length,526);
 const retired=new Set(manifest.groups.flatMap(g=>g.members.filter(m=>m.id!==g.keeperId).map(m=>m.path)));
 assert.equal(retired.size,314);assert(!active.some(p=>retired.has(path(p))));
 for(const group of manifest.groups){const parent=products.find(p=>p.id===group.productId)!;
  assert.equal(active.filter(p=>p.id===parent.id&&p.configurations.find(c=>c.id===p.modelConfigurationId)?.code===group.code).length,1);
  for(const m of group.members)assert.equal(parent.configurations.find(c=>c.id===m.id)?.code,group.code);
 }
 for(const p of originals){const c=p.configurations.find(c=>c.id===p.modelConfigurationId);if(c)assert.equal(active.some(a=>path(a)===path(p)),catalogModelVisible(p.id,c));}
});

test('All314 retired addresses redirect once and preserve exact historic preset, query, saved state and source photograph',()=>{
 let count=0;
 for(const group of manifest.groups){
  const parent=products.find(p=>p.id===group.productId)!;
  const keeper=parent.configurations.find(c=>c.id===group.keeperId)!;
  for(const m of group.members.filter(m=>m.id!==group.keeperId)){
   const url=new URL('https://ergonomic-preview.pinet-azprekyba.workers.dev'+m.path+'?konfig='+encodeURIComponent('["old", "state"]')+'&v=before#konfiguratorius');
   const target=consolidatedRedirect(url)!;assert(target);assert.equal(target.pathname,group.keeperPath);assert.equal(target.searchParams.get('pavyzdys'),m.id);assert.equal(target.searchParams.get('konfig'),'["old", "state"]');assert.equal(target.searchParams.get('v'),'before');assert.equal(target.hash,'#konfiguratorius');assert.equal(consolidatedRedirect(target),undefined);
   const keeperProduct=modelProduct(parent,keeper),old=parent.configurations.find(c=>c.id===m.id)!;
   const restored=resolveCatalogProduct(products,parent.categorySlug,keeperProduct.slug,m.id)!;
   assert.equal(restored.modelConfigurationId,m.id);assert.equal(path(restored),group.keeperPath);
   const original=modelProduct(parent,old);assert.deepEqual(restored,{...original,slug:keeperProduct.slug});
   assert.deepEqual(restored.configurations.find(c=>c.id===m.id),original.configurations.find(c=>c.id===m.id));
   assert(matchesSearch(keeperProduct,m.id),'Historical ID search must find its surviving card');count++;
  }
  assert.equal(historicalCatalogPreset(parent.id,keeper,'invalid'),undefined);
  assert.equal(historicalCatalogPreset(parent.id,{...keeper,code:'WRONG'},group.members[0].id),undefined);
 }
 assert.equal(count,314);
 assert.equal(consolidatedRedirect(new URL('https://example.invalid/produktai/kedes/unknown/')),undefined);
});

test('Canonical discovery, collections and GEO all link only the same797 active cards',()=>{
 const models=productModels(products),pages=standardSitePages(seed as Seed,products,models),active=new Set(models.map(path));
 const catalog=pages.find(p=>p.id==='/produktai/')!;assert.equal(catalog.links.length,797);
 for(const group of manifest.groups)for(const member of group.members.filter(m=>m.id!==group.keeperId)){
  assert(!pages.some(p=>p.id===member.path));assert(!pages.some(p=>p.links.some(l=>l.targetPageId===member.path)));
 }
 for(const p of models)assert(active.has(path(p)));
});
