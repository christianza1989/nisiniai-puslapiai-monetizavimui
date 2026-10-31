import {Mesh,MeshStandardMaterial,MeshPhysicalMaterial,type Material,type Object3D} from 'three';
import type {Asset} from './expanded-configurator';
import {chairFinishRoles,type ChairSurfaceRole} from './chair-material-groups';
const key='ergonomicOwnChairRole';
export function legacyChairSurfaceRole(object:Object3D):ChairSurfaceRole|undefined{return object.userData[key];}
/** Called only after the asset's full SHA and byte count match. Roles come
 * from original exported node extras, addressed by GLTFLoader associations. */
export function tagLegacyChairRoles(root:Object3D,associations:Map<Object3D,{nodes?:number;primitives?:number}>,document:{nodes?:{extras?:{finishField?:string;partId?:string};mesh?:number}[];meshes?:{primitives:{material?:number}[]}[]},asset:Asset){
 function visit(object:Object3D,parentNode?:number){
  const a=associations.get(object),node=a?.nodes??parentNode,source=node===undefined?undefined:document.nodes?.[node];
  if(object instanceof Mesh&&source?.extras?.finishField&&chairFinishRoles[source.extras.finishField]){
   // A node-wide role is insufficient for a mesh containing several material
   // primitives. Keep its geometry original and the color control unavailable.
   const primitive=document.meshes?.[source.mesh!]?.primitives.length===1?(a?.primitives??0):undefined;
   const material=primitive===undefined?undefined:document.meshes?.[source.mesh!]?.primitives[primitive]?.material;
   if(node!==undefined&&primitive!==undefined&&material!==undefined)object.userData[key]={assetSha256:asset.assetSha256,node,primitive,material,field:source.extras.finishField,partId:source.extras.partId} satisfies ChairSurfaceRole;
  }
  for(const child of object.children)visit(child,node);
 }
 visit(root);
}
export function visibleLegacyChairRoles(root:Object3D):ChairSurfaceRole[]{
 const result:ChairSurfaceRole[]=[];
 function visit(o:Object3D){if(!o.visible)return;if(o instanceof Mesh&&o.userData[key])result.push({...o.userData[key]});for(const c of o.children)visit(c);}
 visit(root);return result;
}
/** Keep the actual GLTF material/texture references untouched. Display finishes
 * use disposable clones; original preview reinstates the exact source objects. */
export function createLegacyChairMaterialApplication(root:Object3D){
 const originals=new Map<Mesh,Material|Material[]>(),clones=new Set<Material>();
 root.traverse(o=>{if(o instanceof Mesh&&legacyChairSurfaceRole(o))originals.set(o,o.material);});
 function resetOriginal(){for(const [mesh,material]of originals)mesh.material=material;for(const c of clones)c.dispose();clones.clear();}
 return {resetOriginal,prepare(){resetOriginal();for(const [mesh,original]of originals){
  const clone=(m:Material)=>{let c:Material;if(m instanceof MeshStandardMaterial&&!(m instanceof MeshPhysicalMaterial)){const p=new MeshPhysicalMaterial();MeshStandardMaterial.prototype.copy.call(p,m);c=p;}else c=m.clone();clones.add(c);return c;};
  mesh.material=Array.isArray(original)?original.map(clone):clone(original);
 }},dispose:resetOriginal};
}
