/** Supplier metadata adapter. It never synthesises FINISH combinations. */
import {createHash} from 'node:crypto';
import type {ChairPreview} from '../src/lib/chair-preview';
import type {Asset} from '../src/lib/expanded-configurator';
import type {ChairQualifiedData,QualifiedWitness,QualifiedPatch,QualifiedGroup,QualifiedOption} from '../src/lib/chair-qualified-colors';
type Obj=Record<string,any>;
const entries=(v:any):Obj[]=>Array.isArray(v)?v:Object.values(v||{});
const canonical=(v:any):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const id=(v:any)=>createHash('sha256').update(canonical(v)).digest('hex');
const hash=(v:any)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function requireValue(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
const label=(v:Record<string,string>)=>Object.entries(v).map(([k,x])=>k+' = '+x).join(' · ');
export function normalizeReadyChairPalettes(data:ChairPreview,documents:Record<string,Obj>,materialDocs:Record<string,unknown>,fileAssets:Record<string,Asset>,version:string){
 const q:ChairQualifiedData={schema:'chair-qualified-review-v1',code:data.code,runtimeSha256:data.runtimeSha256,version,witnesses:[],legacyScopes:[],materials:{},extraAssets:{},opaqueAssets:[]};
 const usedFiles=new Set<string>(),diagnostics:Obj[]=[];
 function construction(raw:Obj){
  requireValue(raw&&typeof raw==='object'&&!Array.isArray(raw),'Missing exact construction');const out:Record<string,string>={};
  for(const [key,value]of Object.entries(raw)){
   const match=key.match(new RegExp('^'+data.code+'_(OPTIONS|DIMENSIONS)\\.([A-Z0-9_]+)$'));
   if(match)out[match[2]]=String(value);
   else if(!key.includes('.')&&/^[A-Z0-9_]+$/.test(key))out[key]=String(value);
  }
  requireValue(Object.keys(out).length,'Empty construction witness');return out;
 }
 function witness(index:number,raw:Obj,required?:string[],name='Surinktos spalvų grupės'){
  const c=data.runtime.contexts[index],values=construction(raw);requireValue(c,'Unknown runtime context');
  requireValue(Object.entries(c.dimensions).every(([k,v])=>values[k]===v),'Witness dimensions differ from runtime');
  const variants=c.groups.map(g=>{const matches=g.variants.map((v,i)=>({v,i})).filter(({v})=>Object.entries(v.values).every(([k,x])=>values[k]===x));requireValue(matches.length===1,'Construction does not identify one captured group variant');return matches[0].i;});
  const assets=[c.invariant,...c.groups.map((g,i)=>g.variants[variants[i]].asset)].filter(a=>a!==null).map(a=>a.sha256);
  requireValue(assets.length>0&&new Set(assets).size===assets.length,'Duplicate/empty active assembly');
  if(required)requireValue(required.length===assets.length&&new Set(required).size===required.length&&required.every(h=>assets.includes(h)),'Witness OWN asset set mismatch');
  const wid=id([index,values,assets.slice().sort()]);let w=q.witnesses.find(w=>w.id===wid);
  if(!w){w={id:wid,label:name,context:index,construction:values,variants,requiredAssets:assets,groups:[],singles:[],branches:[]};q.witnesses.push(w);}return w;
 }
 function asset(ref:Obj):Asset{
  const a=fileAssets[ref.file];requireValue(a&&hash(ref.sha256)&&a.assetSha256===ref.sha256&&a.bytes===ref.bytes&&Number.isSafeInteger(a.bytes)&&a.bytes!>0&&a.bytes!<=25*1024*1024,'Additional asset absent, changed, or over25MiB');
  requireValue(!data.assets[a.assetSha256],'Additional part duplicates an active runtime asset');q.extraAssets[a.assetSha256]=a;usedFiles.add(ref.file);return a;
 }
 function patch(raw:Obj):QualifiedPatch{
  raw=raw.patch||raw;requireValue(raw&&typeof raw==='object','Missing patch');
  const bindings=entries(raw.bindings||raw.assignments).map(b=>{requireValue([b.assetSha256,b.selectorId,b.baseMaterialId,b.materialId].every(hash),'Malformed OWN material assignment');requireValue(materialDocs[b.materialId],'Material absent from OWN library');q.materials[b.materialId]=materialDocs[b.materialId];return {assetSha256:b.assetSha256,selectorId:b.selectorId,baseMaterialId:b.baseMaterialId,materialId:b.materialId};}).filter(b=>b.materialId!==b.baseMaterialId);
  const remove=entries(raw.removeOwnSelectors).map(r=>{requireValue(hash(r.assetSha256)&&hash(r.selectorId),'Malformed OWN primitive removal');return {assetSha256:r.assetSha256,selectorId:r.selectorId};});
  const assets=raw.addOwnManufacturerAsset?[asset(raw.addOwnManufacturerAsset)]:[];
  requireValue(['material','unchanged','primitiveSwap','materialFullObservedStateOverride','partSwapFullObservedStateOverride','exact-full-state-primitive-swap'].includes(raw.mode)||raw.mode===undefined,'Unknown patch mode');
  return {bindings,remove,assets};
 }
 function option(raw:Obj,values:Record<string,string>,title?:string):QualifiedOption{return {id:id([values,raw]),label:title||label(values),values,patch:patch(raw)};}
 function group(raw:Obj):QualifiedGroup{
  requireValue(raw.completeActualPostPrefixDomain===true&&Array.isArray(raw.fields)&&raw.fields.length,'Unqualified group domain');
  const options=entries(raw.values).map(v=>{requireValue(v.values&&canonical(Object.keys(v.values).sort())===canonical(raw.fields.slice().sort()),'Incomplete whole group tuple');return option(v,v.values);});
  requireValue(options.length===raw.actualGroupValueCount,'Group domain count differs');
  const base=options.filter(o=>canonical(o.values)===canonical(raw.baseValues));requireValue(base.length===1,'Group baseline not uniquely present');
  return {id:raw.id,label:raw.fields.join(' / '),options,base:base[0].id};
 }
 function checkDocument(d:Obj){
  requireValue(d.code===data.code,'Supplemental document code mismatch');
  if(d.schema==='chair-exact-state-primitive-swaps-329-v1')requireValue(d.exactFullStateOnly===true&&d.independentFinishCompositionAllowed===false&&(d.runtimeSha256===undefined||d.runtimeSha256===data.runtimeSha256),'Saved-state scope is not exact');
  else requireValue(d.runtimeSha256===data.runtimeSha256,'Supplemental runtime mismatch');
 }
 for(const [file,d]of Object.entries(documents)){
  if(!d.schema){requireValue(file==='GROUP-PALETTE-VERIFIED-SAFE.json'&&d.pass===true,'Unknown supplemental certificate');continue;}
  checkDocument(d);
  if(d.schema==='chair-qualified-exhaustive-witness-palette-447-v1'||d.schema==='chair-qualified-exhaustive-runtime-palette-440-v1'){
   requireValue(d.independentFinishCompositionAllowed===false&&d.existingFullStatePalette==='colors.json','Unknown full-state qualification');
   const w=witness(d.runtimeContextIndex,d.exactConstructionAndDerivedValues,d.requiredOwnedBaseAssetShas);
   q.legacyScopes.push({context:w.context,construction:w.construction,requiredAssets:w.requiredAssets});
  }else if(d.schema==='chair-qualified-group-palette-353-v1'){
   requireValue(d.qualifiedByDecision353===true&&d.qualifiedWitnessGroupPaletteComplete===true,'Group qualification absent');
   const w=witness(d.runtimeContextIndex,d.exactConstructionAndDerivedValues,d.requiredOwnedBaseAssetShas);const groups=entries(d.groups).map(group);
   for(const g of groups){const previous=w.groups.find(x=>x.id===g.id);requireValue(!previous||canonical(previous)===canonical(g),'Contradictory duplicate group');if(!previous)w.groups.push(g);}
  }else if(d.schema==='chair-qualified-group-witness-palettes-397-v1'){
   requireValue(d.independentCrossWitnessCompositionAllowed===false&&d.witnesses.length===d.qualifiedWitnessCount,'Unknown cross-witness contract');
   for(const ref of d.witnesses){const source=documents[ref.file];requireValue(source?.schema==='chair-qualified-group-palette-353-v1'&&source.witnessActualTupleSha256===ref.witnessActualTupleSha256&&source.runtimeContextIndex===ref.runtimeContextIndex,'Referenced group witness absent or changed');witness(ref.runtimeContextIndex,ref.exactConstructionAndDerivedValues,ref.requiredOwnedBaseAssetShas);}
  }else if(d.schema==='chair-color-library-reuse-329-v1'){
   requireValue(d.requireOtherFinishValuesMatchTargetBase===true&&d.independentCompositionValidated===false&&d.applyOnlyAtExactTargetWitnessConstruction===true&&d.geometryReusedFromOtherModel===false,'Reuse contract not bounded to one OWN target');
   for(const f of entries(d.fields)){
    requireValue(f.targetRuntimeSha256===data.runtimeSha256,'Reuse target scope not pinned');
    const w=witness(f.targetRuntimeContextIndex,f.targetBaseFullActualState);w.inference=true;
    const base=f.targetBaseFullActualState;for(const [k,v]of Object.entries(f.requiredCausalPartControllerContext||{}))requireValue(base[data.code+'_FINISHES.'+k]===v,'Reuse causal prefix differs from its captured base');
    for(const v of entries(f.values)){requireValue(v.mode==='material','Nonmaterial library reuse');w.singles.push(option(v,{[f.field]:String(v.value)},f.field+' = '+v.value+' · patikrinta biblioteka'));}
   }
  }else if(d.schema==='chair-exact-witness-colors-329-v1'){
   for(const scope of entries(d.witnessScopes))for(const r of entries(scope.records)){
    requireValue(r.independentCompositionValidated===false&&r.requiresExactConstructionAndFinishState===true,'Observed state does not prohibit independent composition');
    const w=witness(scope.runtimeContextIndex,r.actualFullState);w.singles.push(option(r,Object.fromEntries(Object.entries(r.actualFullState).filter(([k])=>k.startsWith(data.code+'_FINISHES.')).map(([k,v])=>[k.split('.')[1],String(v)])),(r.field||'Surinkta būsena')+' = '+(r.text||r.value)));
   }
  }else if(d.schema==='chair-exact-state-primitive-swaps-329-v1'){
   for(const r of entries(d.patches)){
    requireValue(r.mode==='exact-full-state-primitive-swap'&&r.independentFieldCompositionValidated===false&&r.geometryReusedFromOtherModel===false&&r.geometryUvOriginalMatricesAndPbrMatchEntireManufacturerState===true,'Unqualified whole-state part swap');
    const w=witness(r.runtimeContextIndex,r.requiredFullBaselineValues);const values=Object.fromEntries(Object.entries(r.actualFullStateValues).filter(([k])=>k.startsWith(data.code+'_FINISHES.')).map(([k,v])=>[k.split('.')[1],String(v)]));w.singles.push(option(r,values));
   }
  }else if(d.schema==='chair-qualified-fixed-finish-405-v1'){
   requireValue(d.selectableFinishFieldCount===0&&d.selectableFinishTupleCount===0&&d.independentFinishCompositionAllowed===false&&d.qualifiedRuntimePaletteComplete===true,'Fixed finish contract differs');
   const w=witness(d.runtimeContextIndex,d.exactConstruction,d.ownedAssemblyRefs.map((a:Obj)=>a.sha256));w.fixed=d.fixedFinishValues;
  }else if(d.schema==='chair-qualified-conditional-leaf-palette-384-v1'){
   requireValue(d.qualifiedByDecision353===true&&d.qualifiedWitnessConditionalUpholsteryPaletteComplete===true&&d.seatToBackCommonPbrInferenceVerified===true,'Conditional palette not qualified');
   const w=witness(d.runtimeContextIndex,d.exactConstructionAndDerivedValues,d.requiredOwnedBaseAssetShas);w.inference=true;w.label='Patikrintos apmušalų ir metalo grupės';
   for(const b of d.controllerBranches){
    requireValue(b.completeActualSelectableDomain===true,'Conditional leaf domain incomplete');const values=entries(b.values);requireValue(values.length===b.actualSelectableValues.length,'Conditional leaf domain count differs');
    const groups=['seat','back'].map(side=>{
     const field=side==='seat'?'CUPHSEATCOLOR':'CUPHBACKCOLOR',gid=id([b.controllerValues,field]);
     const options=Object.entries(b.values).map(([value,raw])=>{const v=raw as Obj;const bindings=v[side+'OwnBindings'];requireValue(Array.isArray(bindings)&&bindings.length,'Conditional OWN material targets absent');return option({mode:'material',bindings},{[field]:value},value);});
     const base=options.find(o=>o.values[field]===b.commonBaselineValue);requireValue(base,'Conditional baseline absent');return {id:gid,label:field,options,base:base.id};
    });
    const bid=id(b.controllerValues);w.branches.push({id:bid,label:label(b.controllerValues),values:b.controllerValues,patch:patch(b.prefixOwnPatch),groups});
    if(Object.entries(b.controllerValues).every(([k,v])=>d.baseFinishValues[k]===v))w.baseBranch=bid;
   }
   requireValue(w.baseBranch,'Conditional baseline branch absent');
   const mg=d.metalGroup,opts=entries(mg.actualReachableTuples).map(v=>option(v,v.values));
   const base=opts.find(o=>Object.entries(o.values).every(([k,v])=>d.baseFinishValues[k]===v));requireValue(base,'Metal baseline absent');w.groups.push({id:id('metal'),label:Object.keys(base.values).join(' / '),options:opts,base:base.id});
  }else throw Error('Unsupported supplemental schema '+d.schema);
  diagnostics.push({file,schema:d.schema});
 }
 // Disjointness is proved over the union of every supplied group option,
 // before any two independently selected options can reach the renderer.
 for(const w of q.witnesses){
  const owners=new Map<string,string>();
  for(const g of w.groups){for(const o of g.options)for(const t of [...o.patch.bindings,...o.patch.remove]){const key=t.assetSha256+':'+t.selectorId;requireValue(!owners.has(key)||owners.get(key)===g.id,'Two groups address the same OWN primitive');owners.set(key,g.id);}}
  w.singles=[...new Map(w.singles.map(s=>[id([s.values,s.patch]),s])).values()];
 }
 const referenced=new Set(q.witnesses.flatMap(w=>[...w.groups.flatMap(g=>g.options),...w.singles,...w.branches.flatMap(b=>b.groups.flatMap(g=>g.options))].flatMap(o=>o.patch.bindings.map(b=>b.assetSha256))));
 q.opaqueAssets=Object.keys(q.extraAssets).filter(h=>!referenced.has(h));
 q.witnesses.sort((a,b)=>(b.groups.length+b.branches.length*3)-(a.groups.length+a.branches.length*3)||b.singles.length-a.singles.length);
 return {qualified:q,usedAdditionalFiles:[...usedFiles],diagnostics};
}
