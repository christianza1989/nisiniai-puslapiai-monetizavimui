import {BackSide,Color,CylinderGeometry,DirectionalLight,Group,Mesh,MeshStandardMaterial,MeshLambertMaterial,PlaneGeometry,PointLight,ShadowMaterial,Vector3,type Object3D} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {visibleBounds} from './viewer-camera';
import {lightingPresets,type SceneSettings} from './viewer-scene';

// Matte room surfaces participate in the same physical lighting as the product.
export function showroom(root:Object3D,light:DirectionalLight){
 const bounds=visibleBounds(root),center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
 const height=Math.max(size.y,.5),extent=Math.max(size.x,size.y,size.z,1)*2;
 const group=new Group(),paint=new MeshStandardMaterial({color:'#f3f4f1',roughness:1,metalness:0});group.name='Showroom';
 const floor=new Mesh(new PlaneGeometry(100,100),paint);floor.rotation.x=-Math.PI/2;floor.position.set(center.x,bounds.min.y-.012,center.z);floor.receiveShadow=true;group.add(floor);
 // A continuous wall avoids hard backdrop corners when orbiting or zooming.
 const wallPaint=paint.clone();wallPaint.side=BackSide;
 const wall=new Mesh(new CylinderGeometry(24,24,24,128,1,true),wallPaint);wall.position.set(center.x,bounds.min.y+12,center.z);wall.receiveShadow=true;group.add(wall);
 light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=.0025;light.shadow.bias=-.0001;light.shadow.radius=2.5;light.shadow.intensity=.85;
 Object.assign(light.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:.1,far:40});light.shadow.camera.updateProjectionMatrix();
 light.target.position.set(center.x,bounds.min.y+height*.45,center.z);
 return {group,paint,wallPaint,target:light.target,position:(preset:readonly number[],angle:number)=>new Vector3().fromArray(preset).applyAxisAngle(new Vector3(0,1,0),angle*Math.PI/180).add(light.target.position)};
}

// White product photography stage: the floor receives real shadows but has no
// diffuse colour. A lit wall/floor would create a grey horizon while orbiting.
export function productShowroom(root:Object3D,light:DirectionalLight){
 const bounds=visibleBounds(root),center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
 const height=Math.max(size.y,.5),extent=Math.max(size.x,size.y,size.z,1)*2;
 const group=new Group();group.name='ProductShowroom';
 const paint=new ShadowMaterial({color:'#000000',opacity:.26,depthWrite:false,toneMapped:false});
 const floor=new Mesh(new PlaneGeometry(100,100),paint);floor.name='ProductShadowFloor';
 floor.rotation.x=-Math.PI/2;floor.position.set(center.x,bounds.min.y-.012,center.z);floor.receiveShadow=true;group.add(floor);
 light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=.0025;light.shadow.bias=-.0001;light.shadow.radius=2.5;light.shadow.intensity=.85;
 Object.assign(light.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:.1,far:40});light.shadow.camera.updateProjectionMatrix();
 light.target.position.set(center.x,bounds.min.y+height*.45,center.z);
 return {group,paint,target:light.target,position:(preset:readonly number[],angle:number)=>new Vector3().fromArray(preset).applyAxisAngle(new Vector3(0,1,0),angle*Math.PI/180).add(light.target.position)};
}

export function roomEnvironment(mode:SceneSettings['lighting']){
 const room=new RoomEnvironment(),preset=lightingPresets[mode];
 room.traverse(object=>{
  if(object instanceof PointLight)object.color.set(preset.keyColor);
  if(object instanceof Mesh&&object.material instanceof MeshLambertMaterial)object.material.emissive.copy(new Color(preset.keyColor));
 });
 return room;
}
