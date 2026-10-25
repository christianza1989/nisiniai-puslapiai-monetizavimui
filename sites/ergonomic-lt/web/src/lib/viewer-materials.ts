import {Mesh,MeshStandardMaterial,MeshPhysicalMaterial,type Object3D,type Texture} from 'three';

export function finishField(object:Object3D){
 let parent:Object3D|null=object;
 while(parent){if(typeof parent.userData.finishField==='string')return parent.userData.finishField as string;parent=parent.parent;}
}
// Upgrade only configured upholstery. Preserve measured glTF properties/maps;
// physical fabric sheen is a conservative display approximation, not scan data.
export function physicalUpholstery(root:Object3D){
 root.traverse(object=>{if(!(object instanceof Mesh)||!finishField(object))return;
  const upgrade=(source:MeshStandardMaterial)=>{
   if(source instanceof MeshPhysicalMaterial)return source;
   const material=new MeshPhysicalMaterial();MeshStandardMaterial.prototype.copy.call(material,source);source.dispose();return material;
  };
  object.material=Array.isArray(object.material)?object.material.map(m=>m instanceof MeshStandardMaterial?upgrade(m):m):object.material instanceof MeshStandardMaterial?upgrade(object.material):object.material;
 });
}
const textile=new Set(['CSE','MT','RX','SD','SC','SY','ST','CN','ME','CUR','ERA','X','YS','YB']);
export function setFabricSheen(material:MeshStandardMaterial,group:string|undefined){
 if(!(material instanceof MeshPhysicalMaterial))return;
 material.sheen=group&&textile.has(group)?.12:0;material.sheenColor.setRGB(.5,.5,.5);material.sheenRoughness=1;
}
export function copyTexturePlacement(texture:Texture,source:Texture|null){
 if(!source)return;
 texture.channel=source.channel;texture.repeat.copy(source.repeat);texture.offset.copy(source.offset);texture.center.copy(source.center);texture.rotation=source.rotation;
 texture.wrapS=source.wrapS;texture.wrapT=source.wrapT;texture.matrixAutoUpdate=source.matrixAutoUpdate;texture.matrix.copy(source.matrix);
}
