import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {baseSeed,productPath} from '../src/lib/catalog';
import {productModels} from '../src/lib/product-models';
import {publicProductCopy} from '../src/lib/public-product-copy';
import {editorialProduct} from '../src/lib/editorial-server';
import {selectedCatalog,catalogPageSlice,catalogPageHref} from '../src/lib/catalog-selection';
import {modelTags} from '../src/lib/seo-collections';
import {productHeading} from '../src/lib/product-presentation';
import {productBreadcrumbs} from '../src/lib/product-breadcrumbs';
import {modelSeo} from '../src/lib/model-seo';
import {standardSitePages} from '../src/lib/site-reading-pages';
import {productReadingPages,readingMode} from '../src/lib/product-reading';
import {productIsVisible} from '../src/lib/site-publication';
import {catalogSeoQuery} from '../src/lib/catalog-metadata';
const seed=baseSeed(),parents=seed.products.map(p=>editorialProduct(publicProductCopy(p))),models=productModels(parents);
test('Public taxonomy is an exact projection of reviewed private evidence, without source identities',()=>{
 const evidence=JSON.parse(fs.readFileSync('content/seo-collection-membership.json','utf8'));
 const publicRows=JSON.parse(fs.readFileSync('content/product-taxonomy.json','utf8'));
 assert.deepEqual(publicRows,evidence.map(({productId,configurationId,tags}:any)=>({productId,configurationId,tags})));
 assert.equal(new Set(publicRows.map((r:any)=>r.productId+':'+r.configurationId)).size,publicRows.length);
 for(const p of models.filter(p=>p.familyName==='Ministyle'||p.familyName==='Prado'))assert(!modelTags(p).includes('ergonomines-kedes'));
 for(const p of models.filter(p=>p.subcategoryId==='www_officechairs'&&(p.familyName==='Jupiter'||p.familyName==='Lynx')))assert(modelTags(p).includes('ergonomines-kedes'));
});
test('Complete commercial categories paginate every exact model without category leakage',()=>{
 for(const [tag,count]of [['ergonomines-kedes',83],['ergonominiai-stalai',37],['balansines-kedes',3],['priedai',3]] as const){
  const result=selectedCatalog(models,{},tag),paths=new Set<string>();assert.equal(result.length,count);
  for(let page=1;page<=Math.ceil(count/20);page++){const slice=catalogPageSlice(result,{puslapis:String(page)})!;assert(slice);for(const p of slice.models){assert(modelTags(p).includes(tag));assert(!paths.has(productPath(p)));paths.add(productPath(p));}}
  assert.equal(paths.size,count);assert.equal(catalogPageSlice(result,{puslapis:'999'}),undefined);
 }
 const desks=selectedCatalog(models,{},'ergonominiai-stalai');assert.equal(selectedCatalog(desks,{tipas:'pneumatiniai-stalai'}).length,1);
 assert.equal(catalogPageHref('/ergonomines-kedes/',{paieska:'Xilium',puslapis:'7'},2),'/ergonomines-kedes/?paieska=Xilium&puslapis=2');
});
test('Display type follows exact model membership; names and supplier identity remain intact',()=>{
 for(const p of models.filter(p=>modelTags(p).includes('ergonomines-kedes')))assert.match(productHeading(p),/^Ergonominė biuro kėdė /);
 for(const p of models.filter(p=>p.familyName==='Ministyle'))assert(!/Ergonominė biuro kėdė/.test(productHeading(p)));
 for(const p of models.filter(p=>modelTags(p).includes('ergonominiai-stalai'))){assert.match(productHeading(p),/reguliuojamo aukščio stalas/);assert(!/with.*height adjustment/.test(productHeading(p)));}
 assert.equal(new Set(models.map(productPath)).size,797);
});
test('One complete breadcrumb authority contains the semantic category, line and exact model',()=>{
 for(const p of models){const parent=parents.find(x=>x.id===p.id)!,cat=seed.categories.find(c=>c.id===p.categoryId)!,trail=productBreadcrumbs(p,parent,cat);assert.equal(trail.at(-1)!.path,productPath(p));if(p.modelConfigurationId&&parent.configurations.length>1)assert.equal(trail.at(-2)!.path,productPath(parent));if(modelTags(p).includes('ergonomines-kedes'))assert.equal(trail[2].path,'/ergonomines-kedes/');}
});
test('Variants have unique metadata derived from their real options; titles are bounded',()=>{
 const titles=models.map(p=>modelSeo(p).title),descs=models.map(p=>modelSeo(p).description);
 assert.equal(new Set(titles).size,models.length);assert.equal(new Set(descs).size,models.length);
 assert(Math.max(...titles.map(t=>t.length))<160);assert(Math.max(...descs.map(t=>t.length))<300);
});
test('GEO includes approved site sections and ordinary products, but closes drafts on the main domain',()=>{
 const pages=standardSitePages(seed,parents,models);
 for(const path of ['/','/ergonomines-kedes/','/ergonominiai-stalai/','/produktai/','/gidai/','/steam-baldai/','/biuro-baldu-gamyba/'])assert(pages.some(p=>p.id===path));
 const ordinary=models.filter(p=>!p.modelArticle?.configurable);assert.equal(productReadingPages(ordinary,'local-preview').length,ordinary.length);
 assert.equal(productReadingPages(models,'closed').length,0);assert.equal(productReadingPages(models,'public').length,0);
 assert.equal(productIsVisible({...models[0],published:true,translationReviewed:false},false),false);
 assert.equal(readingMode(new Request('https://ergonomic.lt/llms.txt'),{preview:true,indexable:false}),'closed');
 const text=JSON.stringify([...pages,...productReadingPages(ordinary,'local-preview')]);assert(!/sourceUrl|supplierOptions|translationSource|prompt|Nowy\s*Styl|Kusch/i.test(text));
});
test('Specific subsets preserve canonical identity; existing SEO selections use their owner URL',()=>{
 assert.deepEqual(catalogSeoQuery('/produktai/kedes/',{atranka:'ergonomines-kedes'}),{canonical:'/ergonomines-kedes/',noindex:true});
 assert.deepEqual(catalogSeoQuery('/produktai/',{tipas:'www_conferencechairs',puslapis:'2'}),{canonical:'/produktai/?tipas=www_conferencechairs&puslapis=2',noindex:true});
 assert.deepEqual(catalogSeoQuery('/ergonomines-kedes/',{puslapis:'2'}),{canonical:'/ergonomines-kedes/?puslapis=2',noindex:false});
});
