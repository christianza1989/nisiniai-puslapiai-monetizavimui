import {Mesh,type Object3D} from 'three';
export function tagPublicViewerRoles(root:Object3D,associations:Map<Object3D,{nodes?:number;primitives?:number}>,document:{nodes?:{mesh?:number;extras?:{ergonomicUpholstery?:boolean}}[];meshes?:{primitives:{material?:number}[]}[]},sha:string){
 function visit(object:Object3D,parent?:number){const node=associations.get(object)?.nodes??parent,source=node===undefined?undefined:document.nodes?.[node],primitives=source?.mesh===undefined?undefined:document.meshes?.[source.mesh]?.primitives;if(object instanceof Mesh&&source?.extras?.ergonomicUpholstery&&primitives?.length===1&&primitives[0].material!==undefined)object.userData.ergonomicViewerUpholsteryProof={sha,node};for(const child of object.children)visit(child,node);}visit(root);
}
export function isPublicViewerUpholstery(object:Object3D){return object instanceof Mesh&&!!object.userData.ergonomicViewerUpholsteryProof;}
