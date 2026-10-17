import {bindNativeComponentAxes} from './native-component-axes.mjs';
import {nativeLocalFinishRoles} from './native-local-finish-roles.mjs';
import fs from 'node:fs/promises';
import {componentConstructorDestinations} from './component-constructor-destinations.mjs';
import {sailFinishEvidence,sailFinishProfiles} from './sail-linked-finishes.mjs';
import {nativeFinishEvidence,nativeFinishProfiles} from './native-finish-contexts.mjs';
import {refineProfiles,sourceMirrors} from './refine-catalog-profiles.mjs';
import path from 'node:path';
import {NodeIO,Document,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,weld,meshopt,copyToDocument} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {parts,compact,hash} from './configurator-geometry.mjs';
import {sourceFinishMaterial,sourceFinishKey,sourceFinishSwatch} from './source-finish-materials.mjs';
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const source=path.resolve(option('source','../research/configurator/batch-10-source')),target=path.resolve(option('target','public/models/configurator/catalog'));
const targetRelative=path.relative(path.resolve('public'),target);if(targetRelative.startsWith('..')||path.isAbsolute(targetRelative))throw Error('Model target must be inside public');
const assetRoot='/'+targetRelative.replaceAll('\\','/')+'/';
const output=option('output','content/configurator-catalog.json'),fixturesOutput=option('fixtures','content/configurator-catalog-fixtures.json'),reportOutput=option('report','../research/configurator/batch-10/geometry-verification.json');
for(const file of [output,fixturesOutput,reportOutput])await fs.mkdir(path.dirname(path.resolve(file)),{recursive:true});
await fs.mkdir(target,{recursive:true});await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().setLogger(new Logger(Verbosity.ERROR)).registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const selection=JSON.parse(await fs.readFile(option('selection','../research/configurator/batch-10/selection.json'),'utf8'));
const onlyArticle=process.argv.find(v=>v.startsWith('--article='))?.slice(10);
const result={schemaVersion:3,families:[],palettes:{}},report=[],fixtures=[];
// Geometry recipe version; increment when conversion or role assignment changes.
const checkpoint=path.resolve(option('checkpoint','../research/configurator/batch-10-prepared')),recipeHash=option('recipe','0f0f91d292e2f5c3ab3655b68f809f1fcc3a502091dd85698d28df5b281a8eda');
await fs.mkdir(checkpoint,{recursive:true});
const preparationFormat='source-component-presence-and-choice-deltas-v1';
const preparationSources=await Promise.all(['prepare-catalog-configurators.mjs','refine-catalog-profiles.mjs','configurator-geometry.mjs','source-finish-materials.mjs','native-finish-contexts.mjs','sail-linked-finishes.mjs','component-constructor-destinations.mjs','native-local-finish-roles.mjs','native-component-axes.mjs'].map(async file=>[file,hash(await fs.readFile(new URL(file,import.meta.url)))]));
async function inputSignature(dir){const values=[];for(const file of await fs.readdir(dir,{recursive:true})){if(file.endsWith('.json'))values.push([file,hash(await fs.readFile(path.join(dir,file)))]);}return hash(JSON.stringify([preparationFormat,recipeHash,preparationSources,values.sort(([a],[b])=>a.localeCompare(b))]));}
function anchorAssets(a){return [a.geometry,...a.components.flatMap(c=>c.variants.flatMap(v=>[...(v.patch.geometry?[v.patch.geometry]:[]),...(v.patch.geometries||[])]))];}
async function validCache(saved,signature){if(saved.signature!==signature)return false;for(const asset of new Map(anchorAssets(saved.anchor).map(a=>[a.asset,a])).values()){try{if(hash(await fs.readFile(path.join('public',asset.asset)))!==asset.assetSha256)return false;}catch{return false;}}for(const values of Object.values(saved.anchor.materials||{}))for(const material of Object.values(values))for(const key of ['image','normalImage'])if(material[key]){try{if(hash(await fs.readFile(path.join('public',material[key])))!==material[key+'Sha256'])return false;}catch{return false;}}return true;}
const short=k=>k.split('.').at(-1);
const defaults=s=>Object.fromEntries(Object.entries(s.properties).filter(([k])=>(/_OPTIONS\.|_FINISHES\./.test(k)||k.includes('_DIMENSIONS.')&&(k.endsWith('.DFRAMEDIAMETER')||k in s.choices))).map(([k,p])=>[short(k),p.value]));
function registerClasses(anchor,state){
 for(const key of Object.keys(state.properties).filter(k=>/_OPTIONS\.|_FINISHES\./.test(k)||k.includes('_DIMENSIONS.')&&(k.endsWith('.DFRAMEDIAMETER')||k in state.choices))){
  const field=short(key),sourceClass=key.split('.')[0];
  if(anchor.classes[field]&&anchor.classes[field]!==sourceClass)throw Error('Conflicting measured source property class: '+field);
  anchor.classes[field]=sourceClass;
 }
}
const choices=s=>Object.fromEntries(Object.entries(s.choices).filter(([k])=>s.properties[k]?.visible&&s.properties[k]?.editable).map(([k,vs])=>[short(k),vs.filter(v=>v.selectable).map(v=>v.value)]));
const finish=k=>k==='CPRICEGROUP'||k.endsWith('GROUP')||(/COLOR|CHCOL/.test(k)&&!/PLASTIC|FRAME/.test(k));
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);
async function load(state,dir){const ref=state.geometry,file=ref.file.includes('/')?path.join(source,ref.file):path.join(dir,ref.file),bytes=await fs.readFile(file);if(hash(bytes)!==ref.sha256)throw Error('Source hash mismatch');return compact(await io.readBinary(bytes));}
function palette(s){for(const [field,vs] of Object.entries(s.choices))for(const v of vs){if(!v.selectable)continue;const k=short(field);result.palettes[k]??={};result.palettes[k][v.value]??={text:v.text};}}
async function write(doc,name,roles,sourceParts=parts(doc)){
 if(!name.startsWith('part-'))name+='-'+hash(JSON.stringify(['meshopt-medium-p16-n16-uv16-v1',sourceParts.map(p=>[p.id,p.oldId,p.material,roles[p.id]||null])])).slice(0,20);
 for(const part of sourceParts)part.node.setName(part.id).setExtras({partId:part.id,finishField:roles[part.id]||null});
 const before=doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
 // Content-addressed part names bind source geometry, material and finish role.
 // Reuse verified files after a resumed preparation instead of recompressing.
 try{
  const bytes=await fs.readFile(path.join(target,name+'.glb')),existing=await io.readBinary(bytes),nodes=existing.getRoot().listNodes().filter(n=>n.getMesh());
  const triangles=existing.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
  if(triangles===before&&nodes.length===sourceParts.length&&nodes.every(n=>sourceParts.some(p=>p.id===n.getName())&&n.getExtras().partId===n.getName()&&n.getExtras().finishField===(roles[n.getName()]||null))&&bytes.length<=25*1024*1024)
   return {asset:assetRoot+name+'.glb',assetSha256:hash(bytes),bytes:bytes.length,sourceTriangles:before,partIds:sourceParts.map(p=>p.id)};
 }catch{}
 await doc.transform(weld(),prune({keepSolidTextures:true}),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeNormal:16,quantizeTexcoord:16}));
 const bytes=await io.writeBinary(doc);if(bytes.length>25*1024*1024)throw Object.assign(Error('Model exceeds per-asset limit: '+name+' '+bytes.length),{code:'ASSET_TOO_LARGE'});
 const file=path.join(target,name+'.glb'),temporary=file+'.tmp-'+process.pid;await fs.writeFile(temporary,bytes);await fs.rename(temporary,file);
 return {asset:assetRoot+name+'.glb',assetSha256:hash(bytes),bytes:bytes.length,sourceTriangles:before,partIds:sourceParts.map(p=>p.id)};
}
const partCache=new Map();
async function writeParts(doc,selected,roles){
 const assets=[];
 for(const part of selected){
  const identity=hash(JSON.stringify(['native-full-pbr-keep-source-textures-v2',part.id,part.oldId,part.material,roles[part.id]||null]));
  if(!partCache.has(identity)){
   const piece=new Document().setLogger(new Logger(Verbosity.ERROR));
   for(const extension of doc.getRoot().listExtensionsUsed())piece.createExtension(extension.constructor);
   const copy=copyToDocument(piece,doc,[part.node]).get(part.node);
   copy.setMatrix(part.node.getWorldMatrix());piece.createScene().addChild(copy);
   const geometry=await write(piece,'part-'+identity.slice(0,24),roles,[{...part,node:copy}]);partCache.set(identity,geometry);
  }
  assets.push(partCache.get(identity));
 }
 return assets;
}
function modelName(article,state){
 const v=defaults(state),back=v.CBACKREST||article.name.toUpperCase();let label=back.includes('MESH')?(back.startsWith('HB')?'Aukštas tinklinis atlošas':'Tinklinis atlošas'):back.includes('UPH')?(back.startsWith('HB')?'Aukštas apmuštas atlošas':back.startsWith('LB')?'Žemas apmuštas atlošas':back.startsWith('MB')?'Vidutinio aukščio apmuštas atlošas':'Apmuštas atlošas'):'Darbo kėdė';
 if(v.CHEADREST&&v.CHEADREST!=='NONE')label+=' su galvos atrama';
 if(v.CPLASTICCOLORVERSION)label+=' · '+({WHITEEDITION:'balta',BLACKEDITION:'juoda',LIGHTGREY:'pilka'}[v.CPLASTICCOLORVERSION]||v.CPLASTICCOLORVERSION)+' konstrukcija';
 return label;
}
for(const product of selection.products){
 const family={id:product.id,kind:'catalog',productId:product.productId,baseArticle:product.articles[0].code,sample:product.articles[0].sample,anchors:[],articles:[]};
 for(const article of product.articles){
  if(onlyArticle&&article.code!==onlyArticle)continue;
  const folder=path.join(source,article.code),manifest=await read(path.join(folder,'manifest.json'));
  family.articles.push({code:article.code,sample:article.sample,name:''});
  for(const id of manifest.anchors){
   const dir=path.join(folder,id),capture=await read(path.join(dir,'manifest.json')),plan=await read(path.join(dir,'component-plan.json')),base=await read(path.join(dir,'base.json'));
   const signature=await inputSignature(dir),checkpointFile=path.join(checkpoint,article.code+'-'+id+'.json');
   try{const saved=await read(checkpointFile);if(await validCache(saved,signature)){
    refineProfiles(saved.anchor);await sourceMirrors(saved.anchor,source);await nativeFinishProfiles(saved.anchor,dir);await sailFinishProfiles(saved.anchor,dir);family.anchors.push(saved.anchor);family.articles.at(-1).name=saved.anchor.name;fixtures.push(saved.fixture);report.push(saved.verification);
    for(const [k,v] of Object.entries(saved.palettes))result.palettes[k]={...result.palettes[k],...v};
    console.log(product.id,article.code,id,'verified checkpoint restored');continue;
   }}catch{}
   const doc=await load(base,dir),baseParts=parts(doc),baseMap=new Map(baseParts.map(p=>[p.id,p])),roles={},materialRoles=new Map(),surfaceRoles=new Map();
   const roleParts=capture.roleBase?parts(await load(await read(path.join(dir,capture.roleBase)),dir)):baseParts,roleMap=new Map(roleParts.map(p=>[p.id,p]));
   // These two native frame-colour fields were captured as structural colour
   // options rather than upholstery role probes. Reuse that measured single-
   // field evidence so newly introduced frame parts inherit the same finish.
   const frameRoleProbes=Object.entries(capture.options).filter(([key])=>['CFRAMEMETALCOLOR','CBAFRAMEMETALCOLOR'].includes(key.split('=')[0])).map(([key,file])=>{
    const field=Object.keys(base.properties).find(name=>name.endsWith('.'+key.split('=')[0])&&name.includes('_FINISHES.'));
    if(!field)throw Error('Frame finish probe has no matching native finish property: '+key);
    return {field,file,reference:baseMap};
   });
   const roleProbes=[...Object.entries(capture.roles).map(([field,file])=>({field,file,reference:roleMap})),...frameRoleProbes];
   for(const {field,file,reference} of roleProbes){
    const state=await read(path.join(dir,file)),probe=parts(await load(state,dir));
    for(const part of probe){const before=reference.get(part.id),original=baseMap.get(part.id);if(before&&original&&before.material!==part.material){
     const role=short(field),shape=original.material+'|'+original.node.getMesh().listPrimitives().reduce((n,p)=>n+p.getIndices().getCount(),0);
     roles[part.id]=role;if(!materialRoles.has(original.material))materialRoles.set(original.material,new Set());materialRoles.get(original.material).add(role);
     if(!surfaceRoles.has(shape))surfaceRoles.set(shape,new Set());surfaceRoles.get(shape).add(role);
    }}
   }
   const finishEvidence=await nativeFinishEvidence(dir,base,capture,baseParts,load);
   const sailEvidence=await sailFinishEvidence(dir,base,capture,baseParts,load);Object.assign(finishEvidence.roleOverrides,sailEvidence.roleOverrides);finishEvidence.materialStates.push(...sailEvidence.materialStates);finishEvidence.proofs.push(...sailEvidence.proofs);
   if(Object.keys(finishEvidence.roleOverrides).length){
    Object.assign(roles,finishEvidence.roleOverrides);materialRoles.clear();surfaceRoles.clear();
    for(const part of baseParts){const role=roles[part.id];if(!role)continue;
     const shape=part.material+'|'+part.node.getMesh().listPrimitives().reduce((n,p)=>n+p.getIndices().getCount(),0);
     if(!materialRoles.has(part.material))materialRoles.set(part.material,new Set());materialRoles.get(part.material).add(role);
     if(!surfaceRoles.has(shape))surfaceRoles.set(shape,new Set());surfaceRoles.get(shape).add(role);
    }
   }
   const inheritedFinishRole=nativeLocalFinishRoles(article.code,baseParts,roles);
   const a={id:article.code+':'+id,article:article.code,sample:article.sample,name:modelName(article,base),axes:manifest.axes.map(short),defaults:defaults(base),choices:choices(base),classes:Object.fromEntries(Object.keys(base.properties).filter(k=>(/_OPTIONS\.|_FINISHES\./.test(k)||k.includes('_DIMENSIONS.')&&(k.endsWith('.DFRAMEDIAMETER')||k in base.choices))).map(k=>[short(k),k.split('.')[0]])),fields:[],roles,patches:{},conditionalPatches:{},profiles:[],components:[],geometry:null};
   a.materials={};
   if(capture.axisTransitions)a.axisTransitions=Object.fromEntries(Object.entries(capture.axisTransitions).map(([key,value])=>[key,article.code+':'+value]));
   const materialStates=[base,...await Promise.all([...new Set([...Object.values(capture.roles),...frameRoleProbes.map(probe=>probe.file),...(capture.materials||[]).map(m=>m.file)])].map(file=>read(path.join(dir,file))))];
   materialStates.push(...finishEvidence.materialStates);
   for(const state of materialStates){const materialDoc=state===base?doc:await load(state,dir),vals=defaults(state);
    for(const part of parts(materialDoc)){const field=roles[part.id],value=field&&vals[field];if(!field||!value)continue;
     const material=await sourceFinishMaterial(part.node.getMesh().listPrimitives()[0].getMaterial());
     a.materials[field]??={};const previous=a.materials[field][value];
     if(previous&&sourceFinishKey(previous)!==sourceFinishKey(material))throw Error('Ambiguous source finish: '+article.code+' '+id+' '+field+' '+value);
     a.materials[field][value]=material;
     result.palettes[field]??={};result.palettes[field][value]??={text:value};
     Object.assign(result.palettes[field][value],{image:material.image,color:sourceFinishSwatch(material)});
    }
   }
   family.articles.at(-1).name=a.name;palette(base);
   try{a.geometry=await write(doc,article.code+'-'+id+'-base',roles);}
   catch(error){
    if(error.code!=='ASSET_TOO_LARGE')throw error;
    // Preserve every native mesh and material. Use the existing static patch
    // loader for the remaining base parts; this adds no public option.
    const splitDoc=await load(base,dir),splitParts=parts(splitDoc);
    const assets=await writeParts(splitDoc,splitParts,roles);
    if(assets.length<2)throw Error('Single native part exceeds per-asset limit');
    a.geometry=assets[0];
    a.components.push({fields:[],variants:[{key:'native-static-base',values:{},defaults:{},choices:{},transitions:{},patch:{remove:[],addIds:assets.slice(1).flatMap(g=>g.partIds),changes:{},choices:{},geometry:null,geometries:assets.slice(1)}}]});
    console.log(article.code,id,'native base split into',assets.length,'assets; max bytes',Math.max(...assets.map(g=>g.bytes)));
   }
   const fixture=await read(path.join(dir,'combined.json')),fixtureValues=defaults(fixture),assembled=new Map(baseParts.map(p=>[p.id,p.material]));
   const inferredPartRoles={...roles};
   for(let index=0;index<plan.groups.length;index++){
    const fullFields=plan.groups[index],fields=fullFields.map(short),variants=[],input=[];
    if(fields.length>1){const component=await read(path.join(dir,'component-'+index,'manifest.json'));
     for(const [key,record] of Object.entries(component.records))input.push({key,state:await read(path.join(dir,'component-'+index,record.file)),transitions:record.transitions});
    }else{
     input.push({key:fields[0]+'='+a.defaults[fields[0]],state:base,transitions:{}});
     for(const [name,file] of Object.entries(capture.options))if(name.startsWith(fields[0]+'='))input.push({key:name,state:await read(path.join(dir,file)),transitions:{}});
    }
    for(const item of input){
     const state=item.state,pd=await load(state,dir),actual=parts(pd),actualMap=new Map(actual.map(p=>[p.id,p]));registerClasses(a,state);
     const remove=baseParts.filter(p=>!actualMap.has(p.id)||actualMap.get(p.id).material!==p.material).map(p=>p.id),added=actual.filter(p=>!baseMap.has(p.id)||baseMap.get(p.id).material!==p.material);
     const patchRoles={...roles};for(const part of added){const measured=inheritedFinishRole(part);if(measured)patchRoles[part.id]=measured;}
     for(const part of added)if(!patchRoles[part.id]&&materialRoles.has(part.material)){
      const shape=part.material+'|'+part.node.getMesh().listPrimitives().reduce((n,p)=>n+p.getIndices().getCount(),0),candidates=surfaceRoles.get(shape)||materialRoles.get(part.material);
      if(candidates.size!==1)throw Error('Ambiguous finish surface: '+article.code+' '+id+' '+part.id);
      patchRoles[part.id]=[...candidates][0];
     }
     for(const part of added){const role=patchRoles[part.id];if(!role)continue;
      if(inferredPartRoles[part.id]&&inferredPartRoles[part.id]!==role)throw Error('Conflicting measured finish role: '+part.id);
      inferredPartRoles[part.id]=role;
     }
     const patch={remove,addIds:added.map(p=>p.id),changes:{},choices:{},geometry:null,geometries:await writeParts(pd,added,patchRoles)};
     // Compound transition keys come from the measured source graph. A
     // removed property is encoded there as an empty slot, not "undefined".
     const vals=defaults(state),sourceChoices=choices(state);
     const dependentChoices=Object.fromEntries([...new Set([...Object.keys(a.choices),...Object.keys(sourceChoices)])]
      .filter(k=>!fields.includes(k)&&JSON.stringify(sourceChoices[k])!==JSON.stringify(a.choices[k]))
      .map(k=>[k,sourceChoices[k]||null]));
     const variant={key:item.key,values:Object.fromEntries(fields.filter(k=>vals[k]!==undefined).map(k=>[k,vals[k]])),defaults:Object.fromEntries(Object.entries(vals).filter(([key,value])=>value!==a.defaults[key])),choices:sourceChoices,...(Object.keys(dependentChoices).length?{dependentChoices}:{}),transitions:item.transitions||{},patch};variants.push(variant);palette(state);
     if(fields.every(k=>fixtureValues[k]===vals[k])){for(const id of remove)assembled.delete(id);for(const part of added)assembled.set(part.id,part.material);}
    }
    a.components.push(bindNativeComponentAxes(a,{fields,variants},input));
   }
   const actual=parts(await load(fixture,dir)),shaderProofs=[];
   // Apply only independently captured exact finish materials. Geometries and
   // transforms still have to match; no tolerance hides a missing chair part.
   for(const part of actual){const field=inferredPartRoles[part.id],material=field&&a.materials[field]?.[fixtureValues[field]];
    if(assembled.has(part.id)&&material&&sourceFinishKey(material)===part.material){assembled.set(part.id,part.material);shaderProofs.push({part:part.id,field,value:fixtureValues[field]});}
   }
   const missing=actual.filter(p=>assembled.get(p.id)!==p.material).map(p=>p.id),extra=[...assembled.keys()].filter(id=>!actual.some(p=>p.id===id));
   const verification={product:product.id,article:article.code,anchor:id,expectedParts:actual.length,assembledParts:assembled.size,missing,extra,shaderProofs,passed:!missing.length&&!extra.length,sourceSha256:fixture.geometry.sha256};report.push(verification);
   if(!verification.passed){
    verification.materialDiagnostics=actual.filter(p=>missing.includes(p.id)).map(p=>({id:p.id,assembledHasPart:assembled.has(p.id),baseRole:roles[p.id],inferredRole:inferredPartRoles[p.id],expectedMaterial:hash(p.material),assembledMaterial:assembled.has(p.id)?hash(assembled.get(p.id)):null}));
    verification.extraOwners=extra.map(id=>({id,fields:a.components.filter(c=>c.variants.some(v=>v.patch.addIds.includes(id))).map(c=>c.fields)}));
    verification.missingTransforms=actual.filter(p=>missing.includes(p.id)).map(p=>({id:p.id,matrix:p.node.getWorldMatrix(),positionCount:p.node.getMesh().listPrimitives()[0].getAttribute('POSITION').getCount()}));
    await fs.writeFile(path.join(path.dirname(reportOutput),article.code+'-geometry-mismatch.json'),JSON.stringify(verification,null,2));
    throw Error('Composite geometry mismatch: '+article.code+' '+id+'; missing '+missing.length+' extra '+extra.length);
   }
   registerClasses(a,fixture);
   const sourceOptions=Object.entries(defaults(fixture)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>a.classes[k]+'.'+k+'='+(k==='CPRICEGROUP'?v.replace(/^_/,''):v));
   const publicKeys=new Set([...Object.keys(choices(fixture)),...a.axes,...a.components.flatMap(c=>c.fields)]);
   fixtures.push({family:family.id,productId:product.productId,anchor:a.id,sample:a.sample,values:Object.fromEntries(Object.entries(fixtureValues).filter(([k])=>publicKeys.has(k))),choices:choices(fixture),supplierOptions:sourceOptions,sourceSha256:fixture.geometry.sha256});
   const profileStates=await Promise.all(capture.profiles.map(file=>read(path.join(dir,file))));
   for(const state of profileStates)registerClasses(a,state);
   // A structural selector can become read-only under a finish profile
   // without changing the native constructor (e.g. a Nappa seat). Preserve
   // its measured visibility/domain alongside finish lists. A profile that
   // actually changes the axis still requires an explicit constructor repair.
   const profileField=k=>finish(k)||(a.axes.includes(k)&&profileStates.every(state=>defaults(state)[k]===a.defaults[k]));
   const priceStates=profileStates.filter((_,i)=>!capture.profiles[i].includes('--'));
   const priceControlled=new Set(Object.keys(a.defaults).filter(key=>profileField(key)&&priceStates.some(state=>{
    const first=priceStates[0];return defaults(state)[key]!==defaults(first)[key]||JSON.stringify(choices(state)[key])!==JSON.stringify(choices(first)[key]);
   })));
   for(let profileIndex=0;profileIndex<profileStates.length;profileIndex++){const state=profileStates[profileIndex];palette(state);const vals=defaults(state),lists=choices(state),price=vals.CPRICEGROUP;
    // Price snapshots precede the per-group snapshots in the source manifest.
    const first=profileStates.find(p=>defaults(p).CPRICEGROUP===price),firstVals=defaults(first),firstChoices=choices(first);
    const changedGroup=capture.profiles[profileIndex].match(/--([^=]+)=/)?.[1];
    const when=capture.profileWhen?.[capture.profiles[profileIndex]]||{...(price?{CPRICEGROUP:price}:{}),...(changedGroup?{[changedGroup]:vals[changedGroup]}:{})};
    if(Object.entries(when).some(([field,value])=>vals[field]!==value))throw Error('Conditional profile differs from measured source');
    const controlled=changedGroup?Object.keys({...firstVals,...vals}).filter(k=>profileField(k)&&(JSON.stringify(lists[k])!==JSON.stringify(firstChoices[k])||vals[k]!==firstVals[k])):Object.keys({...a.defaults,...vals,...a.choices,...lists}).filter(key=>priceControlled.has(key));
    const rule={when,defaults:Object.fromEntries(Object.entries(vals).filter(([k])=>controlled.includes(k))),choices:Object.fromEntries(controlled.filter(k=>lists[k]).map(k=>[k,lists[k]])),hidden:controlled.filter(k=>!lists[k])};
    if(capture.coupledRoleEvidence){
     // The preserved source color probe proves this Bjarg linkage. Price/group
     // snapshots prove where each follower is fixed and where it is independent.
     const evidence=await read(path.join(dir,Object.values(capture.coupledRoleEvidence)[0]));
     const evidenceValues=defaults(evidence);
     if(evidenceValues.CUPHCOLOR!==a.defaults.CUPHCOLOR&&evidenceValues.CUPHCOLOR===evidenceValues.CHEADRESTUPHCOLOR){
      rule.mirrors={};for(const [target,control] of Object.entries({CUPHCOLOR:'CHEADRESTUPHCOLOR',CUPHGROUP:'CHEADRESTUPHGROUP'}))
       if(!lists[target]&&lists[control]&&vals[target]===vals[control])rule.mirrors[target]=control;
     }
    }
    a.profiles.push(rule);
   }
   refineProfiles(a);await sourceMirrors(a,source);await nativeFinishProfiles(a,dir);await sailFinishProfiles(a,dir);a.fields=Object.keys(a.choices);family.anchors.push(a);
   await fs.writeFile(checkpointFile,JSON.stringify({signature,anchor:a,fixture:fixtures.at(-1),verification,palettes:result.palettes}));
   console.log(product.id,article.code,id,'verified',a.components.reduce((n,c)=>n+c.variants.length,0),'component states');
  }
 }
 if(family.anchors.length){await componentConstructorDestinations(family,source,load,defaults);result.families.push(family);}
}
for(const [field,vs] of Object.entries(result.palettes))for(const [code,item] of Object.entries(vs)){
 try{const file=path.resolve('public/media/configurator/finishes/'+code.toLowerCase()+'.jpg'),{data,info}=await sharp(file).resize(16,16).removeAlpha().raw().toBuffer({resolveWithObject:true});const total=[0,0,0];for(let i=0;i<data.length;i+=info.channels)for(let c=0;c<3;c++)total[c]+=data[i+c];item.image='/media/configurator/finishes/'+code.toLowerCase()+'.jpg';item.color='#'+total.map(n=>Math.round(n/256).toString(16).padStart(2,'0')).join('');}catch{}
}
if(process.argv.includes('--write-partial')&&!process.argv.some(v=>v.startsWith('--output=')))throw Error('Partial preparation requires an isolated explicit output');
if(!onlyArticle||process.argv.includes('--write-partial')){await fs.writeFile(output,JSON.stringify(result));
await fs.writeFile(fixturesOutput,JSON.stringify(fixtures));}
await fs.writeFile(reportOutput,JSON.stringify(report,null,2));
console.log('Ready',result.families.length,'products',report.length,'verified anchors');
