import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chairColorPlan,type ChairPalette} from '../src/lib/chair-color-admission';
const a='a'.repeat(64),s='b'.repeat(64),base='c'.repeat(64),material='d'.repeat(64),runtime='e'.repeat(64);
const pair={status:'EXACT_SAVED_PAIR_OWN_RUNTIME_BINDINGS',bindings:[{assetSha256:a,selectorId:s,baseMaterialId:base,materialId:material}],materials:{[material]:{pbrMetallicRoughness:{baseColorFactor:[1,0,0,1]}}},targetOwnedRuntimeBindingProof:true,generalizedAcrossConstructionContexts:false,geometryReusedFromOtherModel:false,constructionScope:{CHEADREST:'NONE'},finishAlternativeScope:{CUPHCOLOR:'RED',CUPHGROUP:'RX'},finishBaseScope:{CUPHCOLOR:'BLUE',CUPHGROUP:'RX'},requiresExactConstructionAndFinishScope:true,requiresExactObservedState:true,onlyThisObservedPairQualified:true,mode:'materialFullObservedStateOverride'};
function fixture(){return {palette:{schema:'chair-colors-observed-partial-344-v1',code:'KTEST001',runtimeSha256:runtime,actualPaletteComplete:false,observedPairs:[structuredClone(pair)]} as ChairPalette,selectors:{schema:'canonical-world-primitive-selectors-329-v1',assets:{[a]:{assetSha256:a,slots:[{selectorId:s,materialId:base,sourceNodePath:[0],primitive:0}]}}},code:'KTEST001',runtimeSha256:runtime,activeAssetSha256:[a],values:{CHEADREST:'NONE',CUPHCOLOR:'RED',CUPHGROUP:'RX'},selection:{kind:'observed-pair' as const,index:0}};}
test('an exact observed pair returns one complete original-relative override',()=>{
 const f=fixture(),before=structuredClone(f),p=chairColorPlan(f);
 assert.equal(p.status,'observed-state');assert.equal(p.resetOriginalMaterialsFirst,true);assert.equal(p.fullPalettePass,false);assert.equal(p.assignments.length,1);assert.deepEqual(f,before);
});
test('construction changes, missing finish scope and foreign assets are unavailable',()=>{
 for(const mutate of [(f:ReturnType<typeof fixture>)=>{f.values.CHEADREST='HR';},(f:ReturnType<typeof fixture>)=>{delete (f.values as Record<string,string>).CUPHGROUP;},(f:ReturnType<typeof fixture>)=>{f.activeAssetSha256=[];},(f:ReturnType<typeof fixture>)=>{f.runtimeSha256='f'.repeat(64);},(f:ReturnType<typeof fixture>)=>{f.code='FOREIGN';}]){
  const f=fixture();mutate(f);assert.equal(chairColorPlan(f).status,'unavailable');
 }
});
test('ambiguous selector, material mismatch and a duplicate assignment are rejected',()=>{
 for(const mutate of [(f:ReturnType<typeof fixture>)=>{f.selectors.assets[a].slots.push({...f.selectors.assets[a].slots[0]});},(f:ReturnType<typeof fixture>)=>{f.selectors.assets[a].slots[0].materialId='f'.repeat(64);},(f:ReturnType<typeof fixture>)=>{if(f.palette.schema==='chair-colors-observed-partial-344-v1')f.palette.observedPairs[0].bindings.push({...pair.bindings[0]});}]){
  const f=fixture();mutate(f);assert.equal(chairColorPlan(f).status,'unavailable');
 }
});
test('original restoration has no manufactured material assignments',()=>{
 const f=fixture();assert.deepEqual(chairColorPlan({...f,selection:{kind:'original'}}),{status:'original',resetOriginalMaterialsFirst:true,assignments:[],materials:{},fullPalettePass:false});
});
test('inactive own variants are validated but never addressed as visible surfaces',()=>{
 const f=fixture(),inactive='f'.repeat(64);f.selectors.assets[inactive]={assetSha256:inactive,slots:[{selectorId:s,materialId:base,sourceNodePath:[0],primitive:0}]};
 if(f.palette.schema==='chair-colors-observed-partial-344-v1')f.palette.observedPairs[0].bindings.push({...pair.bindings[0],assetSha256:inactive});
 const plan=chairColorPlan(f);assert.equal(plan.status,'observed-state');assert.equal(plan.assignments.length,1);assert.equal(plan.assignments[0].assetSha256,a);
 f.selectors.assets[inactive].slots[0].materialId=inactive;assert.equal(chairColorPlan(f).status,'unavailable');
});
test('full-state palettes require an explicit construction witness and one exact record',()=>{
 const f=fixture(),id='f'.repeat(64);
 const palette:ChairPalette={schema:'chair-colors-full-state-329-v1',code:f.code,runtimeSha256:runtime,records:{[id]:{actualStateSha256:id,field:'CUPHCOLOR',value:'RED',finishControllerContext:{CPRICEGROUP:'_1'},exactFullStateOverrideOnly:true,jointIndependentFinishCompositionValidated:false,binding:pair}},selectionLinks:{one:{actualStateSha256:id,context:{CPRICEGROUP:'_1'},field:'CUPHCOLOR',value:'RED'}}};
 const input={...f,palette,values:{...f.values,CPRICEGROUP:'_1'},selection:{kind:'full-state' as const,link:'one'}};
 assert.equal(chairColorPlan(input).status,'unavailable');
 assert.equal(chairColorPlan({...input,fullStateConstructionScope:{CHEADREST:'NONE'}}).status,'observed-state');
 assert.equal(chairColorPlan({...input,fullStateConstructionScope:{CHEADREST:'HR'}}).status,'unavailable');
 assert.equal(chairColorPlan({...input,values:{...input.values,CUPHCOLOR:'BLUE'},fullStateConstructionScope:{CHEADREST:'NONE'}}).status,'unavailable');
});
