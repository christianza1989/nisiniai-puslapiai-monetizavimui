/** Finite receiving profiles. No code-only binding or new factory requests. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sourcePins from './remaining-chair-scope-pins.json';
import type {ChairPreview} from '../src/lib/chair-preview';
import type {BaseObservedPalette} from '../src/lib/chair-color-admission';
import {validateChairReviewComponents} from '../src/lib/chair-components';

type Obj=Record<string,any>;
export const remainingChairScopePins=sourcePins as Record<string,Obj>;
const canonical=(v:any):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const equal=(a:any,b:any,message:string)=>assert.equal(canonical(a),canonical(b),message);
const records=(v:any):Obj[]=>Array.isArray(v)?v:Object.values(v||{});
const scalar=(v:any)=>typeof v==='string'&&v.length>0&&v.length<=100&&!/[\x00-\x1f]/.test(v);
const finish=(code:string,raw:Obj)=>Object.fromEntries(Object.entries(raw).filter(([k])=>k.startsWith(code+'_FINISHES.')).map(([k,v])=>[k.split('.')[1],v]));

export function assertRemainingChairHeaders(code:string,version:string,manifest:string,headers:Map<string,{sha256:string}>){
 const p=remainingChairScopePins[code];assert(p&&p.version===version&&p.manifestSha256===manifest,'Unknown finite package version/manifest');
 for(const [file,hash]of Object.entries(p.headers))assert.equal(file==='SHA256SUMS.json'?manifest:headers.get(file)?.sha256,hash,'Pinned package header differs: '+file);
 return p;
}

/** Each library option carries its complete observed controller tuple. Other
 * finishes return to the original OWN baseline; options never accumulate. */
export function calibratedChairLibrary(data:ChairPreview,d:Obj){
 const p=remainingChairScopePins[data.code];assert(p?.kind==='calibrated-library'&&p.runtime===data.runtimeSha256,'Unknown calibrated target runtime');
 assert(d.schema==='chair-color-library-reuse-329-v1'&&d.code===data.code&&d.independentCompositionValidated===false&&d.geometryReusedFromOtherModel===false&&d.applyOnlyAtExactTargetWitnessConstruction===true&&d.applyAssignmentsToExactOwnedRuntimeBaseline===true&&d.requireOtherFinishValuesMatchTargetBase===true,'Calibrated library scope differs');
 assert(d.qualifiedSourceDonor515ProofSha256==='5d0654649965ae2052ab911164f76e53463e2bd0b7d039b8987f14a9385b6815'&&d.reuse682ProofSha256==='58c5a06bb78a54c0dd6c31b8a76e12435599f6fa3bb35a23618b4394e2a159c9','Calibrated proof differs');
 assert(d.fields.length===p.scopes.length,'Calibrated scopes omitted or added');
 return d.fields.map((f:Obj,index:number)=>{
  const pin=p.scopes[index];equal(f.commonGroupFields,pin.fields,'Calibrated atomic fields differ');equal(f.requiredCausalPartControllerContext,pin.prefix,'Calibrated observed prefix differs');
  assert(f.field===pin.field&&f.targetRuntimeContextIndex===pin.context&&f.targetRuntimeSha256===p.runtime&&f.actualSeries==='2ME'&&f.donorCode==='K2ME003WW001','Calibrated field/runtime differs');
  assert(f.commonGroupTupleMustApplyAtomically===true&&f.geometryReusedFromOtherModel===false&&f.independentTargetCompositionValidated===false&&f.generalizedAcrossTargetGeometryContexts===false&&f.paletteComplete===false&&f.applyAssignmentsToExactOwnedRuntimeBaselineSelectors===true&&f.requireOtherFinishValuesOutsideMeasuredGroupMatchRuntimeBaseline===true,'Calibrated inference escaped its measured target');
  const baseline=finish(data.code,f.targetRuntimeBaselineFullActualState),scope=finish(data.code,f.targetBaseFullActualState);
  equal(Object.keys(f.targetBaseFullActualState).sort(),Object.keys(f.targetRuntimeBaselineFullActualState).sort(),'Calibrated full target state is incomplete');
  for(const [key,value]of Object.entries(f.targetBaseFullActualState))if(!key.startsWith(data.code+'_FINISHES.'))assert.equal(value,f.targetRuntimeBaselineFullActualState[key],'Calibrated target crossed an original construction');
  for(const [key,value]of Object.entries(scope))if(!pin.fields.includes(key))assert.equal(value,baseline[key],'Unmeasured finish differs from the original target');
  if(data.palette.schema==='chair-base-observed-colours-v1')for(const [key,value]of Object.entries(data.palette.baselineObservedFinish))assert.equal(value.value,baseline[key],'Published original finish differs from calibrated baseline');
  const values=records(f.values);assert(values.length===pin.count,'Calibrated domain count differs');const seen=new Set<string>();
  for(const v of values){
   equal(Object.keys(v.targetFullReachableGroupValues||{}).sort(),[...pin.fields].sort(),'Split calibrated common tuple');
   for(const [key,value]of Object.entries(pin.prefix))assert.equal(v.targetFullReachableGroupValues[key],value,'Calibrated option escaped its prefix');
   assert(['material','unchanged'].includes(v.mode)&&scalar(v.value)&&v.targetFullReachableGroupValues[f.field]===v.value&&v.libraryPbrInferenceNotNewTargetFullNativeExport===true&&v.validationKind==='QUALIFIED_GROUP515_AND_ACTUAL_TARGET_COMMON_NATIVE_PBR_COUNTER_AGREEMENT','Calibrated option is not declared target library inference');
   assert(!v.removeOwnSelectors&&!v.addOwnManufacturerAsset,'Library inference cannot change geometry');
   if(v.mode==='unchanged'){
    assert(v.hasPriorTargetNativeCommonValueProof===true&&!(v.assignments||[]).length,'Original no-op is not measured');
    for(const field of pin.fields)assert.equal(v.targetFullReachableGroupValues[field],baseline[field],'Original no-op changed a common tuple value');
   }else assert(v.assignments?.length,'Material inference has no OWN assignments');
   const key=canonical(v.targetFullReachableGroupValues);assert(!seen.has(key),'Duplicate calibrated tuple');seen.add(key);
  }
  return {source:f,values,baseline};
 });
}

