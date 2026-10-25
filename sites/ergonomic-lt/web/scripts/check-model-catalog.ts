import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {baseSeed,productPath} from '../src/lib/catalog';
import {productModels,selectedModelConfiguration} from '../src/lib/product-models';
import {optimizedProductImage} from '../src/lib/product-media';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const seed=baseSeed(),models=productModels(seed.products),checks:any[]=[];
async function page(route:string){const response=await fetch(origin+route);assert.equal(response.status,200,route);const html=await response.text();assert(!html.includes('Nepavyko įkelti puslapio.'),route);return parseHTML(html).document;}
const catalog=await page('/produktai/');assert.match(catalog.querySelector('.catalog-heading')!.textContent!,/1.?111|1111/);assert.equal(catalog.querySelectorAll('.product-card').length,20);
const last=await page('/produktai/?puslapis=56');assert.equal(last.querySelectorAll('.product-card').length,11);checks.push({route:'/produktai/',count:models.length,lastPage:56});
const xilium=seed.products.find(p=>p.id==='product_xilium-swivel-chairs_0fe4091b')!;
const family=await page(productPath(xilium));const children=productModels([xilium]);
for(const p of children)assert(family.querySelector('a[href="'+productPath(p)+'"]'),p.slug);
assert.equal(family.querySelector('#konfiguratorius')!.querySelectorAll('.product-card').length,7);
const representatives=[...new Map([...children,...seed.categories.filter(c=>!c.parentId).map(c=>models.find(p=>p.categoryId===c.id)!),...seed.products.filter(p=>p.configurations.length<=1).map(p=>productModels([p])[0])].filter(Boolean).map(p=>[p.slug,p])).values()];
for(const p of representatives){const d=await page(productPath(p));assert.equal(d.querySelector('h1')!.textContent,p.name);
 const main=d.querySelector('.gallery-main img');assert(main,productPath(p));assert.equal(main!.getAttribute('src'),optimizedProductImage(p.image),p.slug);
 assert.equal(d.querySelectorAll('.preset-mode').length,0,p.slug);
 const c=selectedModelConfiguration(p);if(c?.code)assert(d.querySelector('.product-info')!.textContent!.includes(c.code),p.slug);
 const siblings=d.querySelectorAll('.section .product-card');if(p.configurations.length>1)assert(siblings.length>=p.configurations.length-1,p.slug);
 checks.push({route:productPath(p),name:p.name,code:c?.code,image:main!.getAttribute('src')});
}
const line=seed.lines.find(l=>l.id===xilium.lineId)!;const collection=await page('/kolekcijos/'+line.slug+'/');assert.equal(collection.querySelectorAll('.product-card').length,models.filter(p=>p.lineId===line.id).length);
const image=optimizedProductImage(children[0].image)!;const photo=await fetch(origin+image.replace(/\/\d+\.webp$/,'/400.webp'));assert.equal(photo.status,200);assert.match(photo.headers.get('content-type')||'',/image\/webp/);
const result={checkedAt:new Date().toISOString(),origin,totalModels:models.length,xiliumModels:children.length,collectionModels:collection.querySelectorAll('.product-card').length,checks};
const reportDir=process.env.CHECK_REPORT_DIR||'../research/model-catalog-2026-10-11';fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(reportDir+'/'+(origin.startsWith('https')?'remote':'local')+'-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({origin,totalModels:models.length,xiliumModels:7,checkedPages:checks.length+3},null,2));
