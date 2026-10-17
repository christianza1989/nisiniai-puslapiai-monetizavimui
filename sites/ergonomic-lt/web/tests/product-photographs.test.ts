// Historical original examples remain intentionally covered after public card consolidation.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {baseSeed,catalog,normalizeSupplier} from '../src/lib/catalog';
import {allProductModels as productModels} from '../src/lib/product-models';
import {productPhotograph,cleanProductPhotographs} from '../src/lib/product-photographs';
import {getDb} from '../src/lib/db';
const folder=fs.mkdtempSync(path.resolve('../research/photo-policy-tests-'));process.env.RUNTIME_DIR=folder;process.env.PREVIEW_CATALOG='true';
after(()=>{getDb().close();fs.rmSync(folder,{recursive:true,force:true});});
const logo='https://www.nowystyl.com/getmedia/d781b933-02d7-48a1-8bef-c419cca49cd6/kusch-logo-2-a-white-25419.svg?ext=.svg';
test('Hola and every catalog group contain photographs rather than imported logos or icons',()=>{
 const data=catalog(),hola=data.products.find(p=>p.slug==='hola-susitikimu-ir-lankytoju-kedes')!;
 assert(!hola.gallery.some(src=>src.includes('kusch-logo')));assert(hola.gallery.length>0);
 for(const p of data.products){assert(p.image,p.slug);assert(p.gallery.length>0,p.slug);assert.equal(new Set(p.gallery).size,p.gallery.length);
  for(const src of [p.image,...p.gallery,...p.configurations.map(c=>c.image)])assert.equal(productPhotograph(src),src,p.slug+': '+src);
 }
 const models=productModels(data.products);assert.equal(models.length,1111);assert(models.every(p=>p.image&&p.gallery.length));
});
test('White SVG logos and raster feature icons are rejected before and after optimization',()=>{
 assert.equal(productPhotograph(logo),null);assert.equal(productPhotograph(logo.replace('white','WHITE')),null);
 assert.equal(productPhotograph('https://www.nowystyl.com/getmedia/x/icon-prod-feature-66-49284.png'),null);
 assert.equal(productPhotograph('/media/products-v2/7926c6fd1a9c24c8d962-98x98/98.webp'),null);
 assert.equal(productPhotograph('/media/missing-placeholder.jpg'),null);assert.equal(productPhotograph(''),null);
});
test('An invalid primary or empty cleaned gallery falls back to a real photo from the same product',()=>{
 const p=catalog().products[0],photo=p.configurations[0].image!;
 const repaired=cleanProductPhotographs({...p,image:logo,gallery:[logo]});assert.equal(repaired.image,photo);assert.deepEqual(repaired.gallery,[photo]);
});
test('Repeated aliases deduplicate without removing the actual furniture image or original studio backdrop',()=>{
 const p=catalog().products[0],c=p.configurations[0],repaired=cleanProductPhotographs({...p,gallery:[c.image!,c.image!,logo]});
 assert.deepEqual(repaired.gallery,[c.image]);assert.equal(repaired.configurations[0].image,c.image);
});
test('Supplier refresh and incumbent edits cannot put a branded SVG back into galleries',()=>{
 const raw=JSON.parse(fs.readFileSync('../data/nextjs_catalog.json','utf8'));
 const imported=normalizeSupplier(raw,baseSeed());
 for(const p of imported.products)assert(p.gallery.every(src=>!!productPhotograph(src)));
 const hola=imported.products.find(p=>p.slug==='hola-susitikimu-ir-lankytoju-kedes')!;assert(hola.gallery.length>0);assert(!hola.gallery.includes(logo));
 for(const p of imported.products){const source=raw.products.find((r:any)=>r.id===p.id);for(const c of p.configurations){const original=source.configurations.find((r:any)=>r.id===c.id);if(c.image)assert.equal(c.image,original.image_url);}}
});
test('An original animation with a blank initial frame is excluded unless mapped to a verified still',()=>{
 assert.equal(productPhotograph('https://www.nowystyl.com/getmedia/a/segla-arrangement.gif?height=288'),null);
 assert(productPhotograph('/media/9076abfdc1398d2b1e74.gif')?.endsWith('.webp'));
});
