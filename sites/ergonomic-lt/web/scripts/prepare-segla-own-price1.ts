import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import pins from './bja-seg-exact-package-pins.json';
import {validateChairReviewComponents} from '../src/lib/chair-components';
import {glbGeometryAdmission} from './prepared-review-glb-admission';
import {qualifiedChairPlan,qualifiedDefaultSelection} from '../src/lib/chair-qualified-colors';
import type {ChairPreview} from '../src/lib/chair-preview';
import type {QualifiedWitness} from '../src/lib/chair-qualified-colors';

const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const equal=(a:unknown,b:unknown)=>assert.equal(canonical(a),canonical(b));
const {values}=parseArgs({options:{root:{type:'string'},output:{type:'string'},'asset-map':{type:'string'}}});
assert(values.root&&values.output&&values['asset-map']);
const root=values.root,out=values.output,code='KSEG001WW001',pin=pins[code];
const read=(name:string)=>fs.readFileSync(path.join(root,name));
const manifestBytes=read('SHA256SUMS.json');assert.equal(sha(manifestBytes),pin.manifest);
const manifest=JSON.parse(manifestBytes.toString());assert(manifest.code===code&&manifest.version===pin.version);
const inputs:Record<string,any>={};
function checked(name:string){
 const expected=manifest.files[name];assert(expected&&!path.isAbsolute(name)&&!name.includes('..')&&!name.includes('\\'));
 const file=path.join(root,name),before=fs.statSync(file),bytes=read(name),after=fs.statSync(file);
 assert(before.size===after.size&&before.mtimeMs===after.mtimeMs&&bytes.length===expected.bytes&&sha(bytes)===expected.sha256,name);
 inputs[name]={file,sha256:expected.sha256,dev:after.dev,ino:after.ino,size:after.size,mtimeMs:after.mtimeMs};
 return bytes;
}
for(const [name,digest]of Object.entries(pin.headers))assert.equal(sha(checked(name)),digest,name);
const contract=JSON.parse(checked('own-source-contract.json').toString());
const scope=JSON.parse(checked('construction-scope.json').toString());
const whole=JSON.parse(checked('WHOLE-VERIFIED.json').toString());
const base=JSON.parse(checked('BASE-VALIDATION-VERIFIED.json').toString());
const palette=JSON.parse(checked('colors-groups.json').toString());
const raw=JSON.parse(checked('runtime.json').toString());
const selectors=JSON.parse(checked('selectors.json').toString());
assert(contract.code===code&&contract.version===pin.version&&contract.runtimeSha256===pin.headers['runtime.json']);
assert(contract.sourceRuntimeOwnership==='NEW_PC2_OWN_NATIVE_WITNESS'&&contract.existingMainRuntimeGeometryOwnershipQualified===false&&contract.fullFormQualified===false);
assert(contract.kind==='QUALIFIED_CONDITIONAL_OWN12300_SEG_PRICE1_FIXED_CONSTRUCTION_NATIVE10');
assert(contract.qualificationSha256===scope.sourceNativeQualificationSha256&&contract.scopeContractSha256===pin.headers['construction-scope.json']&&contract.baseValidationSha256===base.validationSha256);
assert(base.passActualScopedOwnRuntimeNative10AndOriginal432===true&&base.tested===10&&base.distinct===10&&base.strictFixedStructuralFieldNegatives===7);
assert(base.runtimeSha256===contract.runtimeSha256&&base.scopeContractSha256===contract.scopeContractSha256);
assert(whole.pass===true&&whole.actualContextStates===101&&whole.actualWholeSources===104&&whole.primitiveComparisons===5512&&whole.jointNativeSamples===10&&whole.jointDistinctSignatures===10&&whole.eachActiveFinishFieldNondefault===true&&whole.fullFormQualified===false);
assert(palette.ownSourceContractSha256===pin.headers['own-source-contract.json']&&palette.runtimeSha256===contract.runtimeSha256&&palette.witnessActualTupleSha256===contract.witnessFullActualTupleSha256);
for(const d of [contract,scope,palette]){
 assert(d.qualifiedConditionalFinishContextComplete!==false&&d.fullFormQualified===false);
 equal(d.fixedSelectableFinishValues,{CPRICEGROUP:'_1'});
 equal(d.fixedSelectableStructuralFields,raw.fixedSelectableStructuralFields);
}
const fixed={CMECHANISM:'FST',CARMRESTS:'R35K3',CGASLIFT:'GLR',CBASE:'TS25',CCASTORS:'ESH60',CSEATPADFOAM:'STANDARD',CASSEMBLY:'PACKUA'};
assert(Object.keys(raw.fixedSelectableStructuralFields).length===7);
for(const [key,value]of Object.entries(fixed)){
 const field=raw.fixedSelectableStructuralFields[key];
 assert(field.editable===true&&field.visible===true&&field.fixedValue===value&&field.role==='FIXED_SELECTABLE_CONSTRUCTION_RESTRICTION_NOT_READONLY');
 equal(field.supportedScopeValues,[value]);
 equal(field.unqualifiedValues,field.sourceSelectableValues.filter((v:string)=>v!==value));
}
assert(raw.schema==='desk-components-065-v1'&&raw.code===code&&raw.coordinates==='original-world-matrices'&&raw.contexts.length===1&&raw.fullGraphClosed===false);
const context=raw.contexts[0],asset=context.invariant;
assert(context.groups.length===0&&asset.sha256===contract.baselineAssetSha256&&asset.bytes<=25*1024*1024&&!asset.needsCompression);
equal(context.default3DValues,{});equal(context.textOnly,{});
for(const [key,value]of Object.entries(fixed))assert.equal(context.dimensions[key],value);
const runtime=structuredClone(raw);
runtime.finishPolicy='original manufacturer finishes; no FINISH setters';
runtime.contexts[0].choiceRules='conditional selectable tuples only';
runtime.contexts[0].groups=[{fields:[],variants:[{values:{},asset:null}]}];
runtime.contexts[0].invariant.file='assets/'+asset.componentSha256+'.glb';
validateChairReviewComponents(runtime,code);
const geometry=glbGeometryAdmission(checked(asset.file),selectors.assets[asset.sha256]);
const namespace='/models/configurator/chairs/'+code+'-'+pin.manifest.slice(0,20);
const map=JSON.parse(fs.readFileSync(values['asset-map'],'utf8'));
const byHash=new Map<string,[string,any]>(Object.entries(map).map(([url,e]:[string,any])=>[e.sha256+':'+e.size,[url,e]]));
const rows:Record<string,any>={},textures:ChairPreview['textures']={},materials:Record<string,any>={};
function publishFile(name:string){
 const r=inputs[name]|| (checked(name),inputs[name]),prior=byHash.get(r.sha256+':'+r.size);
 if(prior){const s=fs.statSync(prior[1].file);assert(['dev','ino','size','mtimeMs'].every(k=>(s as any)[k]===prior[1][k]));return prior[0];}
 const url=namespace+'/source/'+name;rows[url]=r;return url;
}
for(const name of Object.keys(manifest.files)){
 if(/^library\/materials\/[a-f0-9]{64}\.json$/.test(name)){const bytes=checked(name),id=path.basename(name,'.json');assert(sha(bytes)===id);materials[id]=JSON.parse(bytes.toString());}
 if(/\.(jpe?g|png|webp)$/i.test(name)){checked(name);const r=inputs[name];textures[r.sha256]={asset:publishFile(name),sha256:r.sha256,bytes:r.size};}
}
assert(palette.schema==='chair-qualified-conditional-own-construction-palette-12500-v1'&&palette.groups.length===1);
equal(palette.requiredOwnedBaseAssetShas,[asset.sha256]);equal(palette.fixedObservedFinishValues,{});
const group=palette.groups[0],records=Object.values(group.values) as any[];
equal(group.fields,['CPRICEGROUP','CUPHCOLOR','CUPHGROUP']);
assert(group.actualGroupValueCount===101&&records.length===101&&group.completeActualPostPrefixDomain===true);
const targets=new Set(group.ownedBaselineSelectors.map((s:any)=>s.assetSha256+':'+s.selectorId));
assert(targets.size===2&&group.ownedBaselineSelectors.every((s:any)=>s.assetSha256===asset.sha256));
const seen=new Set(),usedMaterials:Record<string,any>={};
const singles=records.map(record=>{
 equal(Object.keys(record.values).sort(),['CPRICEGROUP','CUPHCOLOR','CUPHGROUP']);
 assert(record.values.CPRICEGROUP==='_1'&&contract.actualConditionalGroups.includes(record.values.CUPHGROUP)&&record.mode==='material');
 assert(!record.addOwnManufacturerAsset&&!record.removeOwnSelectors?.length);
 const tuple=canonical(record.values);assert(!seen.has(tuple));seen.add(tuple);
 assert(record.bindings.length===targets.size&&new Set(record.bindings.map((b:any)=>b.assetSha256+':'+b.selectorId)).size===targets.size);
 for(const b of record.bindings){
  assert(targets.has(b.assetSha256+':'+b.selectorId)&&materials[b.materialId]);
  assert(selectors.assets[b.assetSha256].slots.some((s:any)=>s.selectorId===b.selectorId&&s.materialId===b.baseMaterialId));
  usedMaterials[b.materialId]=materials[b.materialId];
 }
 return {id:sha(tuple),label:record.values.CUPHGROUP+' · '+record.values.CUPHCOLOR,values:record.values,patch:{bindings:record.bindings.filter((b:any)=>b.materialId!==b.baseMaterialId),remove:[],assets:[]}};
});
const witness:QualifiedWitness={id:sha(canonical([0,context.dimensions,asset.sha256])),label:'Apmušalas · PRICE_1 · ši konstrukcija',context:0,construction:context.dimensions,variants:[0],requiredAssets:[asset.sha256],groups:[],singles,branches:[],fixed:{},structural:Object.fromEntries(Object.entries(fixed).map(([field,value])=>[field,{value,supportedValues:[value]}]))};
const data:ChairPreview={schema:'pc2-chair-review-111-v1',code,name:'Segla UPH/P LOW',runtimeSha256:contract.runtimeSha256,runtime,
 palette:{schema:'chair-base-observed-colours-v1',sourceSchema:'qualified-own-original-reference-111-v1',code,runtimeSha256:contract.runtimeSha256,actualPaletteComplete:false,independentFinishCompositionAllowed:false,availableMaterialBindings:[],baselineObservedFinish:Object.fromEntries(Object.entries(palette.baseFinishValues).map(([field,value])=>[field,{value:String(value),knownCurrentPrefixChoices:[]}]))},
 selectors,assets:{[asset.sha256]:{asset:publishFile(asset.file),assetSha256:asset.sha256,bytes:asset.bytes}},textures,
 qualified:{schema:'chair-qualified-review-v1',code,runtimeSha256:contract.runtimeSha256,version:pin.version,witnesses:[witness],legacyScopes:[],materials:usedMaterials,extraAssets:{},opaqueAssets:[]}};