/** New OWN runtimes remain separate from existing Native products. The
 * producer qualification is evidence for this exact asset, not code aliases. */
export function ownChairScope(code:string,runtimeSha:string,documents:Record<string,Obj>){
 const p=remainingChairScopePins[code],d=documents['colors-groups.json'],c=documents['own-source-contract.json'],q=documents['native10-qualification.json'];
 assert(p?.kind==='new-own'&&p.runtime===runtimeSha&&c?.schema===p.contract&&d?.schema===p.palette,'Unknown new OWN runtime scope');
 for(const v of [c,d])assert(v.code===code&&v.runtimeSha256===runtimeSha&&v.actualPaletteComplete===false&&v.allGeometryContextsCovered===false&&v.existingMainRuntimeGeometryOwnershipQualified===false&&v.sourceRuntimeOwnership==='NEW_PC2_OWN_NATIVE_WITNESS','OWN runtime was promoted or rebound by code');
 assert(c.version===p.version&&c.kind===p.sourceKind&&c.exactOwnConstructionOnly===true&&c.neverApplyToAnotherAssetOrRuntimeByCodeAlone===true&&c.baselineAssetSha256===p.asset&&c.qualificationSha256===p.qualification&&c.witnessFullActualTupleSha256===p.witness,'OWN contract identity differs');
 assert(d.ownSourceContractSha256===p.headers['own-source-contract.json']&&d.witnessActualTupleSha256===p.witness&&d.runtimeContextIndex===0&&d.qualifiedByDecision353===true,'OWN palette contract differs');
 equal(d.requiredOwnedBaseAssetShas,[p.asset],'OWN exact assembly differs');equal(d.fixedObservedFinishValues,p.fixed,'OWN fixed finish metadata differs');
 assert(q?.code===code&&q.pass===true&&q.tested===10&&q.passed===10&&q.actualDistinctNativeSignatures===10&&q.actualWholeStates===p.count&&q.sourceQualificationSha256===p.qualification&&q.mainRuntimeGeometryOwnershipQualified===false&&q.allGeometryUvOriginalWorldPbrReconstructionsMatched===true,'OWN native qualification is incomplete');
 assert(c.actualGroupValueRecords===p.count&&c.actualWholeStates===p.count&&c.nativeJointFullStates===10&&c.nativeJointDistinctSignatures===10&&d.groups.length===1,'OWN finite evidence counts differ');
 const nadir=code==='KNAD001WW002',lynx=code==='KLYN003WW002';
 assert(nadir?c.qualifiedConditionalConstructionPaletteComplete===true&&d.qualifiedConditionalConstructionPaletteComplete===true&&c.qualifiedWitnessGroupPaletteComplete===false&&d.qualifiedWitnessGroupPaletteComplete===false&&q.original432ScopedContextPositiveAndSevenNegativesPassed===true:c.qualifiedWitnessGroupPaletteComplete===true&&d.qualifiedWitnessGroupPaletteComplete===true&&q.original432PositiveAndSevenNegativesPassed===true,'OWN finite qualification kind differs');
 const g=d.groups[0],values=records(g.values);equal(g.fields,p.fields,'OWN atomic tuple fields differ');assert(g.completeActualPostPrefixDomain===true&&g.actualGroupValueCount===p.count&&values.length===p.count,'OWN domain incomplete');
 const targets=new Set(g.ownedBaselineSelectors.map((s:Obj)=>s.assetSha256+':'+s.selectorId));assert(targets.size===p.selectors&&g.ownedBaselineSelectors.every((s:Obj)=>s.assetSha256===p.asset),'OWN selector ownership differs');
 if(lynx){equal(c.activeSelectableFinishFields,['CPRICEGROUP','CUPHCOLOR'],'Readonly derived field became selectable');equal(c.coupledReadonlyDerivedFinishFields,['CUPHGROUP'],'Derived finish field differs');assert(c.derivedCuphgroupIsNotASecondColourMenu===true&&d.coupledDerivedValuesVaryBySelectedTuple===true,'Coupled derived values were split');}
 const seen=new Set<string>();
 for(const v of values){
  equal(Object.keys(v.values||{}).sort(),[...p.fields].sort(),'Incomplete OWN whole tuple');assert(Object.values(v.values).every(scalar)&&['material','unchanged'].includes(v.mode)&&!v.removeOwnSelectors&&!v.addOwnManufacturerAsset,'OWN material scope granted geometry');
  const bindings=v.bindings||[];assert(v.mode==='unchanged'?bindings.length===0:bindings.length===targets.size&&new Set(bindings.map((b:Obj)=>b.assetSha256+':'+b.selectorId)).size===targets.size&&bindings.every((b:Obj)=>targets.has(b.assetSha256+':'+b.selectorId)),'OWN material binding escaped its measured selectors');
  if(lynx){equal(Object.keys(v.derivedFinishValues||{}),['CUPHGROUP'],'Missing readonly derived tuple value');assert(scalar(v.derivedFinishValues.CUPHGROUP),'Invalid readonly derived finish');}
  else assert(!v.derivedFinishValues||!Object.keys(v.derivedFinishValues).length,'Undeclared derived tuple');
  const key=canonical(v.values);assert(!seen.has(key),'Duplicate OWN tuple');seen.add(key);
 }
 assert(values.filter(v=>canonical(v.values)===canonical(g.baseValues)).length===1,'OWN original tuple absent');
 let structural:Record<string,{value:string;supportedValues:string[]}>|undefined;
 if(nadir){
  const expected={CCASTORS:{editable:true,visible:true,fixedValue:'SH',qualifiedProperty:code+'_OPTIONS.CCASTORS',role:'FIXED_SELECTABLE_CONSTRUCTION_RESTRICTION_NOT_READONLY',sourceSelectableValues:['SH','SHH'],supportedScopeValues:['SH'],unqualifiedValues:['SHH']}};
  equal(c.fixedSelectableStructuralFields,expected,'Caster construction restriction changed');equal(d.fixedSelectableStructuralFields,expected,'Caster palette restriction changed');
  assert(c.fullFormQualified===false&&d.fullFormQualified===false&&q.fullFormQualified===false&&c.scopeContractSha256===p.headers['construction-scope.json'],'Unsupported full-form/caster promotion');
  assert(d.exactConstructionAndDerivedValues[code+'_OPTIONS.CCASTORS']==='SH','Unqualified caster construction');structural={CCASTORS:{value:'SH',supportedValues:['SH']}};
 }
 return {palette:d,contract:c,group:g,values,atomic:lynx||nadir,structural};
}

