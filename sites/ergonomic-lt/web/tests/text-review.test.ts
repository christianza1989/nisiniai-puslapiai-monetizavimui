import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import seed from '../content/seed.json';
import {buildReviewScope,contentDefinitions,inventoryModels,inventoryTerms,mutateText,localTextKey,ReviewConflict} from '../src/lib/text-review-server';
import {reviewedCatalogTitles} from '../src/lib/text-review-catalog';
import {modelProduct} from '../src/lib/product-models';
import {productHeading} from '../src/lib/product-presentation';
import {dbAll,dbRun} from '../src/lib/db';
import {textReviewStatus,publishedText} from '../src/lib/text-review-state';
import type {Product} from '../src/lib/types';
process.env.RUNTIME_DIR=mkdtempSync('D:/Core/output/ergonomic-3d-translation-20261103/text-cms-tests-');
const inventories=inventoryModels(),terms=inventoryTerms();
const id=Object.values(terms).find(t=>t.sourceCode==='CGLIDES')!.id,def=terms[id];
const candidates=Object.entries(inventories).filter(([,m])=>Object.values(m.bindings).includes(id));
const first=candidates[0],second=candidates.find(([,m])=>m.productId!==first[1].productId)!;
const product=([,m]:typeof first)=>({...seed.products.find(p=>p.id===m.productId)!,modelConfigurationId:m.sample}) as Product;

test('Shared approval updates two product counters, draft stays private, publication is explicit, and history survives',async()=>{
 const a=product(first),b=product(second),beforeA=await buildReviewScope(a),beforeB=await buildReviewScope(b);
 const expected=new Set(Object.values(inventories[first[0]].bindings)).size;
 assert.equal(beforeA.entries.filter(e=>e.shared).length,expected);
 await mutateText(def,{key:id,sourceHash:def.sourceHash,expectedRevision:0,action:'draft',text:'Patikrintos pėdelės'});
 let scope=await buildReviewScope(a);assert.equal(scope.done,beforeA.done);assert.equal(scope.publicScope.values[first[0]+':'+id],undefined);
 await mutateText(def,{key:id,sourceHash:def.sourceHash,expectedRevision:1,action:'approve',text:'Patikrintos pėdelės'});
 const approvedA=await buildReviewScope(a),approvedB=await buildReviewScope(b);
 assert.equal(approvedA.done,beforeA.done+1);assert.equal(approvedB.done,beforeB.done+1);
 assert.equal(approvedA.publicScope.values[first[0]+':'+id],undefined);
 await mutateText(def,{key:id,sourceHash:def.sourceHash,expectedRevision:2,action:'publish',text:'Patikrintos pėdelės'});
 scope=await buildReviewScope(b);assert.equal(scope.publicScope.values[second[0]+':'+id],'Patikrintos pėdelės');
 const old=scope.entries.find(e=>e.id===id)!.edit!;
 const changed={...def,sourceHash:'a'.repeat(64)};assert.equal(textReviewStatus(changed,old),'changed');assert.equal(publishedText(changed,old,'Originalas'),'Originalas');
 await assert.rejects(mutateText(changed,{key:id,sourceHash:def.sourceHash,expectedRevision:3,action:'approve',text:'Kita reikšmė'}),ReviewConflict);
 await assert.rejects(mutateText(def,{key:id,sourceHash:def.sourceHash,expectedRevision:2,action:'draft',text:'Pasenęs įrašymas'}),ReviewConflict);
 const local=localTextKey(second[0],id);
 await mutateText(def,{key:local,sourceHash:def.sourceHash,expectedRevision:0,action:'approve',text:'Šio modelio pėdelės'});
 await mutateText(def,{key:local,sourceHash:def.sourceHash,expectedRevision:1,action:'publish',text:'Šio modelio pėdelės'});
 assert.equal((await buildReviewScope(b)).publicScope.values[second[0]+':'+id],'Šio modelio pėdelės');
 assert.equal((await buildReviewScope(a)).publicScope.values[first[0]+':'+id],'Patikrintos pėdelės');
 await mutateText(def,{key:local,sourceHash:def.sourceHash,expectedRevision:2,action:'keep'});
 assert.equal((await buildReviewScope(b)).publicScope.values[second[0]+':'+id],'Šio modelio pėdelės','keep preserves the existing published model presentation');
 await mutateText(def,{key:id,sourceHash:def.sourceHash,expectedRevision:3,action:'unpublish'});
 assert.equal((await buildReviewScope(a)).publicScope.values[first[0]+':'+id],undefined);
 assert.equal((await dbAll('SELECT * FROM text_review_history WHERE key=?',id)).length,4);
 assert.equal((await buildReviewScope(a)).complete,false,'unfinished inventory cannot become complete through text approval');
 const publicJSON=JSON.stringify((await buildReviewScope(a)).publicScope);assert(!/nowystyl|sourceUrl|suggested|polish/i.test(publicJSON));
});

