import test from 'node:test';
import assert from 'node:assert/strict';
import {customerBuilderSteps} from '../src/lib/customer-builder-steps-server';
import {customerCapabilities} from '../src/lib/customer-capability';
import type {Product} from '../src/lib/types';

const cap=customerCapabilities('a-test-only-secret-for-customer-step-metadata');
const fieldId=(field:string)=>cap.id('field',field);
for(const category of ['kedes','rasomieji-stalai-ir-darbo-vietos'])test(category+' preserves every real control once without publishing supplier field names',()=>{
 const product={categorySlug:category,id:'finite-test'} as Product;
 const choices={CMECHANISM:['FST'],CARMRESTS:['R35K3','R74'],CBASE:['TS25'],CPRICEGROUP:['_1'],CUPHGROUP:['CSE'],CUPHCOLOR:['CSE01'],publicUpholstery:['one','two']};
 const before=JSON.stringify(choices),steps=customerBuilderSteps(product,choices,fieldId,['publicUpholstery']);
 const controls=steps.flatMap(step=>step.controls);
 assert.deepEqual([...controls].sort(),Object.keys(choices).map(fieldId).sort());
 assert.equal(new Set(controls).size,controls.length);
 assert.equal(JSON.stringify(choices),before);
 assert.equal(steps.find(step=>step.controls.includes(fieldId('CMECHANISM')))?.id,'movement');
 assert.equal(steps.find(step=>step.controls.includes(fieldId('CARMRESTS')))?.id,'supports');
 assert.equal(steps.find(step=>step.controls.includes(fieldId('publicUpholstery')))?.id,category==='kedes'?'finishes':'colors');
 for(const field of Object.keys(choices))assert(!JSON.stringify(steps).includes(field));
});
test('fixed products get no invented steps; a real single control remains accessible',()=>{
 const product={categorySlug:'kedes',id:'fixed'} as Product;
 assert.deepEqual(customerBuilderSteps(product,{},fieldId),[]);
 const steps=customerBuilderSteps(product,{CBASE:['TS25']},fieldId);
 assert.equal(steps.length,1);assert.deepEqual(steps[0].controls,[fieldId('CBASE')]);
});
