import {Mesh,type Object3D,type Material,type Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {chairMaterialDocument,type ChairPreview} from './chair-preview';
import type {ChairColorPlan} from './chair-color-admission';

const surfaceKey='ergonomicChairSelector';
/** Prepared selectors are admitted against the exact original GLB JSON and BIN.
 * At runtime, use GLTFLoader source associations, never mesh names or ordering.
 */
export function tagChairSurfaces(root:Object3D,associations:Map<Object3D,{nodes?:number;primitives?:number}>,data:ChairPreview,sha:string){
 const source=data.selectors.assets[sha];if(!source||source.assetSha256!==sha)throw Error('Missing own chair selectors');
 const found=new Set<string>();
 function visit(object:Object3D,parentNode?:number){
  const a=associations.get(object),node=a?.nodes??parentNode;
  if(object instanceof Mesh){
   const slots=source.slots.filter(s=>s.sourceNodePath.length===1&&s.sourceNodePath[0]===node&&s.primitive===a?.primitives);
   if(slots.length!==1||found.has(slots[0].selectorId))throw Error('Ambiguous chair primitive association');
   found.add(slots[0].selectorId);object.userData[surfaceKey]=sha+':'+slots[0].selectorId;
  }
  for(const child of object.children)visit(child,node);
 }
 visit(root);if(found.size!==source.slots.length)throw Error('Missing chair primitive association');
}
export function createChairColorMaterials(data:ChairPreview){
 const abort=new AbortController(),cached=new Map<string,Promise<Material>>(),owned=new Set<Material>(),urls=new Set<string>();let disposed=false;
 async function load(id:string,source:unknown){
  const document=chairMaterialDocument(source,data.textures);
  for(const image of document.images as {uri:string}[]){
   const entry=Object.values(data.textures).find(t=>t.asset===image.uri);if(!entry)throw Error('Missing chair texture identity');
   const response=await fetch(image.uri,{signal:abort.signal});if(!response.ok)throw Error('Chair texture unavailable');
   const bytes=await response.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==entry.bytes||sha!==entry.sha256)throw Error('Chair texture bytes changed');
   if(disposed)throw Error('Chair view closed');const url=URL.createObjectURL(new Blob([bytes]));urls.add(url);image.uri=url;
  }
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(document),'');
  const material=await gltf.parser.getDependency('material',0) as Material;owned.add(material);if(disposed){disposeOwned();throw Error('Chair view closed');}return material;
 }
 function disposeOwned(){const textures=new Set<Texture>();for(const material of owned){for(const value of Object.values(material))if(value&&typeof value==='object'&&'isTexture'in value&&value.isTexture)textures.add(value as Texture);material.dispose();}for(const texture of textures)texture.dispose();owned.clear();for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
 return {get(id:string,source:unknown){let result=cached.get(id);if(!result){result=load(id,source);cached.set(id,result);}return result;},dispose(){disposed=true;abort.abort();disposeOwned();}};
}
export function createChairColorApplication(root:Object3D){
 const originals=new Map<Mesh,Material|Material[]>();root.traverse(o=>{if(o instanceof Mesh)originals.set(o,o.material);});
 const clones=new Set<Material>();let revision=0;
 function restore(){for(const [mesh,material]of originals)mesh.material=material;for(const clone of clones)clone.dispose();clones.clear();}
 return {async apply(plan:ChairColorPlan,get:(id:string,source:unknown)=>Promise<Material>){
  const current=++revision;restore();
  const targets=plan.assignments.map(binding=>{const meshes=[...originals.keys()].filter(mesh=>mesh.userData[surfaceKey]===binding.assetSha256+':'+binding.selectorId);if(meshes.length!==1)throw Error('Chair assignment target missing');return {mesh:meshes[0],id:binding.materialId};});
  const materials=new Map(await Promise.all([...new Set(targets.map(t=>t.id))].map(async id=>[id,await get(id,plan.materials[id])]as const)));
  if(current!==revision)return false;
  for(const target of targets){const material=materials.get(target.id)!.clone();if('vertexColors'in material)material.vertexColors=!!target.mesh.geometry.attributes.color;if('flatShading'in material)material.flatShading=!target.mesh.geometry.attributes.normal;clones.add(material);target.mesh.material=material;}
  return true;
 },dispose(){revision++;restore();}};
}
