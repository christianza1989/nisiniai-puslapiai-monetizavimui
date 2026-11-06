import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../content/seed.json';
import {customerReviewProduct} from '../src/lib/customer-review-product';
import {modelProduct} from '../src/lib/product-models';
import {buildReviewScope} from '../src/lib/text-review-server';
import type {Product} from '../src/lib/types';
for(const code of ['K2ME004WW001','KEM2013WW004'])test(code+' retains every current-model text binding while omitting other models SQL scope',async()=>{
 const parent=seed.products.find(p=>p.configurations.some(c=>c.code===code))! as Product,sample=parent.configurations.find(c=>c.code===code)!,product=modelProduct(parent,sample),before=JSON.stringify(product),narrow=customerReviewProduct(product,code);
 const full=await buildReviewScope(product,new Map()),selected=await buildReviewScope(narrow,new Map());
 assert.deepEqual(selected.publicScope.bindings[code],full.publicScope.bindings[code]);
 for(const key of ['values','originals','colourNames'] as const){const old=Object.fromEntries(Object.entries(full.publicScope[key]||{}).filter(([k])=>k.startsWith(code+':'))),now=Object.fromEntries(Object.entries(selected.publicScope[key]||{}).filter(([k])=>k.startsWith(code+':')));assert.deepEqual(now,old);}
 assert.equal(JSON.stringify(product),before);assert(narrow.configurations.every(c=>c.code===code));assert(narrow.configurations.some(c=>c.id===sample.id));assert.equal(customerReviewProduct(product,'unknown'),product);
});
