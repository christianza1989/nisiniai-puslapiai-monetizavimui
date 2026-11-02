import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeReadyChairPalettes} from '../scripts/normalize-ready-chair-palettes';
import {qualifiedChairPlan,qualifiedDefaultSelection} from '../src/lib/chair-qualified-colors';
import type {ChairPreview} from '../src/lib/chair-preview';
test('group and older whole-state aliases of identical OWN part bytes share one admitted transport',()=>{
 const h=(c:string)=>c.repeat(64),code='KTEST',runtimeSha256=h('f'),construction={WIDTH:'_500'},extra=h('e'),a={asset:'/new/frame.glb',assetSha256:extra,bytes:100},b={...a,asset:'/older/frame.glb'};
 const data={code,runtimeSha256,
  runtime:{contexts:[{dimensions:construction,groups:[],invariant:{sha256:h('a')}}]},
  assets:{[h('a')]:{asset:'/base.glb',assetSha256:h('a'),bytes:100}},
  selectors:{assets:{[h('a')]:{assetSha256:h('a'),slots:[{selectorId:h('b'),materialId:h('c')}]}}},
 }as unknown as ChairPreview;
 const swap=(file:string)=>({mode:'primitiveSwap',removeOwnSelectors:[{assetSha256:h('a'),selectorId:h('b')}],addOwnManufacturerAsset:{file,sha256:extra,bytes:100}});
 const docs={
  'colors-groups.json':{code,runtimeSha256,schema:'chair-qualified-group-palette-353-v1',qualifiedByDecision353:true,qualifiedWitnessGroupPaletteComplete:true,runtimeContextIndex:0,exactConstructionAndDerivedValues:construction,requiredOwnedBaseAssetShas:[h('a')],groups:[{id:'frame',fields:['CFRAMECOLOR'],completeActualPostPrefixDomain:true,actualGroupValueCount:2,baseValues:{CFRAMECOLOR:'BLACK'},values:[{mode:'unchanged',values:{CFRAMECOLOR:'BLACK'}},{...swap('new.glb'),values:{CFRAMECOLOR:'CHROME'}}]}]},
  'colors-swaps.json':{code,runtimeSha256,schema:'chair-exact-state-primitive-swaps-329-v1',exactFullStateOnly:true,independentFinishCompositionAllowed:false,patches:[{...swap('old.glb'),mode:'exact-full-state-primitive-swap',runtimeContextIndex:0,requiredFullBaselineValues:construction,actualFullStateValues:{[code+'_FINISHES.CFRAMECOLOR']:'CHROME'},independentFieldCompositionValidated:false,geometryReusedFromOtherModel:false,geometryUvOriginalMatricesAndPbrMatchEntireManufacturerState:true}]},
 };
 const result=normalizeReadyChairPalettes(data,docs,{}, {'new.glb':a,'old.glb':b},'v2');data.qualified=result.qualified;const w=result.qualified.witnesses[0],s=qualifiedDefaultSelection(w);
 assert.deepEqual(result.usedAdditionalFiles,['new.glb']);assert.deepEqual(w.groups[0].options[1].patch.assets,[a]);assert.deepEqual(w.singles[0].patch.assets,[a]);
 s.groups.frame=w.groups[0].options[1].id;assert.equal(qualifiedChairPlan(data,0,[],[h('a')],s).status,'observed-state');
 assert.equal(qualifiedChairPlan(data,0,[],[h('a')],{...s,kind:'single',single:w.singles[0].id}).status,'observed-state');
});
