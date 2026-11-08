import assert from'node:assert/strict';
import type{ChairPreview}from'../src/lib/chair-preview';
import type{QualifiedWitness}from'../src/lib/chair-qualified-colors';
type Values=Record<string,string>;
type Binding={assetSha256:string;selectorId:string;baseMaterialId:string;materialId:string};
type Profile={schema:string;code:string;runtimeSha256:string;actualPaletteComplete:boolean;independentFinishCompositionAllowed:boolean;variants:{contextIndex:number;allFunctionalConstructionValues:Values;exactBeforeFinish:Values;exactAfterFinish:Values;targetWholeGeometryUvWorldPbrReconstructed:boolean;independentFinishCompositionAllowed:boolean;bindings:Binding[]}[]};
const tuple=(v:Values)=>JSON.stringify(Object.entries(v).sort());
/** Each saved context owns its geometry and complete finish tuples. Unobserved contexts gain no palette. */
export function admitVisualOwnFinishContexts(input:{code:string;runtimeSha256:string;runtime:ChairPreview['runtime'];selectors:ChairPreview['selectors'];profile:Profile;materials:Record<string,unknown>}):QualifiedWitness[]{
 const{code,runtimeSha256,runtime,selectors,profile,materials}=input;
 assert(profile.schema==='exact-saved-own-pair-bindings-329-visual930100-v1'&&profile.code===code&&runtime.code===code&&profile.runtimeSha256===runtimeSha256);
 assert(profile.actualPaletteComplete===false&&profile.independentFinishCompositionAllowed===false&&profile.variants.length>0&&selectors.schema==='canonical-world-primitive-selectors-329-v1');
 assert(profile.variants.every(v=>Number.isInteger(v.contextIndex)&&v.contextIndex>=0&&v.contextIndex<runtime.contexts.length));
 return runtime.contexts.flatMap((context,index)=>{
  const variants=profile.variants.filter(v=>v.contextIndex===index);if(!variants.length)return[];
  assert(context.invariant&&context.groups.length===0);const asset=context.invariant.sha256,doc=selectors.assets[asset];assert(doc&&doc.assetSha256===asset);
  const first=variants[0],seen=new Set<string>();
  const singles=variants.map((v,n)=>{
   assert(v.targetWholeGeometryUvWorldPbrReconstructed===true&&v.independentFinishCompositionAllowed===false);
   assert(tuple(v.allFunctionalConstructionValues)===tuple(first.allFunctionalConstructionValues)&&tuple(v.exactBeforeFinish)===tuple(first.exactBeforeFinish));
   assert(Object.entries(context.dimensions).every(([k,x])=>v.allFunctionalConstructionValues[k]===x));
   const keys=Object.keys(v.exactBeforeFinish).sort();assert(keys.length>0&&keys.every(k=>/^[A-Z][A-Z0-9_]*$/.test(k)));assert.deepEqual(Object.keys(v.exactAfterFinish).sort(),keys);
   assert(Object.values(v.exactAfterFinish).every(x=>typeof x==='string'&&x.length>0));
   const id=tuple(v.exactAfterFinish);assert(!seen.has(id)&&id!==tuple(v.exactBeforeFinish));seen.add(id);assert(v.bindings.length>0);const slots=new Set<string>();
   for(const b of v.bindings){const matches=doc.slots.filter(s=>s.selectorId===b.selectorId);assert(b.assetSha256===asset&&matches.length===1&&matches[0].materialId===b.baseMaterialId&&doc.materials[b.baseMaterialId]&&materials[b.materialId]);assert(!slots.has(b.selectorId));slots.add(b.selectorId);}
   const changes=Object.entries(v.exactAfterFinish).filter(([k,x])=>v.exactBeforeFinish[k]!==x);
   return{id:'pair-'+n,label:changes.map(([k,x])=>k+' = '+x).join(' · '),values:{...v.exactAfterFinish},patch:{bindings:v.bindings,remove:[],assets:[]}};
  });
  return[{id:'visual-own-exact-pairs-'+index,label:'Tiksliai stebėtos pilnos apdailos',context:index,construction:{...context.dimensions},variants:[],requiredAssets:[asset],groups:[],branches:[],singles}];
 });
}
/** Admit supplied complete before/after tuples only; never infer a colour cross-product. */
export function admitVisualOwnFinishes(input:{code:string;runtimeSha256:string;runtime:ChairPreview['runtime'];selectors:ChairPreview['selectors'];profile:Profile;materials:Record<string,unknown>}):QualifiedWitness{
 const{code,runtimeSha256,runtime,selectors,profile,materials}=input;
 assert(profile.schema==='exact-saved-own-pair-bindings-329-visual930100-v1'&&profile.code===code&&runtime.code===code&&profile.runtimeSha256===runtimeSha256);
 assert(profile.actualPaletteComplete===false&&profile.independentFinishCompositionAllowed===false&&runtime.contexts.length===1&&profile.variants.length>0);
 const context=runtime.contexts[0];assert(context.invariant&&context.groups.length===0&&selectors.schema==='canonical-world-primitive-selectors-329-v1');const asset=context.invariant.sha256,doc=selectors.assets[asset];assert(doc&&doc.assetSha256===asset);
 const first=profile.variants[0],seen=new Set<string>();
 const singles=profile.variants.map(v=>{
  assert(v.contextIndex===0&&v.targetWholeGeometryUvWorldPbrReconstructed===true&&v.independentFinishCompositionAllowed===false);
  assert(tuple(v.allFunctionalConstructionValues)===tuple(first.allFunctionalConstructionValues)&&tuple(v.exactBeforeFinish)===tuple(first.exactBeforeFinish));
  assert(Object.entries(context.dimensions).every(([k,x])=>v.allFunctionalConstructionValues[k]===x));
  assert.deepEqual(Object.keys(v.exactAfterFinish).sort(),['CPRICEGROUP','CUPHCOLOR','CUPHGROUP']);assert.deepEqual(Object.keys(v.exactBeforeFinish).sort(),['CPRICEGROUP','CUPHCOLOR','CUPHGROUP']);
  const id=tuple(v.exactAfterFinish);assert(!seen.has(id)&&id!==tuple(v.exactBeforeFinish));seen.add(id);const slots=new Set<string>();assert(v.bindings.length>0);
  for(const b of v.bindings){const matches=doc.slots.filter(s=>s.selectorId===b.selectorId);assert(b.assetSha256===asset&&matches.length===1&&matches[0].materialId===b.baseMaterialId&&doc.materials[b.baseMaterialId]&&materials[b.materialId]);assert(!slots.has(b.selectorId));slots.add(b.selectorId);}
  return{id:v.exactAfterFinish.CUPHGROUP+'-'+v.exactAfterFinish.CUPHCOLOR,label:v.exactAfterFinish.CUPHGROUP+' · '+v.exactAfterFinish.CUPHCOLOR,values:v.exactAfterFinish,patch:{bindings:v.bindings,remove:[],assets:[]}};
 });
 return{id:'visual-own-exact-pairs',label:'Tiksliai stebėtos pilnos apdailos',context:0,construction:{...context.dimensions},variants:[],requiredAssets:[asset],groups:[],branches:[],singles};
}