test('Concurrent edits have one winner and rejected writes leave no audit event',async()=>{
 const d=Object.values(terms).find(t=>t.id!==id)!,args={key:d.id,sourceHash:d.sourceHash,expectedRevision:0,action:'draft' as const,text:'Pirmas įrašas'};
 const results=await Promise.allSettled([mutateText(d,args),mutateText(d,{...args,text:'Antras įrašas'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await dbAll('SELECT * FROM text_review_history WHERE key=?',d.id)).length,1);
 await assert.rejects(mutateText(d,{...args,expectedRevision:1,text:''}));
 await assert.rejects(mutateText(d,{...args,expectedRevision:1,text:'<script>alert(1)</script>'}));
 await assert.rejects(mutateText(d,{...args,expectedRevision:1,action:'publish',text:'Nepatvirtintas tekstas'}),ReviewConflict);
});

test('Different meanings and newly indexed records are not approved by matching display words',async()=>{
 const mesh=Object.values(terms).filter(t=>t.sourceCode==='MESH');assert(mesh.length>1);assert(new Set(mesh.map(t=>t.id)).size>1);
 const sourceA=mesh[0],sourceB=mesh[1];await mutateText(sourceA,{key:sourceA.id,sourceHash:sourceA.sourceHash,expectedRevision:0,action:'approve',text:'Tinklinis variantas'});
 const rows=await dbAll<{key:string}>('SELECT key FROM text_review_edits WHERE key=?',sourceB.id);assert.equal(rows.length,0);
 await dbRun("INSERT INTO product_edits VALUES('untouched','{}','2026-11-03')");
 await mutateText(sourceA,{key:sourceA.id,sourceHash:sourceA.sourceHash,expectedRevision:1,action:'publish',text:'Tinklinis variantas'});
 assert.equal((await dbAll<{data:string}>('SELECT data FROM product_edits WHERE id=?','untouched'))[0].data,'{}');
});

test('Published headings reach catalogue cards without changing model IDs or reopening their own review',async()=>{
 const parent=seed.products.find(p=>p.configurations.length>1)! as Product;const model=modelProduct(parent,parent.configurations[0]),d=contentDefinitions(model).find(d=>d.id.endsWith(':title'))!;
 await mutateText(d,{key:d.id,sourceHash:d.sourceHash,expectedRevision:0,action:'approve',text:'Patikrintas produkto pavadinimas'});
 await mutateText(d,{key:d.id,sourceHash:d.sourceHash,expectedRevision:1,action:'publish',text:'Patikrintas produkto pavadinimas'});
 const projected=await reviewedCatalogTitles({...seed,products:[parent]});const result=modelProduct(projected.products[0],projected.products[0].configurations[0]);
 assert.equal(productHeading(result),'Patikrintas produkto pavadinimas');assert.equal(result.modelConfigurationId,model.modelConfigurationId);assert.equal(result.slug,model.slug);assert.deepEqual(result.configurations,model.configurations);
 const after=contentDefinitions(result).find(e=>e.id===d.id)!;assert.equal(after.sourceHash,d.sourceHash);assert.equal((await buildReviewScope(result)).entries.find(e=>e.id===d.id)!.status,'approved');
 assert.equal(textReviewStatus({...d,previousIds:['prior-id']},undefined),'changed');
});

test('A shared model-name translation reaches headings and cards of separate products while original codes stay unchanged',async()=>{
 const matches=Object.entries(inventories).filter(([,m])=>m.bindings['name:UPH']);const nid=matches[0][1].bindings['name:UPH'],d=terms[nid];
 const prior=await dbAll<{revision:number}>('SELECT revision FROM text_review_edits WHERE key=?',nid);const revision=prior[0]?.revision||0;
 await mutateText(d,{key:nid,sourceHash:d.sourceHash,expectedRevision:revision,action:'approve',text:'Apvilktas audiniu'});await mutateText(d,{key:nid,sourceHash:d.sourceHash,expectedRevision:revision+1,action:'publish',text:'Apvilktas audiniu'});
 const chosen=[matches[0],matches.find(([,m])=>m.productId!==matches[0][1].productId)!];
 for(const [,m]of chosen){const p=seed.products.find(p=>p.id===m.productId)! as Product,c=p.configurations.find(c=>c.id===m.sample)!;const before=modelProduct(p,c),projected=await reviewedCatalogTitles({...seed,products:[p]});const after=modelProduct(projected.products[0],c);assert(productHeading(after).includes('Apvilktas audiniu'));assert.equal(after.name,before.name);assert.equal(after.configurations.find(c=>c.id===m.sample)!.code,c.code);}
});
