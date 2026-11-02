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

function conditionalFixture(){
 const h=(c:string)=>c.repeat(64),code='KBJA003WW002',runtimeSha256=h('f'),fixed={CHEADRESTUPHCOLOR:'VL5002',CHEADRESTUPHGROUP:'VL',CPRICEGROUP:'_2'},fields=[...Object.keys(fixed),'CUPHCOLOR','CUPHGROUP'].sort();
 const pins={code,runtimeSha256,runtimeContextIndex:0,exactConstructionAndDerivedValues:{WIDTH:'_500'},requiredOwnedBaseAssetShas:[h('a')]};
 const data={code,runtimeSha256,runtime:{contexts:[{dimensions:{WIDTH:'_500'},groups:[],invariant:{sha256:h('a')}}]},assets:{[h('a')]:{asset:'/base.glb',assetSha256:h('a'),bytes:100}},selectors:{assets:{[h('a')]:{assetSha256:h('a'),slots:[{selectorId:h('b'),materialId:h('c')}]}}}} as unknown as ChairPreview;
 const variableGroups=Object.fromEntries(Object.entries({CUR:15,EGL:17,VL:1,XR:41}).map(([name,count])=>{const values=Array.from({length:count},(_,i)=>name==='VL'?'VL5002':name+i);return [name,{actualControllerGroupValue:name,groupEditableSelectableChoices:['CUR','EGL','XR','VL'],observedColourValuesForOriginalTupleAccounting:values,actualSelectableColourChoices:name==='VL'?[]:values,fixedHiddenColourNotSelectableChoice:name==='VL'}];}));
 const values=Object.entries(variableGroups).flatMap(([group,domain])=>domain.observedColourValuesForOriginalTupleAccounting.map(colour=>({values:{...fixed,CUPHGROUP:group,CUPHCOLOR:colour},mode:'material',bindings:[{assetSha256:h('a'),selectorId:h('b'),baseMaterialId:h('c'),materialId:h('d')}]})));
 const kind='QUALIFIED_CONDITIONAL_BJA3_74_OWN_4181',token=h('e');
 const docs:Record<string,any>={
  'colors-groups.json':{...pins,schema:'chair-qualified-conditional-context-palette-4181-v1',conditionalScopeKind:kind,conditionalScopeToken:token,qualifiedByDecision353:true,qualifiedConditionalFinishContextComplete:true,qualifiedWitnessGroupPaletteComplete:false,actualPaletteComplete:false,allGeometryContextsCovered:false,requiredFixedFinishContext:fixed,groups:[{fields,completeActualPostPrefixDomain:false,completeActualPostPrefixDomainInsideFixedFinishContext:true,actualGroupValueCount:74,values}]},
  'conditional-context.json':{...pins,schema:'chair-exact-conditional-finish-context-contract-4300-v1',kind,scopeToken:token,qualification4181Sha256:h('1'),qualifiedConditionalFinishContextComplete:true,qualifiedWitnessGroupPaletteComplete:false,actualPaletteComplete:false,allGeometryContextsCovered:false,fixedSelectableFinishValues:fixed,allFiveOriginalSelectableFieldsRemainActive:fields,actualReachableWholeFinishTuples:74,variableGroups},
  'GROUP-PALETTE-VERIFIED-SAFE.json':{code,pass:true,noDonorGeometry:true,conditionalScopeKind:kind,conditionalScopeToken:token,qualifiedConditionalFinishContextComplete:true,qualifiedWitnessGroupPaletteComplete:false,actualPaletteComplete:false,allGeometryContextsCovered:false,groupValueRecords:74,actualWholeManufacturerStatesReconstructed:75,jointFullStatesReconstructed:10,jointDistinctSignatures:10,allSelectableFieldsNondefaultCovered:true,requiredFixedFinishContext:fixed,selectableFields:fields},
 };
 const normalize=()=>normalizeReadyChairPalettes(data,docs,{[h('d')]:{pbrMetallicRoughness:{baseColorFactor:[1,0,0,1]}}},{},'conditional');
 return {data,docs,normalize,h};
}

test('conditional source admits only complete five-field tuples at the exact OWN construction',()=>{
 const {data,normalize,h}=conditionalFixture();data.qualified=normalize().qualified;const w=data.qualified.witnesses[0];
 assert.equal(w.singles.length,74);assert.equal(w.groups.length,0);assert.equal(w.branches.length,0);
 assert.equal(w.singles.filter(o=>o.values.CUPHGROUP==='VL').length,1);
 assert.match(w.singles.find(o=>o.values.CUPHGROUP==='VL')!.label,/Fiksuota spalva/);
 assert.doesNotMatch(w.singles.find(o=>o.values.CUPHGROUP==='VL')!.label,/VL · VL5002/);
 for(const o of w.singles){const p=qualifiedChairPlan(data,0,[],[h('a')],{...qualifiedDefaultSelection(w),single:o.id});assert.equal(p.status,'observed-state');assert.equal(p.fullPalettePass,false);assert.equal(Object.keys(o.values).length,5);}
 assert.equal(qualifiedChairPlan(data,0,[],[h('2')],qualifiedDefaultSelection(w)).status,'unavailable');
 data.runtime.contexts[0].dimensions.WIDTH='_600';assert.equal(qualifiedChairPlan(data,0,[],[h('a')],qualifiedDefaultSelection(w)).status,'unavailable');
});

test('conditional source rejects tuples outside its fixed FINISH prefix or missing a domain member',()=>{
 const a=conditionalFixture();a.docs['colors-groups.json'].groups[0].values[0].values.CPRICEGROUP='_3';assert.throws(a.normalize,/outside the prefix/);
 const b=conditionalFixture();b.docs['colors-groups.json'].groups[0].values.pop();assert.throws(b.normalize,/whole tuple domain/);
});

test('conditional source rejects a promoted full-palette flag, unpinned runtime and selectable hidden VL colour',()=>{
 const a=conditionalFixture();a.docs['colors-groups.json'].qualifiedWitnessGroupPaletteComplete=true;assert.throws(a.normalize,/promoted/);
 const b=conditionalFixture();b.docs['conditional-context.json'].runtimeSha256=b.h('2');assert.throws(b.normalize,/pin differs|runtime mismatch/);
 const c=conditionalFixture();c.docs['conditional-context.json'].variableGroups.VL.actualSelectableColourChoices=['VL5002'];assert.throws(c.normalize,/Hidden invariant/);
 const d=conditionalFixture();delete d.docs['conditional-context.json'];assert.throws(d.normalize,/Unknown conditional source kind/);
});
