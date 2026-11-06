import test from'node:test';import assert from'node:assert/strict';
import{furnitureTerminology as term}from'../src/lib/furniture-terminology';
import{customerLabel}from'../src/lib/customer-names';
import{displayedReviewText,publishedText}from'../src/lib/text-review-state';
test('owner base term keeps dimensions, materials, case and unrelated base types',()=>{
 assert.equal(term('Penkių šakų pagrindas, skersmuo 735 mm, juodas poliamidas'),'Penkiažvaigždė bazė, skersmuo 735 mm, juodas poliamidas');
 assert.equal(term('su penkių stipinų pagrindu ir apmušalais'),'su penkiažvaigžde baze ir apmušalais');
 assert.equal(term('760 mm skersmens juodas penkių stipinų aliumininis pagrindas'),'760 mm skersmens juoda penkiažvaigždė aliumininė bazė');
 assert.equal(term('696 mm skersmens penkių stipinų poliruoto aliuminio pagrindas'),'696 mm skersmens penkiažvaigždė poliruoto aliuminio bazė');
 assert.equal(term('Keturių stipinų pagrindas ST65-POL'),'Keturių stipinų pagrindas ST65-POL');
 assert.equal(term('Penkių stipinų'),'Penkiažvaigždė bazė');
 assert.equal(term('Kėdės pagrindas su penkiais stipinais.'),'Kėdės penkiažvaigždė bazė.');
});
test('existing draft and published wording is presented with owner term without changing stored edit/hash/revision',()=>{
 const def={id:'x',sourceHash:'unchanged',suggested:'Penkių stipinų pagrindas',role:'Parinktis',english:'5-star',polish:'',sourceCode:'TS38',context:'Pagrindas',notes:'',current:['Penkių šakų pagrindas'],modelCount:1};
 const edit={key:'x',source_hash:'unchanged',draft:'Mano penkių šakų pagrindas, 735 mm',state:'approved' as const,revision:8,published:'Mano penkių šakų pagrindas, 735 mm',published_hash:'unchanged',updated_at:'now'},original=JSON.stringify(edit);
 assert.equal(publishedText(def,edit,''),'Mano penkiažvaigždė bazė, 735 mm');
 process.env.TEXT_REVIEW_PROPOSALS='true';process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';
 assert.equal(displayedReviewText(def,edit,''),'Mano penkiažvaigždė bazė, 735 mm');assert.equal(JSON.stringify(edit),original);assert.equal(def.sourceHash,'unchanged');
 assert.equal(customerLabel('TS38 · Penkių šakų pagrindas, 735 mm',['TS38'],''),'Penkiažvaigždė bazė, 735 mm');
});
