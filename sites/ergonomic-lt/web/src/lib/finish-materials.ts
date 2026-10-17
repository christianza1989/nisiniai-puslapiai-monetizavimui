import {Mesh,type Object3D} from 'three';
// GLTF may share one material between differently configured surfaces.
// Keep their initial maps, but separate the material instances before editing.
export function isolateFinishMaterials(root:Object3D){
 root.traverse(object=>{if(!(object instanceof Mesh))return;let parent:Object3D|null=object,field:string|undefined;
  while(parent&&!field){field=parent.userData.finishField;parent=parent.parent;}
  if(field)object.material=Array.isArray(object.material)?object.material.map(material=>material.clone()):object.material.clone();
 });
}
