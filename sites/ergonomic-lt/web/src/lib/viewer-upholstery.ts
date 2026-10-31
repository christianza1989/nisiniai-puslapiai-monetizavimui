import {Mesh,type Object3D} from 'three';

const key='ergonomicViewerUpholsteryProof';
// Original exported controller IDs are material-role evidence only on an
// individually addressed source primitive whose own full bytes were checked.
const fields=new Set(['CUPHCOLOR','CUPHSEATCOLOR','CUPHBACKRESTCOLOR','CUPHBACKCOLOR',
 'CSEBASIDEPROFILUPHCOLOR','CUPHSIDECOLORSEAT','CHEADRESTUPHCHCOLOR',
 'CHEADRESTUPHCOLOR','CHEADSIDEPROFUPHCHCOL','CARMRESTUPHCOLOR']);
type Document={nodes?:{mesh?:number;extras?:{finishField?:string}}[];meshes?:{primitives:{material?:number}[]}[]};
export function tagViewerUpholstery(root:Object3D,associations:Map<Object3D,{nodes?:number;primitives?:number}>,document:Document,sha256:string){
 function visit(object:Object3D,parent?:number){
  const association=associations.get(object),node=association?.nodes??parent;
  const source=node===undefined?undefined:document.nodes?.[node],primitives=source?.mesh===undefined?undefined:document.meshes?.[source.mesh]?.primitives;
  if(object instanceof Mesh&&source?.extras?.finishField&&fields.has(source.extras.finishField)&&primitives?.length===1){
   const primitive=association?.primitives??0,material=primitives[primitive]?.material;
   if(material!==undefined)object.userData[key]={sha256,node,primitive,material,field:source.extras.finishField};
  }
  for(const child of object.children)visit(child,node);
 }
 visit(root);
}
export function isViewerUpholstery(object:Object3D){return object instanceof Mesh&&!!object.userData[key];}
