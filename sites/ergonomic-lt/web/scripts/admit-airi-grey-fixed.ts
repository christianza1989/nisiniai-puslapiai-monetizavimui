/** Finite PC2 313 adapter. No supplier calls, invented menu or cross-code binding. */
import assert from 'node:assert/strict';
import {validateChairReviewComponents} from '../src/lib/chair-components';
export const airiGreyFixedPins={code:'KAII001WW002',version:'colors-20261108-v1-qualified-own-fixed1007250',manifest:'712a03b2294621573af74fcd01e50fb249b055398e2269567ba7e1676d794421',runtime:'18758091eb482617dfcbc0b2e92a6ff8a275210a4a6d6f533edf40b45b56f501',asset:'143ad9dac01c743ca1a8bb30d79d7871628632306ca2161fd12d4c3a033d4f67',contract:'f7bd54ffc7f4713cdc0b2bf5311aafb6157688f8440069dd8db8be02edbd6bb7'};
export function admitAiriGreyFixed(input:{manifest:string;runtimeSha256:string;rawRuntime:any;contract:any;palette:any;qualification:any}){
 const p=airiGreyFixedPins,{rawRuntime:r,contract:c,palette:d,qualification:q}=input;
 assert(input.manifest===p.manifest&&input.runtimeSha256===p.runtime&&r.code===p.code&&c.code===p.code&&d.code===p.code&&q.code===p.code,'Foreign exact OWN identity');
 assert(c.schema==='qualified-own-fixed-single-finish-contract-1007300-v1'&&c.version===p.version&&c.runtimeSha256===p.runtime&&c.ownBaselineAssetSha256===p.asset);
 assert(d.schema==='chair-qualified-own-fixed-finish-palette-1007300-v1'&&d.runtimeSha256===p.runtime&&d.ownSourceContractSha256===p.contract);
 const roles={CMESHCOLOR:{actualSelectableChoices:[],editable:false,value:'JM50',visible:true},CMESHGROUP:{actualSelectableChoices:[],editable:true,value:'JM',visible:false},CPLASTICCOLOR:{actualSelectableChoices:[],editable:false,value:'GREY',visible:true}};
 assert.deepEqual(c.fixedFinishRoles,roles);assert.deepEqual(d.fixedObservedFinishRoles,roles);assert.deepEqual(d.groups,[]);assert.deepEqual(c.actualSelectableFinishFields,[]);assert.deepEqual(c.actualSelectableStructuralFields,[]);assert.deepEqual(d.actualSelectableFinishFields,[]);
 for(const v of[c,d])assert(v.qualifiedCurrentOwnFixedFinishPaletteComplete===true&&v.fullFormQualified===false&&v.actualReachableFinishStates===1);
 assert(c.allCatalogueVariantsOrContextsCovered===false&&c.existingMainRuntimeGeometryOwnershipQualified===false&&d.actualPaletteComplete===false&&d.allGeometryContextsCovered===false);
 assert(q.allSmallDomainTested===true&&q.entireActualReachableOwnDomainExhaustive===true&&q.testedActualNativeStates===1&&q.actualNativeDistinctStates===1&&q.noFabricatedNative10===true&&q.newGeometryExports===0&&q.newManufacturerRequests===0&&q.sourceQualificationSha256===c.qualificationSha256&&q.sourceNativeLineageSha256===c.sourceNativeLineageSha256);
 assert(r.schema==='desk-components-065-v1'&&r.coordinates==='original-world-matrices'&&r.contexts.length===1&&r.qualifiedCurrentOwnFixedFinishPaletteComplete===true&&r.otherCatalogueContextsQualified===false&&r.fullFormQualified===false);
 const ctx=r.contexts[0],a=ctx.invariant;assert(a.sha256===p.asset&&a.bytes===9426792&&a.file==='assets/'+p.asset+'.glb');assert.deepEqual(ctx.groups,[]);assert.deepEqual(ctx.textOnly,{});
 assert.deepEqual(ctx.default3DValues,{CMESHCOLOR:'JM50',CMESHGROUP:'JM',CPLASTICCOLOR:'GREY'});assert.deepEqual(d.fixedObservedFinishValues,ctx.default3DValues);
 assert.deepEqual(ctx.dimensions,{CARMRESTS:'GTPPASSU',CASSEMBLY:'PACKUA',CBACKREST:'MESH',CBASE:'ST5STAR',CCASTORS:'MAJMOONCASTOR1',CGASLIFT:'PNEUMATIC',CMECHANISM:'TILT',CSEAT:'MESH',GWEIGHT:'9.6'});
 const runtime=structuredClone(r);runtime.finishPolicy='original manufacturer finishes; no FINISH setters';runtime.fullGraphClosed=false;
 // The review's transport uses a single original assembly. Raw flags remain
 // separately preserved; hidden editable CMESHGROUP is never made readonly.
 runtime.contexts[0].choiceRules='conditional selectable tuples only';runtime.contexts[0].groups=[{fields:[],variants:[{values:{},asset:null}]}];runtime.contexts[0].invariant.file='assets/'+a.componentSha256+'.glb';delete runtime.contexts[0].default3DValues;
 validateChairReviewComponents(runtime,p.code);
 return {runtime,sourceFile:a.file,fixedFinishRoles:structuredClone(roles),fixedFinishValues:structuredClone(ctx.default3DValues)};
}