export function ownChairOriginalPalette(input:Obj,code:string,runtimeSha256:string,documents:Record<string,Obj>):BaseObservedPalette{
 const scope=ownChairScope(code,runtimeSha256,documents),p=remainingChairScopePins[code];
 assert(!input.schema&&input.code===code&&input.actualPaletteComplete===false&&input.allGeometryContextsCovered===false&&input.ownSourceContract==='own-source-contract.json'&&input.ownSourceContractSha256===p.headers['own-source-contract.json']&&input.qualifiedGroupPalette==='colors-groups.json'&&input.qualifiedGroupPaletteWitnessCount===1,'Unknown OWN original-palette reference');
 assert(Object.keys(scope.palette.baseFinishValues).length<=30&&Object.values(scope.palette.baseFinishValues).every(scalar),'Invalid OWN original finish');
 return {schema:'chair-base-observed-colours-v1',sourceSchema:'qualified-own-original-reference-111-v1',code,runtimeSha256,actualPaletteComplete:false,independentFinishCompositionAllowed:false,availableMaterialBindings:[],baselineObservedFinish:Object.fromEntries(Object.entries(scope.palette.baseFinishValues).map(([field,value])=>[field,{value:String(value),knownCurrentPrefixChoices:[]}]))};
}

/** Transport-only view of one qualified fixed OWN scene. Original input
 * bytes, dimensions, component identity and asset payloads stay untouched.
 * The empty null group has one empty tuple and adds no selectable state. */
