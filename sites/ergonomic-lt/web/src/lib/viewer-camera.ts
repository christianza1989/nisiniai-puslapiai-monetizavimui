import {Box3,Mesh,Vector3,type Object3D} from 'three';

// Hidden base parts remain in the assembly so a later patch can replace them.
// They must not affect framing or be selected when inspecting a surface.
export function visibleMeshes(root:Object3D){
 const meshes:Mesh[]=[];
 root.traverseVisible(o=>{if(o instanceof Mesh)meshes.push(o);});return meshes;
}
export function visibleBounds(root:Object3D){
 root.updateMatrixWorld(true);const bounds=new Box3();
 for(const mesh of visibleMeshes(root))bounds.union(new Box3().setFromObject(mesh,true));
 return bounds;
}
export function cameraFrame(bounds:Box3,aspect:number,fov:number,direction=new Vector3(2.6,1.25,3.7)){
 const size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3()),view=direction.clone().normalize();
 const right=new Vector3(0,1,0).cross(view).normalize(),up=view.clone().cross(right).normalize();
 const tangent=Math.tan(fov*Math.PI/360),horizontal=tangent*Math.max(aspect,.25);let distance=0;
 // Perspective depth and the oblique camera angle matter. A height-only fit
 // can cut off the front legs of a short, deep chair despite correct bounds.
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const corner=new Vector3(x,y,z).sub(center),depth=corner.dot(view);
  distance=Math.max(distance,depth+Math.abs(corner.dot(right))/horizontal*1.18,depth+Math.abs(corner.dot(up))/tangent*1.18);
 }
 return {center,distance,
  near:Math.max(.001,size.length()*.001),minimum:Math.max(.035,size.y*.025),maximum:Math.max(size.y,size.x)*8};
}

// Keep fine adjacent source surfaces distinguishable at the product distance,
// while retaining sub-millimetre clipping when inspecting from 35 mm away.
export function cameraNear(distance:number){return Math.max(.00005,distance*.02);}

// A floating toolbar occupies real display space even though it does not
// affect the canvas dimensions. Fit to the remaining width and shift the
// optical centre so wide products remain visible beside those controls.
export function unobstructedCameraViewport(width:number,height:number,rightInset:number){
 const inset=Math.max(0,Math.min(rightInset,width*.5));
 return {aspect:(width-inset)/height,offsetX:inset/2,inset};
}
