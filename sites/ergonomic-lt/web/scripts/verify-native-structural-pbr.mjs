import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {parts,compact,hash,materialFingerprint} from './configurator-geometry.mjs';

let ioPromise;
function io(){
 return ioPromise??=(async()=>{await MeshoptDecoder.ready;return new NodeIO().setLogger(new Logger(Verbosity.ERROR)).registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});})();
}
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
function inside(root,relative){const file=path.resolve(root,relative);assert(file.startsWith(path.resolve(root)+path.sep),'PBR proof path escaped its source root');return file;}
const short=k=>k.split('.').at(-1);
const values=s=>Object.fromEntries(Object.entries(s.properties).filter(([k])=>/_OPTIONS\.|_FINISHES\./.test(k)).map(([k,p])=>[short(k),p.value]));
const choices=s=>Object.fromEntries(Object.entries(s.choices).filter(([k])=>s.properties[k]?.visible&&s.properties[k]?.editable).map(([k,vs])=>[short(k),vs.filter(v=>v.selectable).map(v=>v.value)]));

// Compare actual serialized components against original Native scenes. Keeping
// just IDs and material fingerprints in caches avoids retaining entire meshes.
// This supplements, rather than replaces, source choices and geometry checks.
export async function verifyNativeStructuralPbr({family,product,source,publicRoot,createEngine}){
 const reader=await io(),engine=createEngine(family),assetCache=new Map(),nativeCache=new Map();
 const states=[],errors=[];let checkedStates=0,checkedPartInstances=0;
 async function assetMap(ref){
  if(assetCache.has(ref.asset)){const cached=assetCache.get(ref.asset);assert.equal(cached.sha256,ref.assetSha256);return cached.parts;}
  assert(ref.asset.startsWith('/models/configurator/'));
  const bytes=await fs.readFile(inside(publicRoot,ref.asset.slice(1)));assert.equal(hash(bytes),ref.assetSha256,'Serialized PBR asset bytes');
  const doc=await reader.readBinary(bytes),entries=[];
  for(const node of doc.getRoot().listNodes().filter(n=>n.getMesh())){
   const mesh=node.getMesh();assert.equal(mesh.listPrimitives().length,1,'Unreviewed multi-primitive serialized component');
   const id=node.getExtras().partId;assert(typeof id==='string');entries.push([id,materialFingerprint(mesh.listPrimitives()[0].getMaterial())]);
  }
  const map=new Map(entries);assert.equal(map.size,entries.length,'Duplicate component identity');
  assert.deepEqual([...map.keys()].sort(),[...ref.partIds].sort());assetCache.set(ref.asset,{sha256:ref.assetSha256,parts:map});return map;
 }
 for(const anchor of family.anchors){
  const relative=path.join(anchor.article,anchor.id.split(':').slice(1).join(':')),dir=inside(source,relative),capture=await read(path.join(dir,'manifest.json'));
  const files=new Set(['base.json','combined.json',...Object.values(capture.options)]);
  for(const file of await fs.readdir(dir,{recursive:true}))if(/^component-\d+[\\/]/.test(file)&&file.endsWith('.json')&&!file.endsWith('manifest.json')&&!file.endsWith('checkpoint.json'))files.add(file);
  for(const file of files){const snapshot=await read(inside(dir,file));assert(snapshot.properties&&snapshot.choices&&snapshot.geometry);states.push({anchor,dir,file,snapshot});}
 }
 for(const {anchor,dir,file,snapshot} of states){
  try{
   const v=values(snapshot),visible=choices(snapshot),keys=new Set([...Object.keys(visible),...anchor.axes,...anchor.components.flatMap(c=>c.fields)]);
   // The captured anchor is authoritative, including explicitly measured
   // dependent axes such as Wing's arm-pad/body material relationship.
   const state=engine.catalogValidate(product,{family:family.id,anchor:anchor.id,values:Object.fromEntries(Object.entries(v).filter(([k])=>keys.has(k)))});
   assert.deepEqual(engine.catalogChoices(state),visible,'Native structural choices');
   const selected=engine.catalogAssets(state),assembled=new Map(await assetMap(selected.base));
   for(const patch of selected.patches){for(const id of patch.remove)assembled.delete(id);for(const ref of [...(patch.geometry?[patch.geometry]:[]),...(patch.geometries||[])])for(const [id,material] of await assetMap(ref))assembled.set(id,material);}
   const reference=snapshot.geometry;
   if(!nativeCache.has(reference.sha256)){
    const sourceFile=reference.file.includes('/')?inside(source,reference.file):inside(dir,reference.file),bytes=await fs.readFile(sourceFile);assert.equal(hash(bytes),reference.sha256,'Original Native PBR scene bytes');
    const doc=compact(await reader.readBinary(bytes));
    for(const node of doc.getRoot().listNodes().filter(n=>n.getMesh()))assert.equal(node.getMesh().listPrimitives().length,1,'Unreviewed multi-primitive Native component');
    const raw=parts(doc),map=new Map(raw.map(p=>[p.id,p.material]));assert.equal(map.size,raw.length);nativeCache.set(reference.sha256,map);
   }
   const expected=nativeCache.get(reference.sha256);assert.deepEqual([...assembled.keys()].sort(),[...expected.keys()].sort(),'Original Native part set');
   for(const [id,material] of expected){assert.equal(assembled.get(id),material,'Original five-channel PBR, scalar, sampler and KHR texture transform: '+id);checkedPartInstances++;}
   checkedStates++;
  }catch(error){errors.push({anchor:anchor.id,file,reason:String(error)});if(errors.length>=5)break;}
 }
 return {at:new Date().toISOString(),result:errors.length?'FAIL':'PASS',anchors:family.anchors.length,structuralSnapshots:states.length,checkedStates,checkedPartInstances,serializedAssets:assetCache.size,originalScenes:nativeCache.size,errors,nativeRequests:0,sourceOrAppChanged:false,scope:'Original structural base/options/component/composite scenes. Complements full geometry and source-choice proofs; dynamic finish overrides require separate source-placement evidence.'};
}
