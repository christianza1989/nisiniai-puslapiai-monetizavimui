import {test} from 'node:test';import assert from 'node:assert/strict';
import {rebindLosslessRuntime,rebindLosslessQualified,rebindLosslessSelectors,applyExplicitOptimizedAlias,type LosslessBinding} from '../scripts/prepared-lossless-chair-binding';
import type {ChairPreview,ChairSelectors} from '../src/lib/chair-preview';
import type {ChairQualifiedData} from '../src/lib/chair-qualified-colors';
const raw='a'.repeat(64),transport='b'.repeat(64),map=new Map<string,LosslessBinding>([[raw,{source:raw,target:transport,bytes:100,proof:{sourceBytes:200},receipt:'proof.json',receiptSha256:'c'.repeat(64)}]]);
test('only the exact proved transport differences may explain a runtime change',()=>{
 const input={contexts:[{dimensions:{WIDTH:'_500'},groups:[],invariant:{sha256:raw,bytes:200,needsCompression:true}}]},expected={contexts:[{dimensions:{WIDTH:'_500'},groups:[],invariant:{sha256:transport,bytes:100,needsCompression:false}}]},old={runtime:expected}as unknown as ChairPreview;
 assert.equal(rebindLosslessRuntime(input,old,map),expected);assert.equal(input.contexts[0].invariant.sha256,raw);
 input.contexts[0].dimensions.WIDTH='_600';assert.throws(()=>rebindLosslessRuntime(input,old,map),/do not explain/);
});
function aliasFixture(){
 const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],old={selectorId:'c'.repeat(64),materialId:'d'.repeat(64),sourceNodePath:[0],primitive:0,transformChain:[{matrix}],geometrySha256:'0'.repeat(64)},next={...old,selectorId:'e'.repeat(64),materialId:'f'.repeat(64)},pbr={pbrMetallicRoughness:{baseColorFactor:[1,0,0,1]}},original={assetSha256:raw,slots:[old],materials:{[old.materialId]:pbr}},optimized={assetSha256:transport,slots:[next],materials:{[next.materialId]:structuredClone(pbr)}};
 const pins={sourcePackageManifestSha256:'1'.repeat(64),sourceRuntimeSha256:'2'.repeat(64),sourceSelectorsSha256:'3'.repeat(64),receivingReviewSha256:'4'.repeat(64),rawAssetSha256:raw};
 const record={...pins,schema:'exact-own-public-optimized-selector-rebind-v1',code:'KTEST',dimensions:{WIDTH:'_500'},optimizedAssetSha256:transport,optimizedPublicAsset:'/original.glb',optimizedCanonicalSelectors:optimized,selectorAliases:[{originalSelectorId:old.selectorId,optimizedSelectorId:next.selectorId}],optimizedOriginalNodeMapping:{[next.selectorId]:{originalNodePath:[0],primitiveIndex:0,originalWorldMatrix:matrix}},proof:{allVertexAttributeBytesAndOrientedTriangleMultiplicityEqual:true,allWholePrimitiveMultiplicitiesCompared:true,materialImagesAndSamplerValuesUnchanged:true,worldAndPbrComparedAsExactJsonNumberRatios:true,numericTolerance:0,noAmbiguousTargetAssignments:true,primitiveCount:1}};
 const data={code:'KTEST',runtime:{contexts:[{dimensions:{WIDTH:'_500'},groups:[],invariant:{sha256:transport}}]},assets:{[transport]:{asset:'/original.glb',assetSha256:transport,bytes:100}},palette:{schema:'chair-base-observed-colours-v1'},selectors:{assets:{[transport]:{...original,assetSha256:transport}}},qualified:{materials:{[raw]:{roughnessFactor:.7}},witnesses:[{context:0,requiredAssets:[transport],branches:[],singles:[],groups:[{options:[{patch:{assets:[],remove:[],bindings:[{assetSha256:transport,selectorId:old.selectorId,baseMaterialId:old.materialId,materialId:raw}]}}]}]}]}}as unknown as ChairPreview;
 return {data,original,record,pins,old,next};
}
test('explicit optimized alias changes only the admitted address and base identity, preserving manufacturer target PBR',()=>{
 const {data,original,record,pins,old,next}=aliasFixture(),result=applyExplicitOptimizedAlias(data,original,record,pins),b=result.data.qualified!.witnesses[0].groups[0].options[0].patch.bindings[0];
 assert.equal(result.appliedMappings,1);assert.equal(b.selectorId,next.selectorId);assert.equal(b.baseMaterialId,next.materialId);assert.equal(b.materialId,raw);assert.deepEqual(result.data.qualified!.materials,data.qualified!.materials);assert.equal(data.qualified!.witnesses[0].groups[0].options[0].patch.bindings[0].selectorId,old.selectorId);
});
test('optimized alias rejects another constructor, receiving review or material value without mutating current data',()=>{
 for(const mutate of [(x:any)=>x.record.dimensions.WIDTH='_600',(x:any)=>x.pins.receivingReviewSha256='5'.repeat(64),(x:any)=>x.record.optimizedCanonicalSelectors.materials[x.next.materialId].pbrMetallicRoughness.baseColorFactor=[0,0,0,1]]){
  const f=aliasFixture(),before=structuredClone(f.data);mutate(f);assert.throws(()=>applyExplicitOptimizedAlias(f.data,f.original,f.record,f.pins));assert.deepEqual(f.data,before);
 }
});
test('lossless role rebinding preserves selector/material IDs and whole-state boundaries',()=>{
 const q={schema:'chair-qualified-review-v1',code:'KTEST',runtimeSha256:'source-runtime',version:'v1',extraAssets:{},materials:{[raw]:{}},opaqueAssets:[],legacyScopes:[],witnesses:[{id:'w',label:'Gobelenas',context:0,construction:{WIDTH:'_500'},variants:[],requiredAssets:[raw],branches:[],singles:[],groups:[{id:'g',label:'Gobelenas',base:'o',options:[{id:'o',label:'CSE34',values:{CUPHCOLOR:'CSE34'},patch:{assets:[],remove:[],bindings:[{assetSha256:raw,selectorId:raw,materialId:raw,baseMaterialId:raw}]}}]}]}]}as ChairQualifiedData;
 const result=rebindLosslessQualified(q,'target-runtime',map),binding=result.witnesses[0].groups[0].options[0].patch.bindings[0];assert.equal(result.runtimeSha256,'target-runtime');assert.deepEqual(result.witnesses[0].requiredAssets,[transport]);assert.deepEqual(binding,{assetSha256:transport,selectorId:raw,materialId:raw,baseMaterialId:raw});assert.deepEqual(q.witnesses[0].requiredAssets,[raw]);
 const selectors={schema:'canonical-world-primitive-selectors-329-v1',assets:{[raw]:{assetSha256:raw,slots:[],materials:{}}}}as ChairSelectors;assert.equal(rebindLosslessSelectors(selectors,map).assets[transport].assetSha256,transport);assert.equal(selectors.assets[raw].assetSha256,raw);
 q.extraAssets[raw]={asset:'/part.glb',assetSha256:raw,bytes:100};assert.throws(()=>rebindLosslessQualified(q,'target-runtime',map),/additional geometry/);
});
