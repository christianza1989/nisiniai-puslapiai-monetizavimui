import {test} from 'node:test';import assert from 'node:assert/strict';
import {rebindLosslessRuntime,rebindLosslessQualified,rebindLosslessSelectors,type LosslessBinding} from '../scripts/prepared-lossless-chair-binding';
import type {ChairPreview,ChairSelectors} from '../src/lib/chair-preview';
import type {ChairQualifiedData} from '../src/lib/chair-qualified-colors';
const raw='a'.repeat(64),transport='b'.repeat(64),map=new Map<string,LosslessBinding>([[raw,{source:raw,target:transport,bytes:100,proof:{sourceBytes:200},receipt:'proof.json',receiptSha256:'c'.repeat(64)}]]);
test('only the exact proved transport differences may explain a runtime change',()=>{
 const input={contexts:[{dimensions:{WIDTH:'_500'},groups:[],invariant:{sha256:raw,bytes:200,needsCompression:true}}]},expected={contexts:[{dimensions:{WIDTH:'_500'},groups:[],invariant:{sha256:transport,bytes:100,needsCompression:false}}]},old={runtime:expected}as unknown as ChairPreview;
 assert.equal(rebindLosslessRuntime(input,old,map),expected);assert.equal(input.contexts[0].invariant.sha256,raw);
 input.contexts[0].dimensions.WIDTH='_600';assert.throws(()=>rebindLosslessRuntime(input,old,map),/do not explain/);
});
test('lossless role rebinding preserves selector/material IDs and whole-state boundaries',()=>{
 const q={schema:'chair-qualified-review-v1',code:'KTEST',runtimeSha256:'source-runtime',version:'v1',extraAssets:{},materials:{[raw]:{}},opaqueAssets:[],legacyScopes:[],witnesses:[{id:'w',label:'Gobelenas',context:0,construction:{WIDTH:'_500'},variants:[],requiredAssets:[raw],branches:[],singles:[],groups:[{id:'g',label:'Gobelenas',base:'o',options:[{id:'o',label:'CSE34',values:{CUPHCOLOR:'CSE34'},patch:{assets:[],remove:[],bindings:[{assetSha256:raw,selectorId:raw,materialId:raw,baseMaterialId:raw}]}}]}]}]}as ChairQualifiedData;
 const result=rebindLosslessQualified(q,'target-runtime',map),binding=result.witnesses[0].groups[0].options[0].patch.bindings[0];assert.equal(result.runtimeSha256,'target-runtime');assert.deepEqual(result.witnesses[0].requiredAssets,[transport]);assert.deepEqual(binding,{assetSha256:transport,selectorId:raw,materialId:raw,baseMaterialId:raw});assert.deepEqual(q.witnesses[0].requiredAssets,[raw]);
 const selectors={schema:'canonical-world-primitive-selectors-329-v1',assets:{[raw]:{assetSha256:raw,slots:[],materials:{}}}}as ChairSelectors;assert.equal(rebindLosslessSelectors(selectors,map).assets[transport].assetSha256,transport);assert.equal(selectors.assets[raw].assetSha256,raw);
 q.extraAssets[raw]={asset:'/part.glb',assetSha256:raw,bytes:100};assert.throws(()=>rebindLosslessQualified(q,'target-runtime',map),/additional geometry/);
});
