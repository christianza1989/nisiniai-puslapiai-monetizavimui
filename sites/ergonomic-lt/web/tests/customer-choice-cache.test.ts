import test from 'node:test';
import assert from 'node:assert/strict';
import {CustomerChoiceCache} from '../src/lib/customer-choice-cache';
import type {CustomerConfiguration} from '../src/lib/customer-configuration';
const from={productId:'one',selectionId:'signed-state'} as CustomerConfiguration;
test('only identical complete source-state transitions share a request; no inferred reverse edge',async()=>{
 let calls=0;const cache=new CustomerChoiceCache(async()=>{calls++;return {...from,selectionId:'next'};});
 const a=cache.get(from,'field','value'),b=cache.get(from,'field','value');assert.equal(a,b);const next=await a;await cache.get(next,'field','original');await cache.get({...from,productId:'other'},'field','value');assert.equal(calls,3);
});
test('short expiry and failed requests release cached state; entry count stays bounded',async()=>{
 let now=0,calls=0,fail=true;const cache=new CustomerChoiceCache(async()=>{calls++;if(fail)throw Error('offline');return from;},()=>now);
 await assert.rejects(cache.get(from,'field','value'));fail=false;await cache.get(from,'field','value');assert.equal(calls,2);now=5001;await cache.get(from,'field','value');assert.equal(calls,3);
 for(let i=0;i<9;i++)await cache.get(from,'field','v'+i);await cache.get(from,'field','value');assert.equal(calls,13);cache.clear();await cache.get(from,'field','value');assert.equal(calls,14);
});