for(const option of singles)assert(qualifiedChairPlan(data,0,[0],[asset.sha256],{...qualifiedDefaultSelection(witness),kind:'single',single:option.id}).status!=='unavailable');
const bytes=Buffer.from(JSON.stringify(data)+'\n');assert(bytes.length<=15_000_000);
const digest=sha(bytes),url=namespace+'/review-'+digest.slice(0,20)+'.json';
fs.mkdirSync(out,{recursive:false});const output=out+'/review.json';fs.writeFileSync(output,bytes,{flag:'wx'});
const st=fs.statSync(output);rows[url]={file:output,sha256:digest,dev:st.dev,ino:st.ino,size:st.size,mtimeMs:st.mtimeMs};
const entry={code,name:data.name,asset:url,sha256:digest,bytes:bytes.length,version:pin.version};
for(const [name,value]of Object.entries({'ENTRY.json':entry,'ASSET-ROWS.json':rows,'RESULT.json':{result:'SCOPED_NEW_OWN_SOURCE_ADMITTED',code,version:pin.version,geometry,options:singles.length,sourceRuntimeSha256:contract.runtimeSha256,originalRuntimePreserved:true,originalAssetSha256:asset.sha256,fullFormQualified:false,browserPass:false,publicPass:false}}))fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(entry));

