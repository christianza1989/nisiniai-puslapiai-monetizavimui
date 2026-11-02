/** Explicit receiving admissions for two finite producer scopes. These pins
 * never authorize a full palette, a different construction or publication. */
import assert from 'node:assert/strict';
type Obj=Record<string,any>;
const canonical=(v:any):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const equal=(a:any,b:any,message:string)=>assert.equal(canonical(a),canonical(b),message);
const records=(v:any):Obj[]=>Array.isArray(v)?v:Object.values(v||{});
export const conditionalChairAdmissions:Record<string,{palette:string;contract:string;kind:string;manifest:string;runtime:string;context:number;token:string;qualification:string;whole:number;metadata:number;domains:number;readonly:Obj}>={
 KNXT002WW002:{palette:'chair-qualified-conditional-context-palette-4341-v1',contract:'chair-exact-conditional-finish-context-contract-4400-v1',kind:'QUALIFIED_CONDITIONAL_NXT2_13_OWN_4341',manifest:'05bd923e2f535e2c6867369b2fe5b2d605a4cbb66db8e29344857d999dccebea',runtime:'b337f1b44087f309ecc99684c313b6dfe8a302a174a4b4ea3bbfd465224ca154',context:1,token:'af9d9e300e07b148996dbe7c3286e91e8ad2101ad23a78b2b1867a9d17e5095e',qualification:'qualification4341Sha256',whole:14,metadata:39,domains:3,readonly:{CBACKCOVERPLASTICCOLOR:'BLACK',CSEATCOVERPLASTICCOLOR:'BL'}},
 KUTI004WW002:{palette:'chair-qualified-conditional-context-palette-4461-v1',contract:'chair-exact-conditional-finish-context-contract-4540-v1',kind:'QUALIFIED_CONDITIONAL_UTI4V2_13UPH6MESH_OWN_4461',manifest:'8f67a053b904587a935da503b7df8a86d6615e05769097c579b0622e459f3089',runtime:'8f383c487dd4add69f27283e4c16f1a2bf99596916874a4460c706d1c2cd025a',context:0,token:'ee8c6950082db5d2b7459f36e1159a1d01e36be6077f4a89f51d6d5a7752e8e3',qualification:'qualification4461Sha256',whole:28,metadata:2572,domains:52,readonly:{CFRAMEPLASTICCOLOR:'LIGHTGREY',CMESHGROUP:'MT',CSEATCOVERPLASTICCOLOR:'LIGHTGREY'}},
};
export function conditionalChairMaterialGroups(code:string,runtimeSha256:string,documents:Record<string,Obj>){
 const pin=conditionalChairAdmissions[code],d=documents['colors-groups.json'],c=documents['conditional-context.json'],cert=documents['GROUP-PALETTE-VERIFIED-SAFE.json'];
 assert(pin&&d?.schema===pin.palette&&c?.schema===pin.contract,'Unknown finite conditional source');
 assert(runtimeSha256===pin.runtime&&c.runtimeContextIndex===pin.context,'Conditional original runtime/context differs');
 for(const v of [d,c,cert]){
  assert(v?.code===code&&v.qualifiedConditionalFinishContextComplete===true&&v.qualifiedWitnessGroupPaletteComplete===false&&v.actualPaletteComplete===false&&v.allGeometryContextsCovered===false,'Conditional source promoted to full coverage');
 }
 assert(d.qualifiedByDecision353===true&&cert.pass===true&&cert.noDonorGeometry===true&&cert.allSelectableFieldsNondefaultCovered===true&&cert.allObservedPostprefixValuesCovered===true,'Conditional OWN qualification absent');
 assert(d.conditionalScopeKind===pin.kind&&c.kind===pin.kind&&cert.conditionalScopeKind===pin.kind&&d.conditionalScopeToken===pin.token&&c.scopeToken===pin.token&&cert.conditionalScopeToken===pin.token,'Conditional token/kind differs');
 for(const k of ['code','runtimeSha256','runtimeContextIndex','exactConstructionAndDerivedValues','requiredOwnedBaseAssetShas'])equal(d[k],c[k],'Conditional exact construction/runtime pin differs: '+k);
 assert(d.runtimeSha256===runtimeSha256&&/^[a-f0-9]{64}$/.test(c[pin.qualification]),'Conditional qualification/runtime missing');
 const fixed={CPRICEGROUP:'_1',CUPHGROUP:'YB'};
 for(const v of [c.fixedSelectableFinishValues,d.requiredFixedFinishContext,cert.requiredFixedFinishContext])equal(v,fixed,'Conditional PRICE1/YB prefix differs');
 equal(c.fixedReadonlyPropertiesNotSelectableChoices,pin.readonly,'Readonly invariants changed');equal(d.fixedObservedFinishValues,pin.readonly,'Readonly palette invariants changed');
 assert(cert.actualWholeManufacturerStatesReconstructed===pin.whole&&cert.jointFullStatesReconstructed===10&&cert.jointDistinctSignatures===10&&cert.allOriginalMetadataDomainRowsRead===pin.metadata&&cert.independentNonemptyPostprefixDomainRows===pin.domains&&cert.fixedNoneditableFieldsExcludedFromChoices===Object.keys(pin.readonly).length,'Conditional finite evidence count differs');
 const utila=code==='KUTI004WW002',active=utila?['CMESHCOLOR','CPRICEGROUP','CUPHCOLOR','CUPHGROUP']:['CPRICEGROUP','CUPHCOLOR','CUPHGROUP'];
 equal(cert.selectableFields.slice().sort(),active,'Readonly field became an independent choice');equal((utila?c.allFourActualSelectableFieldsRemainActive:c.allThreeOriginalSelectableFieldsRemainActive).slice().sort(),active,'Conditional active field domain differs');
 equal(cert.groupCounts.slice().sort((a:number,b:number)=>a-b),utila?[6,13]:[13],'Conditional group counts differ');assert(cert.groupValueRecords===(utila?19:13)&&d.groups.length===(utila?2:1),'Conditional record count differs');
 const expectedUph:Obj[]=utila?c.scopedUpholsteryAtomicTuples:c.actualSelectableColourValues.map((value:string)=>({...fixed,CUPHCOLOR:value}));
 assert(expectedUph.length===13&&new Set(expectedUph.map(canonical)).size===13,'Conditional upholstery domain is not thirteen complete tuples');
 if(utila)assert(c.readonlyCoupledUphFieldNotSelectableChoice==='CUPHSIDECOLOR'&&c.scopedUpholsteryTuples===13&&c.meshChoices===6&&c.unseenFullCombinationsDirectlyFactoryExported===false,'Coupled readonly/mesh scope differs');
 const groups=d.groups.map((g:Obj)=>{
  const mesh=utila&&canonical(g.fields)===canonical(['CMESHCOLOR']);
  const fields=mesh?['CMESHCOLOR']:utila?['CPRICEGROUP','CUPHCOLOR','CUPHGROUP','CUPHSIDECOLOR']:active;
  equal(g.fields.slice().sort(),fields,'Incomplete atomic FINISH tuple fields');
  const expected=mesh?c.actualSelectableMeshValues.map((v:string)=>({CMESHCOLOR:v})):expectedUph;
  assert(expected.length===(mesh?6:13)&&g.completeActualPostPrefixDomain===false&&g.completeActualPostPrefixDomainInsideFixedFinishContext===true&&g.actualGroupValueCount===expected.length,'Conditional group escaped its finite context');
  const domain=new Set(expected.map(canonical)),values=records(g.values);assert(values.length===domain.size,'Conditional domain incomplete');
  const owned=new Set(g.ownedBaselineSelectors.map((s:Obj)=>s.assetSha256+':'+s.selectorId));assert(owned.size===(mesh?1:2),'Conditional OWN baseline selector count differs');
  for(const v of values){
   equal(Object.keys(v.values).sort(),fields,'Readonly tuple was split or incomplete');assert(domain.delete(canonical(v.values)),'Duplicate, invented, or outside-prefix FINISH tuple');
   assert(['material','unchanged'].includes(v.mode)&&!v.addOwnManufacturerAsset&&!v.removeOwnSelectors?.length,'Finite material scope cannot grant geometry changes');
   const targets=new Set((v.bindings||[]).map((b:Obj)=>b.assetSha256+':'+b.selectorId));
   assert(v.mode==='unchanged'?targets.size===0:targets.size===owned.size&&[...targets].every(t=>owned.has(t)),'Conditional patch escaped its canonical OWN selectors');
  }
  assert(domain.size===0,'Conditional domain omitted captured tuples');
  return {source:g,values,label:mesh?'Tinklas':'Apmušalas · YB',mesh};
 });
 assert(groups.filter((g:any)=>g.mesh).length===(utila?1:0),'Mesh group duplicated or omitted');
 return {contract:c,groups,readonly:pin.readonly};
}
