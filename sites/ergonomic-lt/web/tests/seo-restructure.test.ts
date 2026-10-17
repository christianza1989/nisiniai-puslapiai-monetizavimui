// Historical original examples remain intentionally covered after public card consolidation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseHTML} from 'linkedom';
import {baseSeed,legacyPages,productPath} from '../src/lib/catalog';
import {allProductModels as productModels,resolveProduct} from '../src/lib/product-models';
import {matchesSelection,matchesSearch,modelTags,curatedModels,typeMatches,adjustableTypeId} from '../src/lib/seo-collections';
import {catalogSeoQuery} from '../src/lib/catalog-metadata';
import {categoryLabel} from '../src/lib/category-labels';
import {modelSeo} from '../src/lib/model-seo';
const seed=baseSeed(),models=productModels(seed.products);
test('Collections classify the selected manufacturer example, including mixed fixed/manual/electric eModel families',()=>{
 assert.equal(models.filter(p=>matchesSelection(p,'ergonominiai-stalai')).length,58);
 assert.equal(models.filter(p=>modelTags(p).includes('electric')).length,46);
 assert.equal(models.filter(p=>modelTags(p).includes('manual')).length,7);
 assert.equal(models.filter(p=>matchesSelection(p,'ergonomines-kedes')).length,132);
 assert.equal(models.filter(p=>matchesSelection(p,'balansines-kedes')).length,7);
 assert.equal(models.filter(p=>matchesSelection(p,'priedai')).length,6);
 const mixed=models.filter(p=>p.familyName?.includes('eModel 2.0'));
 assert(mixed.some(p=>modelTags(p).includes('electric')));assert(mixed.some(p=>modelTags(p).includes('manual')));assert(mixed.some(p=>!matchesSelection(p,'ergonominiai-stalai')));
 for(const p of models){assert.equal(typeMatches(p,adjustableTypeId),matchesSelection(p,'ergonominiai-stalai'));if(matchesSelection(p,'ergonomines-kedes'))assert.equal(p.subcategoryId,'www_officechairs');if(matchesSelection(p,'priedai'))assert.match(p.familyName||p.name,/Privi/);}
});
test('Keyword search understands Lithuanian accents and preserves exact model routes and supplier IDs',()=>{
 for(const query of ['ergonominiai stalai','reguliuojamo aukščio stalai','pakeliamas stalas'])assert.equal(models.filter(p=>matchesSearch(p,query)).length,58);
 for(const query of ['ergonominės kėdės','ergonomines kedes','Ergonominės biuro kėdės'])assert.equal(models.filter(p=>matchesSearch(p,query)).length,132);
 assert.equal(models.filter(p=>matchesSearch(p,'elektriniai stalai')).length,46);
 assert.equal(models.filter(p=>matchesSearch(p,'ergonominiai baldai')).length,190);assert.equal(models.filter(p=>matchesSearch(p,'modernus biuro baldai')).length,1111);
 for(const p of models)assert.equal(resolveProduct(seed.products,p.categorySlug,p.slug)?.modelConfigurationId,p.modelConfigurationId);
 assert.equal(new Set(models.map(productPath)).size,1111);
 for(const id of ['ergonominiai-stalai','ergonomines-kedes','balansines-kedes','priedai']){const chosen=curatedModels(models,id);assert(chosen.length);assert.equal(new Set(chosen.map(p=>p.id)).size,chosen.length);}
});
test('SEO aliases leave supplier categories and legacy texts intact; Priedai is an additional protected route',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync('content/seed.json')).digest('hex'),'5b23dad0ec7c077f0e2613531d670fceea33b68c81c7c85dfcd7af07e22b5df7');assert.equal(legacyPages().length,9);
 const accessories=legacyPages().find(p=>p.path==='/shop/priedai/')!;assert.equal(accessories.title,'Priedai Archives - Ergonomic');assert.equal(accessories.h1,'Priedai');
 assert.equal(categoryLabel('www_chairs',''),'Biuro kėdės');assert.equal(categoryLabel('www_desks',''),'Biuro stalai ir darbo vietos');
});
test('Only plain pagination has its own canonical; search and selections remain excluded from indexing',()=>{
 assert.deepEqual(catalogSeoQuery('/produktai/',{puslapis:'2'}),{canonical:'/produktai/?puslapis=2',noindex:false});
 assert.deepEqual(catalogSeoQuery('/produktai/',{puslapis:'2',atranka:'ergonominiai-stalai'}),{canonical:'/ergonominiai-stalai/?puslapis=2',noindex:true});
 assert.equal(catalogSeoQuery('/produktai/',{paieska:'kėdės'}).noindex,true);
 const electric=models.find(p=>modelTags(p).includes('electric'))!;assert.match(modelSeo(electric).title,/elektra reguliuojamo/i);
 const fixed=models.find(p=>p.familyName?.includes('eModel 2.0')&&!matchesSelection(p,'ergonominiai-stalai'))!;assert(!modelSeo(fixed).title.includes('reguliuojamo'));
});
test('Homepage keeps its original H1 and sections while linking four actual SEO categories with unchanged photograph bytes',()=>{
 const source=fs.readFileSync('src/lib/approved-home-markup.ts','utf8');
 const literal=source.match(/export const approvedSectionsMarkup = (.*);/);assert(literal,'homepage markup export');
 const d=parseHTML(JSON.parse(literal[1])).document;
 assert.equal(d.querySelector('h2#collection-title')?.textContent,'ERGONOMINIAI STALAI');
 for(const path of ['/ergonominiai-stalai/','/ergonomines-kedes/','/shop/balansines-kedes/','/shop/priedai/'])assert(d.querySelector('a[href="'+path+'"]'),path);
 const provenance=JSON.parse(fs.readFileSync('content/home-seo-provenance.json','utf8'));
 for(const asset of provenance.assets)assert.equal(createHash('sha256').update(fs.readFileSync('public'+asset.path)).digest('hex'),asset.sha256);
});
