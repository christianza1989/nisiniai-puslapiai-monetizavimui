import {Mesh,type Object3D,type Material,type Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {DeskColors,DeskColorPlan} from './desk-colors';

export const deskSurfaceKey='ergonomicDeskSurface';
/** Loader associations identify the source node and primitive, never traversal order. */
export function tagDeskSurfaces(root:Object3D,associations:Map<Object3D,{nodes?:number;primitives?:number}>,sha:string){
 function visit(object:Object3D,parentNode?:number){const association=associations.get(object),node=association?.nodes??parentNode;
  if(object instanceof Mesh&&node!==undefined&&association?.primitives!==undefined)object.userData[deskSurfaceKey]=sha+':'+node+':'+association.primitives;
  for(const child of object.children)visit(child,node);
 }
 visit(root);
}
export function createDeskColorMaterials(colors:DeskColors){
 let document:ReturnType<GLTFLoader['parseAsync']>|undefined,disposed=false;
 const cached=new Map<string,Promise<Material>>(),owned=new Set<Material>();
 async function material(id:string){
  const index=colors.materialIds.indexOf(id);if(index<0)throw Error('Unknown desk material');
  if(!document)document=new GLTFLoader().parseAsync(JSON.stringify(colors.materialDocument),'');
  const gltf=await document;
  const loaded=await gltf.parser.getDependency('material',index)as Material;
  owned.add(loaded);if(disposed){disposeOwned();throw Error('Desk material view closed');}return loaded;
 }
 function disposeOwned(){const textures=new Set<Texture>();for(const material of owned){for(const value of Object.values(material))if(value&&typeof value==='object'&&'isTexture'in value&&value.isTexture)textures.add(value as Texture);material.dispose();}for(const texture of textures)texture.dispose();owned.clear();}
 return {get(id:string){let result=cached.get(id);if(!result){result=material(id);cached.set(id,result);}return result;},dispose(){disposed=true;disposeOwned();}};
}

/** Restore before each selection; shared source materials are never mutated. */
export function createDeskColorApplication(root:Object3D){
 const originals=new Map<Mesh,{material:Material|Material[];visible:boolean}>();
 root.traverse(object=>{if(object instanceof Mesh)originals.set(object,{material:object.material,visible:object.visible});});
 let revision=0;const clones=new Set<Material>();
 return {async apply(plan:DeskColorPlan,getMaterial:(id:string)=>Promise<Material>){
  const current=++revision;const materials=new Map(await Promise.all([...new Set(Object.values(plan.materials))].map(async id=>[id,await getMaterial(id)]as const)));
  if(current!==revision)return false;
  for(const clone of clones)clone.dispose();clones.clear();
  for(const [mesh,original]of originals){mesh.material=original.material;mesh.visible=original.visible;const key=mesh.userData[deskSurfaceKey]as string|undefined;if(!key)continue;
   if(plan.hidden.includes(key))mesh.visible=false;
   const id=plan.materials[key];if(id){const clone=materials.get(id)!.clone();if('vertexColors'in clone)clone.vertexColors=!!mesh.geometry.attributes.color;if('flatShading'in clone)clone.flatShading=!mesh.geometry.attributes.normal;clones.add(clone);mesh.material=clone;}
  }
  return true;
 },dispose(){revision++;for(const clone of clones)clone.dispose();clones.clear();for(const [mesh,original]of originals){mesh.material=original.material;mesh.visible=original.visible;}}};
}
