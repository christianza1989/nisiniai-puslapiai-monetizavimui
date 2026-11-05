import {Mesh,MeshStandardMaterial,MeshPhysicalMaterial,type Material,type Object3D} from 'three';
const roleKey='ergonomicPublicChairRole';
export function publicChairRole(object:Object3D){return object.userData[roleKey];}
function tag(root:Object3D,associations:Map<Object3D,{nodes?:number;primitives?:number}>,document:any,asset:{assetSha256:string}){
 function visit(object:Object3D,parentNode?:number){const a=associations.get(object),node=a?.nodes??parentNode,source=node===undefined?undefined:document.nodes?.[node];
  if(object instanceof Mesh&&typeof source?.extras?.finishField==='string'&&['upholstery','mesh'].includes(source.extras.ergonomicChairRole)){
   const primitive=document.meshes?.[source.mesh]?.primitives.length===1?(a?.primitives??0):undefined,material=primitive===undefined?undefined:document.meshes[source.mesh].primitives[primitive]?.material;
   if(node!==undefined&&primitive!==undefined&&material!==undefined)object.userData[roleKey]={assetSha256:asset.assetSha256,node,primitive,material,field:source.extras.finishField};
  }for(const child of object.children)visit(child,node);
 }visit(root);
}
function visible(root:Object3D){const result:any[]=[];function visit(object:Object3D){if(!object.visible)return;if(object instanceof Mesh&&publicChairRole(object))result.push({...publicChairRole(object)});for(const child of object.children)visit(child);}visit(root);return result;}
/** Identical material ownership/reset rules to the authenticated renderer. */
function application(root:Object3D){const originals=new Map<Mesh,Material|Material[]>(),clones=new Set<Material>();root.traverse(object=>{if(object instanceof Mesh&&publicChairRole(object))originals.set(object,object.material);});
 function resetOriginal(){for(const[mesh,material]of originals)mesh.material=material;for(const clone of clones)clone.dispose();clones.clear();}
 return {resetOriginal,prepare(){resetOriginal();for(const[mesh,original]of originals){const clone=(material:Material)=>{let result:Material;if(material instanceof MeshStandardMaterial&&!(material instanceof MeshPhysicalMaterial)){const physical=new MeshPhysicalMaterial();MeshStandardMaterial.prototype.copy.call(physical,material);result=physical;}else result=material.clone();clones.add(result);return result;};mesh.material=Array.isArray(original)?original.map(clone):clone(original);}},dispose:resetOriginal};
}
export const publicChairRoleAdapter={tag,visible,role:publicChairRole,application};
export const ignorePublicRoleProof=()=>{};
