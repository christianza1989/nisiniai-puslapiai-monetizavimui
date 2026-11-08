/** Finite PC2 310 receiving adapter. No manufacturer calls or code-only rebinding. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {ChairPreview} from '../src/lib/chair-preview';
import type {Asset} from '../src/lib/expanded-configurator';
import type {ChairQualifiedData,QualifiedGroup,QualifiedPatch} from '../src/lib/chair-qualified-colors';
import {validateChairReviewComponents} from '../src/lib/chair-components';
type Obj=Record<string,any>;
export const own2meGbmfPins={code:'K2ME001WW002',version:'colors-20261108-v1-qualified-own-gbmf1003500',manifest:'4a121ec7adfcf2bb766cbd74cdac88adb25ec521813eecd8e2c0dc0d56021e74',runtime:'1353cb831875c0df2d82c62f34750ba062533684cc4b2deca51beb9a17ea78d5',asset:'b9975ccefe9bfdc20af1803f6b7746630fc245a40f7644fd8b0c50abfbe9ef10',contract:'9101a02e593a4bc7efd05ec44b393d1d8a5fbb75e0d904b899dd8bae8d6d5dcd',chrome:'e25a3c4f85e1669c90a2deb4dca0196bef4e6d82e0cab70aa405692d9009fc4c'};
const canonical=(v:any):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const id=(v:any)=>createHash('sha256').update(canonical(v)).digest('hex');
const eq=(a:any,b:any)=>assert.equal(canonical(a),canonical(b));
export function admit2meGbmf(input:{manifest:string;runtimeSha256:string;rawRuntime:Obj;documents:Record<string,Obj>;selectors:ChairPreview['selectors'];materials:Record<string,unknown>;fileAssets:Record<string,Asset>}){
 const p=own2meGbmfPins,{rawRuntime:raw,documents:docs,selectors,materials,fileAssets}=input,c=docs['own-source-contract.json'],d=docs['colors-groups.json'],n=docs['native10-qualification.json'],s=docs['construction-scope.json'];
 assert(input.manifest===p.manifest&&input.runtimeSha256===p.runtime&&raw.code===p.code,'Unknown exact OWN package/runtime');
 assert(c?.schema==='qualified-own-complete-finish-fixed-construction-contract-1003800-v1'&&c.code===p.code&&c.version===p.version&&c.runtimeSha256===p.runtime&&c.baselineAssetSha256===p.asset&&c.exactOwnConstructionOnly===true&&c.neverApplyToAnotherAssetOrRuntimeByCodeAlone===true,'Foreign OWN contract');
 assert(d?.schema==='chair-qualified-own-current-group-palette-1003800-v1'&&d.code===p.code&&d.runtimeSha256===p.runtime&&d.ownSourceContractSha256===p.contract&&d.runtimeContextIndex===0,'Foreign palette');
 for(const v of[c,d])assert(v.actualPaletteComplete===false&&v.allGeometryContextsCovered===false&&v.fullFormQualified===false&&v.qualifiedConditionalConstructionPaletteComplete===true&&v.qualifiedWitnessGroupPaletteComplete===false&&v.existingMainRuntimeGeometryOwnershipQualified===false&&v.sourceRuntimeOwnership==='NEW_PC2_OWN_NATIVE_WITNESS'&&v.unseenFullCombinationsDirectlyFactoryExported===false,'OWN scope promoted');
 assert(n?.pass===true&&n.code===p.code&&n.tested===10&&n.passed===10&&n.actualDistinctNativeSignatures===10&&n.actualWholeStates===555&&n.postprefixDomainRowsVerified===1424&&n.all5ActiveFinishFieldsNondefaultEachSample===true&&n.allGeometryUvOriginalWorldPbrReconstructionsMatched===true&&n.original432ScopedContextPositiveAndSevenNegativesPassed===true&&n.sourceQualificationSha256===c.qualificationSha256,'Incomplete finite qualification');
 eq(c.actualGroupValueCounts,[9,537]);assert(c.actualWholeStates===555&&c.actualPostprefixDomainRows===1424&&c.nativeJointFullStates===10&&c.nativeJointDistinctSignatures===10);
 eq(d.requiredOwnedBaseAssetShas,[p.asset]);eq(d.fixedObservedFinishValues,{CARMPADPLCOLOR:'W'});eq(d.baseFinishValues.CARMPADPLCOLOR,'W');eq(d.witnessActualTupleSha256,c.witnessFullActualTupleSha256);
 const fixed=c.fixedSelectableStructuralFields.CGLIDES;assert(fixed.editable===true&&fixed.fixedValue==='GBMF'&&fixed.role==='FIXED_SELECTABLE_CONSTRUCTION_RESTRICTION_NOT_READONLY');eq(fixed.supportedScopeValues,['GBMF']);eq(fixed.sourceSelectableValues,['NONE','GB','GBF','GBM','GBMF']);eq(c.fixedSelectableStructuralFields,d.fixedSelectableStructuralFields);eq(c.fixedSelectableStructuralFields,s.fixedSelectableStructuralFields);
 assert(raw.schema==='desk-components-065-v1'&&raw.coordinates==='original-world-matrices'&&raw.sourceRuntimeOwnership==='NEW_PC2_OWN_NATIVE_WITNESS'&&raw.fullGraphClosed===false&&raw.contexts.length===1);
 const context=raw.contexts[0],a=context.invariant;assert(context.groups.length===0&&a.sha256===p.asset&&a.file==='assets/'+p.asset+'.glb'&&context.dimensions.CGLIDES==='GBMF');
 eq(context.dimensions,Object.fromEntries(Object.entries(d.exactConstructionAndDerivedValues).map(([k,v])=>[k.split('.')[1],v])));
 const runtime=structuredClone(raw);runtime.finishPolicy='original manufacturer finishes; no FINISH setters';runtime.contexts[0].choiceRules='conditional selectable tuples only';runtime.contexts[0].groups=[{fields:[],variants:[{values:{},asset:null}]}];runtime.contexts[0].invariant.file='assets/'+a.componentSha256+'.glb';validateChairReviewComponents(runtime,p.code);
 assert(selectors.schema==='canonical-world-primitive-selectors-329-v1'&&Object.keys(selectors.assets).length===1&&selectors.assets[p.asset]?.slots.length===7);
 const q:ChairQualifiedData={schema:'chair-qualified-review-v1',code:p.code,runtimeSha256:p.runtime,version:p.version,witnesses:[],legacyScopes:[],materials:{},extraAssets:{},opaqueAssets:[]},owners=new Set<string>();
 const groups:QualifiedGroup[]=d.groups.map((g:Obj,index:number)=>{
  const values:Obj[]=Array.isArray(g.values)?g.values:Object.values(g.values),fields=index===0?['CFRAMEMETALCOLOR','CFRAMEMETALMATERIAL']:['CPRICEGROUP','CUPHCOLOR','CUPHGROUP'];eq(g.fields,fields);assert(g.completeActualPostPrefixDomain===true&&g.actualGroupValueCount===[9,537][index]&&values.length===g.actualGroupValueCount);
  const targets=new Set<string>(g.ownedBaselineSelectors.map((t:Obj)=>t.assetSha256+':'+t.selectorId));assert(targets.size===[1,2][index]);for(const t of targets){assert(t.startsWith(p.asset+':')&&!owners.has(t));owners.add(t);}
  const seen=new Set<string>();const options=values.map((v:Obj)=>{
   eq(Object.keys(v.values).sort(),[...fields].sort());eq(Object.keys(v.fieldRoles).sort(),[...fields].sort());for(const f of fields)assert(v.fieldRoles[f].actualValue===v.values[f]&&typeof v.fieldRoles[f].editable==='boolean');const key=canonical(v.values);assert(!seen.has(key));seen.add(key);
   const patch:QualifiedPatch={bindings:[],remove:[],assets:[]};
   if(v.mode==='primitiveSwap'){
    assert(index===0&&v.values.CFRAMEMETALMATERIAL==='STEELCR'&&v.values.CFRAMEMETALCOLOR==='CR'&&v.fieldRoles.CFRAMEMETALCOLOR.editable===false&&!v.bindings?.length);
    eq(v.removeOwnSelectors,g.ownedBaselineSelectors);const ref=v.addOwnManufacturerAsset,part=fileAssets[ref.file];assert(ref.sha256===p.chrome&&part?.assetSha256===p.chrome&&part.bytes===ref.bytes&&part.bytes!<=25*1024*1024);patch.remove=v.removeOwnSelectors;patch.assets=[part];q.extraAssets[p.chrome]=part;q.opaqueAssets=[p.chrome];
   }else{
    assert(['material','unchanged'].includes(v.mode)&&!v.removeOwnSelectors&&!v.addOwnManufacturerAsset);const bindings=v.bindings||[];assert(v.mode==='unchanged'?bindings.length===0:bindings.length===targets.size);
    const assigned=new Set<string>();for(const b of bindings){const key=b.assetSha256+':'+b.selectorId,slot=selectors.assets[p.asset].slots.find(s=>s.selectorId===b.selectorId);assert(targets.has(key)&&!assigned.has(key)&&slot?.materialId===b.baseMaterialId&&materials[b.materialId]);assigned.add(key);if(b.materialId!==b.baseMaterialId){q.materials[b.materialId]=materials[b.materialId];patch.bindings.push({assetSha256:b.assetSha256,selectorId:b.selectorId,baseMaterialId:b.baseMaterialId,materialId:b.materialId});}}
   }
   return{id:id([v.values,v.mode,v.bindings,v.addOwnManufacturerAsset]),label:fields.map(f=>f+' = '+v.values[f]).join(' · '),values:v.values,patch};
  });const base=options.filter((o:any)=>canonical(o.values)===canonical(g.baseValues));assert(base.length===1);return{id:g.id,label:index===0?'Rėmo apdaila':'Apmušalas',options,base:base[0].id};
 });
 assert(groups.length===2&&q.extraAssets[p.chrome]&&groups[0].options.filter(o=>o.patch.assets.length).length===1);
 q.witnesses=[{id:id([p.runtime,context.dimensions]),label:'GBMF · patikrintos rėmo ir apmušalo grupės',context:0,construction:context.dimensions,variants:[0],requiredAssets:[p.asset],groups,singles:[],branches:[],fixed:{CARMPADPLCOLOR:'W'},structural:{CGLIDES:{value:'GBMF',supportedValues:['GBMF']}}}];
 return{runtime,qualified:q,palette:{schema:'chair-base-observed-colours-v1' as const,sourceSchema:'qualified-own-fixed-GBMF-1003500-v1',code:p.code,runtimeSha256:p.runtime,actualPaletteComplete:false as const,independentFinishCompositionAllowed:false as const,availableMaterialBindings:[],baselineObservedFinish:Object.fromEntries(Object.entries(d.baseFinishValues).map(([f,v])=>[f,{value:String(v),knownCurrentPrefixChoices:[]}]))},sourceFile:a.file};
}
