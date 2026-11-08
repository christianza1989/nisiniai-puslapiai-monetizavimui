import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {ChairPreview} from '../src/lib/chair-preview';
import {validateChairReviewComponents} from '../src/lib/chair-components';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const tuple=(v:Record<string,string>)=>JSON.stringify(Object.entries(v).sort());
/** Append declared OWN defaults only; previous palette contexts retain their indices. */
export function admitAdditionalOwnVisuals(input:{prior:ChairPreview;priorSource:any;priorManifestSha256:string;additional:any;selectors:any;transport:Record<string,{sha256:string;bytes:number;asset:string}>;additionalManifestSha256:string}){
 const {additional:a,selectors:raw,transport}=input,prior:any=input.prior;
 assert(a.schema==='additional-actual-own-visual-source-contrasts-950000-v1'&&a.code===prior.code&&a.priorManifestSha256===input.priorManifestSha256);
 assert(a.priorRuntimeSha256===prior.observedOwnSource.runtimeSha256&&a.actualPaletteComplete===false&&a.actualSourceOnlyNoCartesianCompletion===true&&a.noOtherChairGeometryUsed===true&&a.newNativeRequests===0&&a.newExports===0);
 assert(raw.schema==='canonical-world-primitive-selectors-329-v1'&&raw.scope.code===a.code&&raw.scope.defaultSourceOnly===true&&a.additionalVisuals.length>0&&a.additionalVisuals.length<=100);
 assert(input.priorSource.code===a.code&&input.priorSource.schema==='actual-closed-own-visible-assembly-runtime-940000-v1');
 const review:any=structuredClone(prior),start=review.runtime.contexts.length,ids=new Map<string,number>();
 const defaultProofs:any[]=[];
 for(const v of a.additionalVisuals){
  assert(typeof v.additionalVisualId==='string'&&!ids.has(v.additionalVisualId)&&v.defaultOwnSourceWitnessOnly===true&&v.originalNodeWorldAndPrimitiveCounterVerified===true&&v.newNative10OrPaletteClaim===false);
  assert(v.assetFile==='assets/'+v.sourceAssetSha256+'.glb'&&Object.keys(v.actualObservedValues).length&&Object.keys(v.exactObservedDefaultFinish).length);
  const t=transport[v.sourceAssetSha256],s=raw.assets[v.sourceAssetSha256];assert(t&&t.bytes>0&&t.bytes<=25*1024*1024&&s?.assetSha256===v.sourceAssetSha256);
  for(const slot of s.slots){const m=raw.originalNodeMapping[v.sourceAssetSha256]?.[slot.selectorId];assert(m&&m.canonicalWorldNodeIndex===slot.sourceNodePath[0]&&m.primitiveIndex===slot.primitive);assert.deepEqual(m.originalWorldMatrix,slot.transformChain[0].matrix);}
  const context=review.runtime.contexts.length;ids.set(v.additionalVisualId,context);
  review.runtime.contexts.push({dimensions:{...v.actualObservedValues},choiceRules:'conditional selectable tuples only',invariant:{file:'assets/'+t.sha256+'.glb',sha256:t.sha256,componentSha256:t.sha256,bytes:t.bytes,needsCompression:false},groups:[],textOnly:{},hybrid141:true});
  review.assets[t.sha256]={asset:t.asset,assetSha256:t.sha256,bytes:t.bytes};review.selectors.assets[t.sha256]={...s,assetSha256:t.sha256};
  review.visualMetadataByContext[context]={values:{...v.actualObservedValues},sameStaticAppearanceObservations:[]};review.originalFinishByContext[context]={...v.exactObservedDefaultFinish};
  review.visualFunctionalMappings[context]=[{values:{...v.actualObservedValues},approximation:false,mode:'ACTUAL_ADDITIONAL_OWN_SOURCE'}];
  defaultProofs.push({context,sourceSha256:v.sourceAssetSha256,derivedSha256:t.sha256,values:v.actualObservedValues,exactDefaultFinish:v.exactObservedDefaultFinish});
 }
 const removedSupersededMappings:any[]=[];
 for(const m of a.observedFunctionalMappings){
  assert(m.preserveProductMetadata===true&&Object.keys(m.actualObservedValues).length&&/^[a-f0-9]{64}$/.test(m.sourceFactorySha256));
  const keys=Object.keys(m.target);assert(keys.length===1&&['additionalVisualId','priorVisualId'].includes(keys[0]));
  const context=m.target.additionalVisualId!==undefined?ids.get(m.target.additionalVisualId):Number(m.target.priorVisualId);
  assert(context!==undefined&&Number.isInteger(context)&&context>=0&&context<review.runtime.contexts.length&&(m.target.priorVisualId===undefined||context<start));
  if(m.mode==='ACTUAL_ADDITIONAL_OWN_SOURCE'){
   const v=a.additionalVisuals.find((v:any)=>v.additionalVisualId===m.target.additionalVisualId);assert(v&&v.sourceAssetSha256===m.sourceFactorySha256&&tuple(v.actualObservedValues)===tuple(m.actualObservedValues));
   // Replace only an older functional representative for the exact same tuple.
   for(let i=0;i<start;i++)review.visualFunctionalMappings[i]=review.visualFunctionalMappings[i].filter((old:any,n:number)=>{const remove=n>0&&tuple(old.values)===tuple(m.actualObservedValues);if(remove)removedSupersededMappings.push({context:i,mapping:old});return !remove;});
  }else{
   assert(m.mode==='EXACT_OBSERVED_STATIC_APPEARANCE'&&!m.approximationExplicit||m.mode==='NEAREST_VISUAL_MODEL_DIRECT_ROKO'&&m.approximationExplicit===true);
   if(m.mode==='EXACT_OBSERVED_STATIC_APPEARANCE'){
    const targetSha=m.target.additionalVisualId!==undefined?a.additionalVisuals.find((v:any)=>v.additionalVisualId===m.target.additionalVisualId)?.sourceAssetSha256:input.priorSource.visuals[context]?.sourceFactorySha256;
    assert(targetSha===m.sourceFactorySha256,'EXACT_MAPPING_FACTORY_BODY_MISMATCH');
   }
  }
  const row={values:{...m.actualObservedValues},approximation:m.approximationExplicit===true,mode:m.mode};
  const list=review.visualFunctionalMappings[context];assert(list);
  if(!list.some((x:any)=>tuple(x.values)===tuple(row.values)&&x.approximation===row.approximation))list.push(row);
 }
 validateChairReviewComponents(review.runtime,a.code);
 const runtimeSha256=hash(JSON.stringify(review.runtime));review.runtimeSha256=runtimeSha256;review.palette.runtimeSha256=runtimeSha256;review.qualified.runtimeSha256=runtimeSha256;
 assert.deepEqual(review.qualified.witnesses,prior.qualified.witnesses);assert.deepEqual(review.runtime.contexts.slice(0,start),prior.runtime.contexts);
 review.observedAdditionalOwnSource={schema:a.schema,manifestSha256:input.additionalManifestSha256,priorManifestSha256:a.priorManifestSha256,priorRuntimeSha256:a.priorRuntimeSha256,contexts:defaultProofs,fullPalette:false,independentFinishCompositionAllowed:false};
 return {review,defaultProofs,removedSupersededMappings,previousContexts:start};
}
