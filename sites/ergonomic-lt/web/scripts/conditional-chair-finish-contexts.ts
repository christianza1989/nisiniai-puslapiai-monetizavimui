/** Explicit receiving admissions for finite producer scopes. These pins
 * never authorize a full palette, a different construction or publication. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import displayErrata from './conditional-chair-display-errata.json';
type Obj=Record<string,any>;
const canonical=(v:any):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const equal=(a:any,b:any,message:string)=>assert.equal(canonical(a),canonical(b),message);
const records=(v:any):Obj[]=>Array.isArray(v)?v:Object.values(v||{});
export const conditionalChairAdmissions:Record<string,{version:string;palette:string;contract:string;kind:string;manifest:string;runtime:string;context:number;token:string;qualification:string;qualificationSha256?:string;contractSha256?:string;whole:number;metadata:number;domains:number;readonly:Obj;finishPrefix:Obj;upholsteryCount:number;upholsterySelectors:number;mesh:boolean}>={
 KNXT002WW002:{version:'colors-20261102-v1-qualified-context4341',palette:'chair-qualified-conditional-context-palette-4341-v1',contract:'chair-exact-conditional-finish-context-contract-4400-v1',kind:'QUALIFIED_CONDITIONAL_NXT2_13_OWN_4341',manifest:'05bd923e2f535e2c6867369b2fe5b2d605a4cbb66db8e29344857d999dccebea',runtime:'b337f1b44087f309ecc99684c313b6dfe8a302a174a4b4ea3bbfd465224ca154',context:1,token:'af9d9e300e07b148996dbe7c3286e91e8ad2101ad23a78b2b1867a9d17e5095e',qualification:'qualification4341Sha256',whole:14,metadata:39,domains:3,readonly:{CBACKCOVERPLASTICCOLOR:'BLACK',CSEATCOVERPLASTICCOLOR:'BL'},finishPrefix:{CPRICEGROUP:'_1',CUPHGROUP:'YB'},upholsteryCount:13,upholsterySelectors:2,mesh:false},
 KUTI004WW002:{version:'colors-20261102-v1-qualified-context4461',palette:'chair-qualified-conditional-context-palette-4461-v1',contract:'chair-exact-conditional-finish-context-contract-4540-v1',kind:'QUALIFIED_CONDITIONAL_UTI4V2_13UPH6MESH_OWN_4461',manifest:'8f67a053b904587a935da503b7df8a86d6615e05769097c579b0622e459f3089',runtime:'8f383c487dd4add69f27283e4c16f1a2bf99596916874a4460c706d1c2cd025a',context:0,token:'ee8c6950082db5d2b7459f36e1159a1d01e36be6077f4a89f51d6d5a7752e8e3',qualification:'qualification4461Sha256',whole:28,metadata:2572,domains:52,readonly:{CFRAMEPLASTICCOLOR:'LIGHTGREY',CMESHGROUP:'MT',CSEATCOVERPLASTICCOLOR:'LIGHTGREY'},finishPrefix:{CPRICEGROUP:'_1',CUPHGROUP:'YB'},upholsteryCount:13,upholsterySelectors:2,mesh:true},
 KUTI004WW001:{version:'colors-20261103-v1-qualified-context6601',palette:'chair-qualified-conditional-context-palette-6601-v1',contract:'chair-exact-conditional-finish-context-contract-6680-v1',kind:'QUALIFIED_CONDITIONAL_UTI4V1_15UPH6MESH_OWN_6601',manifest:'9065a68b23ead28ee21d2b6a243071677e59c49eb48d3ee1e24b366f1796fa44',runtime:'0254739bb1069049a47dc814b8bd74a1dee5085bd276351615fcc0ad6a683630',context:1,token:'28d4d37ac5ff321cf113bb0ac1202c561dde8c1a1f46f9d0449aea8b0bec5fe2',qualification:'qualification6601Sha256',qualificationSha256:'6752ccf91fa3028736c0855f9e4337259f273d2f62dd9e439d11dff3aa6d75f2',contractSha256:'de28a138da76122930eefeca5606d0a2ab7a9913d48ecc21ef0f3ea7893e3184',whole:31,metadata:2572,domains:60,readonly:{CFRAMEPLASTICCOLOR:'BLACK',CHEADRESTSPLASTICCOLOR:'BLACK',CMESHGROUP:'MT',CSEATCOVERPLASTICCOLOR:'BL'},finishPrefix:{CPRICEGROUP:'_2',CUPHGROUP:'CUR'},upholsteryCount:15,upholsterySelectors:3,mesh:true},
 "KUTI004WW002@8121":{"version":"colors-20261103-v1-qualified-context8121","palette":"chair-qualified-conditional-context-palette-8121-v1","contract":"chair-exact-conditional-finish-context-contract-8240-v1","kind":"QUALIFIED_CONDITIONAL_UTI4V2_14UPH6MESH_OWN_8121","manifest":"4e6889b9c9c63f643b50ed4aa116ac98a17147ca622e9009b0dfec2ab3db68dc","runtime":"8f383c487dd4add69f27283e4c16f1a2bf99596916874a4460c706d1c2cd025a","context":0,"token":"4e8494ef40d30b801a9f77b739b690c128e22abd9e822759907d8757b7eb54bc","qualification":"qualification8121Sha256","qualificationSha256":"94211eb7f248b8c9598549c6940b73bf090670301b5f9f5432bd208cc011ea84","contractSha256":"6e64f4ecb244363be4cb9248b91766cc02e2ff05d533f22b74b2732e279e1276","whole":30,"metadata":2572,"domains":56,"readonly":{"CFRAMEPLASTICCOLOR":"LIGHTGREY","CMESHGROUP":"MT","CSEATCOVERPLASTICCOLOR":"LIGHTGREY"},"finishPrefix":{"CPRICEGROUP":"_1","CUPHGROUP":"SM"},"upholsteryCount":14,"upholsterySelectors":2,"mesh":true},
 "KUTI004WW001@7321":{"version":"colors-20261103-v1-qualified-context7321","palette":"chair-qualified-conditional-context-palette-7321-v1","contract":"chair-exact-conditional-finish-context-contract-7440-v1","kind":"QUALIFIED_CONDITIONAL_UTI4V1_72UPH6MESH_OWN_7321","manifest":"96fef0b43f31bcd3df0c8a19ec7ebdcb8621852f1ddba865f80a8089dcc85ef4","runtime":"0254739bb1069049a47dc814b8bd74a1dee5085bd276351615fcc0ad6a683630","context":1,"token":"1628e8365d7302ab5a278f1b610d229955af66ea298e2e2b4bc75ee7f7bcd8d7","qualification":"qualification7321Sha256","qualificationSha256":"87ecd223bd263a0780d56c4da3e7eedb552d90c6bda7cd990a671b31bbfadb3d","contractSha256":"e3d22d6c8eb8f9931222e87e4ea33b5495e8303bdaaac83c037b5bb7799dcda5","whole":88,"metadata":2572,"domains":288,"readonly":{"CFRAMEPLASTICCOLOR":"BLACK","CHEADRESTSPLASTICCOLOR":"BLACK","CMESHGROUP":"MT","CSEATCOVERPLASTICCOLOR":"BL"},"finishPrefix":{"CPRICEGROUP":"_2","CUPHGROUP":"VL"},"upholsteryCount":72,"upholsterySelectors":3,"mesh":true},
};
/** Select an exact retained scope; code equality alone never changes a profile. */
export function conditionalChairAdmission(code:string,palette:string|undefined){
 return Object.entries(conditionalChairAdmissions).find(([key,pin])=>(key===code||key.startsWith(code+'@'))&&pin.palette===palette)?.[1];
}
/** A separate display projection; immutable contract bytes are never edited. */
export function conditionalChairContractDisplay(code:string,version:string,manifest:string,contractSha:string,source:Obj){
 const e=displayErrata.entries.find(e=>e.code===code&&e.version===version);
 if(!e)return {corrected:false,value:source.applyContract};
 assert(e.field==='applyContract'&&e.changesRoutingOrQualificationFields===false&&e.originalPackageBytesUnchanged===true,'Unknown display erratum');
 assert(manifest===e.sourceManifestSha256&&contractSha===e.sourceContractSha256&&source.scopeToken===e.scopeToken&&source.qualification8121Sha256===e.qualificationSha256,'Display erratum source identity differs');
 equal(source.fixedSelectableFinishValues,e.validatedStructuredFixedValues,'Display erratum routing fields differ');
 assert(createHash('sha256').update(source.applyContract,'utf8').digest('hex')===e.originalFieldTextSha256,'Display erratum original text differs');
 return {corrected:true,value:e.replacementFieldText,originalFieldTextSha256:e.originalFieldTextSha256,sourceContractSha256:contractSha,scopeToken:e.scopeToken};
}
export function conditionalChairMaterialGroups(code:string,runtimeSha256:string,documents:Record<string,Obj>){
 const d=documents['colors-groups.json'],pin=conditionalChairAdmission(code,d?.schema),c=documents['conditional-context.json'],cert=documents['GROUP-PALETTE-VERIFIED-SAFE.json'];
 assert(pin&&d?.schema===pin.palette&&c?.schema===pin.contract,'Unknown finite conditional source');
 assert(runtimeSha256===pin.runtime&&c.runtimeContextIndex===pin.context,'Conditional original runtime/context differs');
 for(const v of [d,c,cert]){
  assert(v?.code===code&&v.qualifiedConditionalFinishContextComplete===true&&v.qualifiedWitnessGroupPaletteComplete===false&&v.actualPaletteComplete===false&&v.allGeometryContextsCovered===false,'Conditional source promoted to full coverage');
 }
 assert(d.qualifiedByDecision353===true&&cert.pass===true&&cert.noDonorGeometry===true&&cert.allSelectableFieldsNondefaultCovered===true&&cert.allObservedPostprefixValuesCovered===true,'Conditional OWN qualification absent');
 assert(d.conditionalScopeKind===pin.kind&&c.kind===pin.kind&&cert.conditionalScopeKind===pin.kind&&d.conditionalScopeToken===pin.token&&c.scopeToken===pin.token&&cert.conditionalScopeToken===pin.token,'Conditional token/kind differs');
 for(const k of ['code','runtimeSha256','runtimeContextIndex','exactConstructionAndDerivedValues','requiredOwnedBaseAssetShas'])equal(d[k],c[k],'Conditional exact construction/runtime pin differs: '+k);
 assert(d.runtimeSha256===runtimeSha256&&/^[a-f0-9]{64}$/.test(c[pin.qualification]),'Conditional qualification/runtime missing');
 if(pin.qualificationSha256)assert(c[pin.qualification]===pin.qualificationSha256,'Conditional qualification SHA differs');
 const fixed=pin.finishPrefix;
 for(const v of [c.fixedSelectableFinishValues,d.requiredFixedFinishContext,cert.requiredFixedFinishContext])equal(v,fixed,'Conditional fixed PRICE/GROUP prefix differs');
 equal(c.fixedReadonlyPropertiesNotSelectableChoices,pin.readonly,'Readonly invariants changed');equal(d.fixedObservedFinishValues,pin.readonly,'Readonly palette invariants changed');
 assert(cert.actualWholeManufacturerStatesReconstructed===pin.whole&&cert.jointFullStatesReconstructed===10&&cert.jointDistinctSignatures===10&&cert.allOriginalMetadataDomainRowsRead===pin.metadata&&cert.independentNonemptyPostprefixDomainRows===pin.domains&&cert.fixedNoneditableFieldsExcludedFromChoices===Object.keys(pin.readonly).length,'Conditional finite evidence count differs');
 const utila=pin.mesh,active=utila?['CMESHCOLOR','CPRICEGROUP','CUPHCOLOR','CUPHGROUP']:['CPRICEGROUP','CUPHCOLOR','CUPHGROUP'];
 equal(cert.selectableFields.slice().sort(),active,'Readonly field became an independent choice');equal((utila?c.allFourActualSelectableFieldsRemainActive:c.allThreeOriginalSelectableFieldsRemainActive).slice().sort(),active,'Conditional active field domain differs');
 equal(cert.groupCounts.slice().sort((a:number,b:number)=>a-b),utila?[6,pin.upholsteryCount]:[pin.upholsteryCount],'Conditional group counts differ');assert(cert.groupValueRecords===pin.upholsteryCount+(utila?6:0)&&d.groups.length===(utila?2:1),'Conditional record count differs');
 const expectedUph:Obj[]=utila?c.scopedUpholsteryAtomicTuples:c.actualSelectableColourValues.map((value:string)=>({...fixed,CUPHCOLOR:value}));
 assert(expectedUph.length===pin.upholsteryCount&&new Set(expectedUph.map(canonical)).size===pin.upholsteryCount,'Conditional upholstery tuple domain count differs');
 if(utila)assert(c.readonlyCoupledUphFieldNotSelectableChoice==='CUPHSIDECOLOR'&&c.scopedUpholsteryTuples===pin.upholsteryCount&&c.meshChoices===6&&c.unseenFullCombinationsDirectlyFactoryExported===false,'Coupled readonly/mesh scope differs');
 const groups=d.groups.map((g:Obj)=>{
  const mesh=utila&&canonical(g.fields)===canonical(['CMESHCOLOR']);
  const fields=mesh?['CMESHCOLOR']:utila?['CPRICEGROUP','CUPHCOLOR','CUPHGROUP','CUPHSIDECOLOR']:active;
  equal(g.fields.slice().sort(),fields,'Incomplete atomic FINISH tuple fields');
  const expected=mesh?c.actualSelectableMeshValues.map((v:string)=>({CMESHCOLOR:v})):expectedUph;
  assert(expected.length===(mesh?6:pin.upholsteryCount)&&g.completeActualPostPrefixDomain===false&&g.completeActualPostPrefixDomainInsideFixedFinishContext===true&&g.actualGroupValueCount===expected.length,'Conditional group escaped its finite context');
  const domain=new Set(expected.map(canonical)),values=records(g.values);assert(values.length===domain.size,'Conditional domain incomplete');
  const owned=new Set(g.ownedBaselineSelectors.map((s:Obj)=>s.assetSha256+':'+s.selectorId));assert(owned.size===(mesh?1:pin.upholsterySelectors),'Conditional OWN baseline selector count differs');
  for(const v of values){
   equal(Object.keys(v.values).sort(),fields,'Readonly tuple was split or incomplete');assert(domain.delete(canonical(v.values)),'Duplicate, invented, or outside-prefix FINISH tuple');
   assert(['material','unchanged'].includes(v.mode)&&!v.addOwnManufacturerAsset&&!v.removeOwnSelectors?.length,'Finite material scope cannot grant geometry changes');
   const targets=new Set((v.bindings||[]).map((b:Obj)=>b.assetSha256+':'+b.selectorId));
   assert(v.mode==='unchanged'?targets.size===0:targets.size===owned.size&&[...targets].every(t=>owned.has(t)),'Conditional patch escaped its canonical OWN selectors');
  }
  assert(domain.size===0,'Conditional domain omitted captured tuples');
  return {source:g,values,label:mesh?'Tinklas':'Apmušalas · '+fixed.CUPHGROUP,mesh};
 });
 assert(groups.filter((g:any)=>g.mesh).length===(utila?1:0),'Mesh group duplicated or omitted');
 return {contract:c,groups,readonly:pin.readonly,finishPrefix:fixed};
}
