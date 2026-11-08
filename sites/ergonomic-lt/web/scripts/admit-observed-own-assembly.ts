import assert from'node:assert/strict';
import type{ChairPreview,ChairSelectors}from'../src/lib/chair-preview';
import type{QualifiedWitness}from'../src/lib/chair-qualified-colors';
import{validateChairReviewComponents}from'../src/lib/chair-components';
const tuple=(v:Record<string,string>)=>JSON.stringify(Object.entries(v).sort());
/** Finite observed assemblies only. Broader original runtime predicates are never imported. */
export function admitObservedOwnAssembly(input:{code:string;sourceRuntimeSha256:string;source:any;profile:any;selectors:any;materials:Record<string,unknown>;transport:Record<string,{sha256:string;bytes:number}>}){
 const{code,sourceRuntimeSha256,materials,transport}=input;
 const source=structuredClone(input.source),profile=structuredClone(input.profile);
 assert(source.schema==='actual-closed-own-visible-assembly-runtime-940000-v1'&&source.code===code&&source.allPossibleConstructionCombinationsIncluded===false&&source.originalFullGraphClosed===false&&source.mainRuntimeGeometryOwnershipQualified===false&&source.newFullFormOrNative10Claim===false);
 assert(source.visuals.length>0&&source.visuals.length<=100&&source.visuals.every((v:any,i:number)=>v.visualIndex===i&&v.actualWholeGeometryUvWorldPbrReconstructed===true&&v.assets.length>0&&v.assets.length<=10));
 assert(profile.schema==='exact-own-saved-pair-colour-bindings-940000-v1'&&profile.code===code&&profile.runtimeSha256===sourceRuntimeSha256&&profile.actualPaletteComplete===false&&profile.independentFinishCompositionAllowed===false&&profile.notOtherVisualOrCodeBindings===true&&Array.isArray(profile.unrepresentedPairs));
 assert(profile.unrepresentedPairs.every((p:any)=>typeof p.field==='string'&&/^[A-Z][A-Z0-9_]*$/.test(p.field)&&['GEOMETRY_OR_UV_CHANGE_REQUIRES_PART_SWAP','EXACT_OWN_BEFORE_ASSEMBLY_NOT_UNIQUE_IN_SCOPED_VISUALS'].includes(p.reason)));
 const textOnlyFinishStates:{context:number;values:Record<string,string>;originalValues:Record<string,string>;changedFields:string[]}[]=[];
 profile.variants=profile.variants.filter((p:any)=>{
  assert(Array.isArray(p.bindings));if(p.bindings.length)return true;
  const v=source.visuals[p.visualIndex];
  assert(v&&p.independentFinishCompositionAllowed===false&&p.wholeGeometryUvWorldPbrMatch===true&&p.beforeFactorySha256===v.sourceFactorySha256&&p.afterFactorySha256===p.beforeFactorySha256,'EMPTY_BINDING_IS_NOT_A_PROVEN_UNCHANGED_FACTORY_STATE');
  assert.equal(tuple(p.exactConstructionValues),tuple(v.actualObservedStructuralValues));assert.deepEqual(Object.keys(p.exactBeforeFinish).sort(),Object.keys(p.exactAfterFinish).sort());
  const changedFields=Object.keys(p.exactAfterFinish).filter(k=>p.exactAfterFinish[k]!==p.exactBeforeFinish[k]);assert(changedFields.length>0&&changedFields.every(k=>typeof p.exactAfterFinish[k]==='string'));
  textOnlyFinishStates.push({context:p.visualIndex,values:{...p.exactAfterFinish},originalValues:{...p.exactBeforeFinish},changedFields});return false;
 });
 // A complete finish may belong to an explicitly observed functional tuple that
 // shares its representative's exact factory assembly. Keep that tuple separate;
 // never apply its palette to the representative's different product metadata.
 const finishConstructionAliases:{context:number;representativeContext:number;values:Record<string,string>;factorySha256:string}[]=[],aliases=new Map<string,number>();
 for(const p of profile.variants){
  const v=source.visuals[p.visualIndex];assert(v);
  if(tuple(p.exactConstructionValues)===tuple(v.actualObservedStructuralValues))continue;
  const representativeContext=p.visualIndex,key=representativeContext+':'+tuple(p.exactConstructionValues);
  const m=source.observedFunctionalMappings.find((m:any)=>m.visualIndex===representativeContext&&tuple(m.actualObservedValues)===tuple(p.exactConstructionValues)&&m.actualProductMetadataPreserved===true&&m.rescaleGeometryFromHeightMetadata===false&&m.mode==='EXACT_OBSERVED_STATIC_APPEARANCE'&&m.approximationExplicit===false&&m.actualFactorySourceSha256===p.beforeFactorySha256&&m.targetFactorySourceSha256===v.sourceFactorySha256);
  assert(m&&p.beforeFactorySha256===v.sourceFactorySha256&&p.wholeGeometryUvWorldPbrMatch===true,'FINISH_FUNCTIONAL_TUPLE_NOT_EXACTLY_OBSERVED');
  let context=aliases.get(key);
  if(context===undefined){context=Number(source.visuals.length);aliases.set(key,context);source.visuals.push({...v,visualIndex:context,actualObservedStructuralValues:{...m.actualObservedValues}});source.observedFunctionalMappings.push({...m,visualIndex:context});finishConstructionAliases.push({context,representativeContext,values:{...m.actualObservedValues},factorySha256:v.sourceFactorySha256});}
  p.visualIndex=context;
 }
 const raw=input.selectors;assert(raw.schema==='canonical-world-primitive-selectors-329-v1'&&raw.scope.code===code&&raw.scope.runtimeSha256===sourceRuntimeSha256);
 const selectors:ChairSelectors={schema:raw.schema,assets:{}};
 const part=(a:any)=>{assert(a.file==='assets/'+a.sha256+'.glb');const t=transport[a.sha256],s=raw.assets[a.sha256];assert(t&&/^[a-f0-9]{64}$/.test(t.sha256)&&t.bytes>0&&t.bytes<=25*1024*1024&&s?.assetSha256===a.sha256);
  for(const slot of s.slots){const m=raw.originalNodeMapping[a.sha256]?.[slot.selectorId];assert(m&&m.canonicalWorldNodeIndex===slot.sourceNodePath[0]&&m.primitiveIndex===slot.primitive);assert.deepEqual(m.originalWorldMatrix,slot.transformChain[0].matrix);}
  selectors.assets[t.sha256]={...s,assetSha256:t.sha256};return{file:'assets/'+t.sha256+'.glb',sha256:t.sha256,componentSha256:t.sha256,bytes:t.bytes,needsCompression:false as const};};
 const runtime:ChairPreview['runtime']={schema:'desk-components-065-v1',code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:source.visuals.map((v:any)=>{assert(new Set(v.assets.map((a:any)=>a.sha256)).size===v.assets.length);const parts=v.assets.map(part);return{dimensions:{...v.actualObservedStructuralValues},choiceRules:'conditional selectable tuples only',invariant:parts[0],groups:parts.slice(1).map((asset:any)=>({fields:[],variants:[{values:{},asset}]})),textOnly:{},hybrid141:true};})};
 validateChairReviewComponents(runtime,code);
 const witnesses:QualifiedWitness[]=[],originalFinishByContext:Record<string,Record<string,string>>={},functionalMappings:Record<string,{values:Record<string,string>;approximation:boolean;mode:string}[]>={};
 for(const v of source.visuals){
  const variants=profile.variants.filter((p:any)=>p.visualIndex===v.visualIndex),active=new Set(v.assets.map((a:any)=>a.sha256));
  originalFinishByContext[v.visualIndex]=variants[0]?.exactBeforeFinish||{};
  const mappings=source.observedFunctionalMappings.filter((m:any)=>m.visualIndex===v.visualIndex);assert(mappings.length>0);functionalMappings[v.visualIndex]=mappings.map((m:any)=>{assert(m.actualProductMetadataPreserved===true&&m.rescaleGeometryFromHeightMetadata===false&&m.targetFactorySourceSha256===v.sourceFactorySha256);assert(m.mode==='EXACT_OBSERVED_STATIC_APPEARANCE'&&m.approximationExplicit===false||m.mode==='NEAREST_VISUAL_MODEL_DIRECT_ROKO'&&m.approximationExplicit===true);return{values:m.actualObservedValues,mode:m.mode,approximation:m.approximationExplicit};});
  const seenMappings=new Set<string>();functionalMappings[v.visualIndex]=functionalMappings[v.visualIndex].filter(m=>{const k=tuple(m.values)+':'+m.mode+':'+m.approximation;if(seenMappings.has(k))return false;seenMappings.add(k);return true;});
  functionalMappings[v.visualIndex].sort((a,b)=>Number(tuple(a.values)!==tuple(v.actualObservedStructuralValues))-Number(tuple(b.values)!==tuple(v.actualObservedStructuralValues)));assert(tuple(functionalMappings[v.visualIndex][0].values)===tuple(v.actualObservedStructuralValues));
  if(!variants.length)continue;const seen=new Set<string>(),first=variants[0];
  const singles=variants.map((p:any,n:number)=>{assert(p.independentFinishCompositionAllowed===false&&p.wholeGeometryUvWorldPbrMatch===true&&p.beforeFactorySha256===v.sourceFactorySha256);assert.equal(tuple(p.exactConstructionValues),tuple(v.actualObservedStructuralValues));assert.equal(tuple(p.exactBeforeFinish),tuple(first.exactBeforeFinish));assert.deepEqual(Object.keys(p.exactBeforeFinish).sort(),Object.keys(p.exactAfterFinish).sort());const key=tuple(p.exactAfterFinish);assert(!seen.has(key)&&key!==tuple(p.exactBeforeFinish));seen.add(key);assert(p.bindings.length>0);const slots=new Set<string>();
   const bindings=p.bindings.map((b:any)=>{const s=raw.assets[b.assetSha256],matches=s?.slots.filter((x:any)=>x.selectorId===b.selectorId);assert(active.has(b.assetSha256)&&matches?.length===1&&matches[0].materialId===b.baseMaterialId&&materials[b.materialId]);const key=b.assetSha256+':'+b.selectorId;assert(!slots.has(key));slots.add(key);return{...b,assetSha256:transport[b.assetSha256].sha256};});
   return{id:'pair-'+n,label:Object.entries(p.exactAfterFinish).filter(([k,x])=>p.exactBeforeFinish[k]!==x).map(([k,x])=>k+' = '+x).join(' · '),values:p.exactAfterFinish,patch:{bindings,remove:[],assets:[]}};
  });
  witnesses.push({id:'observed-own-visual-'+v.visualIndex,label:'Tiksliai stebėtos pilnos apdailos',context:v.visualIndex,construction:{...v.actualObservedStructuralValues},variants:Array(v.assets.length-1).fill(0),requiredAssets:v.assets.map((a:any)=>transport[a.sha256].sha256),groups:[],branches:[],singles});
 }
 assert(profile.variants.every((p:any)=>source.visuals[p.visualIndex]));
 return{runtime,selectors,witnesses,originalFinishByContext,functionalMappings,finishConstructionAliases,textOnlyFinishStates};
}
