import test from 'node:test';
import assert from 'node:assert/strict';
import source from '../content/admin-source-status.json';
import {activeModels,visibleModels,activePriorityOrder,textQueue} from '../src/lib/publication-scope';

test('default admin scope is797; historical toggle reveals1111 without changing active summary',()=>{
 assert.equal(visibleModels(source.models).length,797);
 assert.equal(visibleModels(source.models,true).length,1111);
 assert.equal(activeModels(visibleModels(source.models,true)).length,797);
 assert.equal(activeModels(source.models).filter(m=>m.categorySlug==='kedes').length,272);
 assert.equal(activeModels(source.models).filter(m=>m.categorySlug!=='kedes').length,525);
});

test('hidden priorities never enter text work even when ranked first and technically ready',()=>{
 const models=[{key:'hidden',active:false,geometryAccepted:true,geminiReady:false},{key:'b',active:true,geometryAccepted:true,geminiReady:false},{key:'a',active:true,geometryAccepted:true,geminiReady:false},{key:'unprepared',active:true,geometryAccepted:false,geminiReady:false}];
 assert.deepEqual(activePriorityOrder(models,['hidden','a','b']),['a','b']);
 assert.deepEqual(textQueue(models,['hidden','a','b']).map(m=>m.key),['a','b']);
 assert.deepEqual(textQueue(models,['hidden','a','b'],['a']).map(m=>m.key),['b']);
 assert.equal(models.length,4);
});
