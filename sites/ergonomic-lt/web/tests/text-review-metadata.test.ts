import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import seed from '../content/seed.json';
import {contentDefinitions,buildReviewScope,mutateText} from '../src/lib/text-review-server';
import {modelProduct} from '../src/lib/product-models';
import {displayedReviewText} from '../src/lib/text-review-state';
import {dbAll} from '../src/lib/db';
import type {Product} from '../src/lib/types';
import type {TextEdit} from '../src/lib/text-review-types';

process.env.RUNTIME_DIR=mkdtempSync('D:/Core/output/ergonomic-gemini-20261105/meta-description/test-db-');
const parent=seed.products.find(p=>p.id==='product_arn-meeting-chairs_0bcdd58a')! as Product;

test('Search descriptions are separate stable fields on products and individual models',()=>{
 for(const product of [parent,modelProduct(parent,parent.configurations[0])]){
  const definitions=contentDefinitions(product),meta=definitions.find(d=>d.id.endsWith(':meta-description'))!;
  assert(meta);assert.equal(meta.context,'Aprašymas paieškai');assert.equal(meta.suggested,'');
  const changed=contentDefinitions({...product,description:'Pakeistas pagrindinis aprašymas',textReviewHeading:'Kitas pavadinimas'}).find(d=>d.id===meta.id)!;
  assert.equal(changed.sourceHash,meta.sourceHash);
  assert.equal(definitions.filter(d=>d.id.endsWith(':title')).length,1);
 }
});

test('An exact metadata draft persists without publication and is visible only on the proposal site',async()=>{
 const meta=contentDefinitions(parent).find(d=>d.id.endsWith(':meta-description'))!;
 const before=await buildReviewScope(parent,new Map());
 const text='Posėdžių ir lankytojų kėdė „Arn“, kurią po susitikimo galima sukrauti viena ant kitos. Medinės arba aliuminio kojos, su minkšta sėdyne ar be jos.';
 await mutateText(meta,{key:meta.id,sourceHash:meta.sourceHash,expectedRevision:0,action:'draft',text});
 const saved=(await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key=?',meta.id))[0];
 assert.equal(saved.draft,text);assert.equal(saved.state,'draft');assert.equal(saved.published,null);
 const origin=process.env.PUBLIC_ORIGIN,flag=process.env.TEXT_REVIEW_PROPOSALS;
 try{
  process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';process.env.TEXT_REVIEW_PROPOSALS='true';
  const scope=await buildReviewScope(parent,new Map([[meta.id,saved]]));
  assert.equal(scope.publicScope.values[meta.id],text);
  assert.deepEqual(scope.entries.filter(e=>!e.id.endsWith(':meta-description')),before.entries.filter(e=>!e.id.endsWith(':meta-description')));
  process.env.PUBLIC_ORIGIN='https://ergonomic.lt';
  assert.equal(displayedReviewText(meta,saved,'Previous metadata'),'Previous metadata');
 }finally{
  if(origin===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=origin;
  if(flag===undefined)delete process.env.TEXT_REVIEW_PROPOSALS;else process.env.TEXT_REVIEW_PROPOSALS=flag;
 }
 await assert.rejects(mutateText(meta,{key:meta.id,sourceHash:meta.sourceHash,expectedRevision:1,action:'draft',text:'a'.repeat(501)}),/500/);
 assert.equal((await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key=?',meta.id))[0].draft,text);
});
