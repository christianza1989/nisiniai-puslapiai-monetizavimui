import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePackage,compilePackage} from '../scripts/editorial/contract.mjs';
import {baseSeed} from '../src/lib/catalog';
import {modelProduct} from '../src/lib/product-models';
import {modelSeo} from '../src/lib/model-seo';
const active=JSON.parse(fs.readFileSync('content/editorial/content-package.json','utf8'));
const baseline=JSON.parse(fs.readFileSync('content/editorial/baseline-package.json','utf8'));
const id='product_xilium-swivel-chairs_0fe4091b';
test('reviewed PDF enrichment keeps facts separate from snippet and exact configuration',()=>{
 validatePackage(active,baseline);
 const copy=compilePackage(active).server.products[id];
 const article=copy.articles['23636148'];
 assert.equal(article.technicalSections.reduce((n:number,s:{rows:unknown[]})=>n+s.rows.length,0),42);
 assert.equal(copy.configurations['23636148'],article.summary);
 assert.equal(copy.articles['23636152'].configurable.configurationId,'23636152');
 assert.notEqual(copy.articles['23636152'].configurable,article.configurable);
 assert(!article.seo.description.includes('Techniniai duomenys'));
 assert(article.technicalSections.some((s:{rows:{value:string}[]})=>s.rows.some(r=>r.value.includes('ne patvirtinta maksimali kėdės apkrova'))));
});
test('changed PDF number cannot inherit an existing exact-value approval',()=>{
 const changed=structuredClone(active);
 changed.fields.find((f:{id:string})=>f.id==='configuration.'+id+'.23636148').value=changed.fields.find((f:{id:string})=>f.id==='configuration.'+id+'.23636148').value.replace('500 mm','999 mm');
 assert.throws(()=>validatePackage(changed,baseline));
});
test('model copy and metadata do not spread to a sibling with the same base code',()=>{
 const product=baseSeed().products.find(p=>p.id===id)!;
 const selected=modelProduct(product,product.configurations.find(c=>c.id==='23636148')!);
 const sibling=modelProduct(product,product.configurations.find(c=>c.id==='23636152')!);
 assert(selected.modelArticle);
 assert.equal(selected.description,selected.modelArticle.summary);
 assert.deepEqual(modelSeo(selected),selected.modelArticle.seo);
 assert(sibling.modelArticle);
 assert.equal(sibling.modelArticle.configurable!.configurationId,'23636152');
 assert.notEqual(sibling.description,selected.description);
 assert.equal(selected.configurations.find(c=>c.id==='23636148')!.code,sibling.configurations.find(c=>c.id==='23636152')!.code);
});
