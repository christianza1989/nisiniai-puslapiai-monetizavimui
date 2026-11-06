import test from 'node:test';import assert from 'node:assert/strict';
import scope from '../content/text-review-connected-choices.json';
import seed from '../content/seed.json';
import {connectedChoiceModel} from '../src/lib/connected-choice-scope';
import type {Product} from '../src/lib/types';
test('exact47 target samples opt in only in the text-review stage; nine fixed models stay excluded',()=>{
 const origin=process.env.PUBLIC_ORIGIN,preview=process.env.TEXT_REVIEW_PROPOSALS;
 try{process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';process.env.TEXT_REVIEW_PROPOSALS='true';assert.equal(scope.legacy.length,29);assert.equal(scope.prepared.length,18);assert.equal(scope.fixed.length,9);
  for(const kind of ['legacy','prepared']as const)for(const row of scope[kind]){const p=seed.products.find(p=>p.id===row.productId)!;assert(p.configurations.some(c=>c.code===row.code&&c.id===row.sample));assert(connectedChoiceModel({...p,modelConfigurationId:row.sample}as Product,kind));assert(!connectedChoiceModel({...p,modelConfigurationId:'another-sample'}as Product,kind));assert(!scope.fixed.includes(row.code));}
  for(const code of scope.fixed){const p=seed.products.find(p=>p.configurations.some(c=>c.code===code))!,c=p.configurations.find(c=>c.code===code)!;assert(!connectedChoiceModel({...p,modelConfigurationId:c.id}as Product,'legacy'));assert(!connectedChoiceModel({...p,modelConfigurationId:c.id}as Product,'prepared'));}
  process.env.PUBLIC_ORIGIN='https://ergonomic.lt';const row=scope.legacy[0],p=seed.products.find(p=>p.id===row.productId)!;assert(!connectedChoiceModel({...p,modelConfigurationId:row.sample}as Product,'legacy'));
 }finally{if(origin===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=origin;if(preview===undefined)delete process.env.TEXT_REVIEW_PROPOSALS;else process.env.TEXT_REVIEW_PROPOSALS=preview;}
});