export function ownChairRuntimeView(bytes:Uint8Array,code:string,documents:Record<string,Obj>){
 const sourceSha=createHash('sha256').update(bytes).digest('hex'),p=remainingChairScopePins[code];
 assert(p?.kind==='new-own'&&sourceSha===p.runtime,'Unknown exact OWN runtime bytes');
 const scope=ownChairScope(code,sourceSha,documents),raw=JSON.parse(Buffer.from(bytes).toString('utf8'));
 assert(raw.schema==='desk-components-065-v1'&&raw.code===code&&raw.coordinates==='original-world-matrices'&&raw.sourceRuntimeOwnership==='NEW_PC2_OWN_NATIVE_WITNESS'&&raw.fullGraphClosed===false&&raw.finishPolicy==='exact Own group palette; no context extrapolation'&&raw.contexts.length===1,'Unknown fixed OWN source policy');
 const c=raw.contexts[0],a=c.invariant;
 assert(c.choiceRules==='only this exact causally-owned construction'&&c.groups.length===0&&a?.sha256===p.asset&&a.file==='assets/'+p.asset+'.glb'&&a.needsCompression===false,'OWN source is not one fixed captured scene');
 equal(c.default3DValues,{},'OWN snapshot has unqualified dynamic defaults');equal(c.textOnly,{},'OWN snapshot has unqualified text choices');
 const construction=Object.fromEntries(Object.entries(scope.palette.exactConstructionAndDerivedValues).map(([key,value])=>[key.split('.')[1],value]));
 equal(c.dimensions,construction,'OWN snapshot construction differs from its qualification');
 const runtime=structuredClone(raw),sourceFile=a.file,targetFile='assets/'+a.componentSha256+'.glb';
 runtime.finishPolicy='original manufacturer finishes; no FINISH setters';runtime.contexts[0].choiceRules='conditional selectable tuples only';
 runtime.contexts[0].groups=[{fields:[],variants:[{values:{},asset:null}]}];runtime.contexts[0].invariant.file=targetFile;
 validateChairReviewComponents(runtime,code);
 return {runtime,files:{[targetFile]:sourceFile},proof:{kind:'EXACT_FIXED_OWN_RUNTIME_VIEW',sourceRuntimeSha256:sourceSha,sourceCanonicalSha256:createHash('sha256').update(canonical(raw)).digest('hex'),viewCanonicalSha256:createHash('sha256').update(canonical(runtime)).digest('hex'),sourceFile,targetFile,assetSha256:p.asset,assetPayloadChanged:false,originalWorldMatricesChanged:false,capturedContexts:1,addedSelectableStates:0,addedGeometryParts:0,sourcePackageBytesChanged:false}};
}

