import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retainQualifiedScopes} from '../scripts/prepared-chair-qualified-union';
import type {ChairQualifiedData} from '../src/lib/chair-qualified-colors';
const blank=():ChairQualifiedData=>({schema:'chair-qualified-review-v1',code:'KTEST',runtimeSha256:'a'.repeat(64),version:'v2',witnesses:[],legacyScopes:[],materials:{},extraAssets:{},opaqueAssets:[]});
const witness=(field:string)=>({id:'b'.repeat(64),label:'Surinktos spalvų grupės',context:0,construction:{WIDTH:'_500'},variants:[],requiredAssets:['c'.repeat(64)],branches:[],singles:[],groups:[{id:field,label:field,base:'original',options:[{id:'original',label:'Pradinė',values:{[field]:'01'},patch:{bindings:[],remove:[],assets:[]}}]}]});
test('equal constructions retain separate complete version witnesses without cross-version groups',()=>{
 const next=blank(),prior={...blank(),version:'v1'};next.witnesses=[witness('CUPHCOLOR')];prior.witnesses=[witness('CMESHCOLOR')];
 const result=retainQualifiedScopes(next,prior);assert.equal(result.witnesses.length,2);assert.equal(result.witnesses[0].groups.length,1);assert.equal(result.witnesses[1].groups.length,1);
 assert.notEqual(result.witnesses[0].id,result.witnesses[1].id);assert.deepEqual(result.witnesses[1].groups,prior.witnesses[0].groups);
 assert.equal(prior.witnesses[0].id,'b'.repeat(64));assert.equal(next.witnesses.length,1);
});
test('reused identical witness is not duplicated and prior exact-state scopes survive',()=>{
 const next=blank(),prior=blank();next.witnesses=[witness('CUPHCOLOR')];prior.witnesses=[witness('CUPHCOLOR')];prior.legacyScopes=[{context:0,construction:{WIDTH:'_500'},requiredAssets:['c'.repeat(64)]}];
 const result=retainQualifiedScopes(next,prior);assert.equal(result.witnesses.length,1);assert.deepEqual(result.legacyScopes,prior.legacyScopes);
});
test('same material ID with conflicting PBR and a changed runtime cannot be unioned',()=>{
 const next=blank(),prior=blank();next.materials.x={roughnessFactor:1};prior.materials.x={roughnessFactor:0};assert.throws(()=>retainQualifiedScopes(next,prior),/Conflicting material/);
 prior.materials={};prior.runtimeSha256='d'.repeat(64);assert.throws(()=>retainQualifiedScopes(next,prior),/Qualified base changed/);
});