export function savedAutoChairState(data:ChairPreview,d:Obj){
 const p=remainingChairScopePins[data.code];assert(p?.kind==='saved-auto-state'&&data.runtimeSha256===p.runtime&&d.code===data.code&&d.runtimeSha256===p.runtime,'Unknown saved automatic construction state');
 assert(d.schema==='exact-saved-own-auto-construction-primitive-swap-1301-v1'&&d.actualWholeFactoryCounterMatched===true&&d.independentFinishCompositionAllowed===false&&d.paletteComplete===false&&d.requiresExactActualBeforeAndAfterState===true&&d.requiresNoIndependentFinishComposition===true,'Saved automatic state is not atomic');
 assert(d.baselineFullActualStateSha256==='a0097089064b50d3b698aeafec5fa000ec141a02de343893b7a7be8713a74075'&&d.targetFullActualStateSha256==='fec17a5cf2842b3c50701b9c306b8d633a38024b7d53a03fd11a3a5dbbcfb981','Saved before/after state differs');
 const before=d.beforeActualFullValues,after=d.afterActualFullValues;
 assert.equal(createHash('sha256').update(canonical(before)).digest('hex'),d.baselineFullActualStateSha256,'Automatic original full tuple changed');
 assert.equal(createHash('sha256').update(canonical(after)).digest('hex'),d.targetFullActualStateSha256,'Automatic target full tuple changed');
 const changes=Object.fromEntries(Object.entries(after).filter(([k,v])=>before[k]!==v).map(([k,v])=>[k,[before[k],v]]));
 equal(changes,{'KNAU017WW001_FINISHES.CFOOTRESTMETALCOLOR':['NCSS2005Y60R','CR'],'KNAU017WW001_FINISHES.CFRAMEMETALCOLOR':['NCSS2005Y60R','CR'],'KNAU017WW001_FINISHES.CFRAMEMETALMATERIAL':['STEELPC','STEELCR'],'KNAU017WW001_OPTIONS.CFOOTREST':['FBRAL','FBCR']},'Automatic construction/finish transition differs');
 equal(Object.keys(before).sort(),Object.keys(after).sort(),'Incomplete automatic full state');
 assert(d.removeOwnSelectors.length===1&&d.removeOwnSelectors[0].assetSha256==='bfbf617ba5f03d32b4c8026d697173596b1caaee93533b90314188bd619c239f'&&d.removeOwnSelectors[0].selectorId==='9f28b9cbf1ef98f0310ae1dbbf2344b3b40ada46c991ce5a2f620efc20f09483','Automatic OWN removal differs');
 equal(d.addSameCodeNativeAsset,{bytes:6784376,file:'color-auto-assets/cfd3bd4defa94bbca61c1ec21a15447c0ffbbfe9dffd1482484b3cdba62d130b.glb',sha256:'cfd3bd4defa94bbca61c1ec21a15447c0ffbbfe9dffd1482484b3cdba62d130b'},'Automatic exact target asset differs');
 return {before,after,values:{...finish(data.code,after),CFOOTREST:'FBCR'},patch:{mode:'exact-full-state-primitive-swap',removeOwnSelectors:d.removeOwnSelectors,addOwnManufacturerAsset:d.addSameCodeNativeAsset}};
}
