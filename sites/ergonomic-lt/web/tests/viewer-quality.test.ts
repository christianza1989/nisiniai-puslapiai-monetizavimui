import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,MeshPhysicalMaterial,Texture,RepeatWrapping,MirroredRepeatWrapping,Vector2,Vector3,Box3,PerspectiveCamera} from 'three';
import {visibleBounds,cameraFrame,unobstructedCameraViewport} from '../src/lib/viewer-camera';
import {physicalUpholstery,setFabricSheen,copyTexturePlacement} from '../src/lib/viewer-materials';
import {isolateFinishMaterials} from '../src/lib/finish-materials';

test('Removed assembly parts do not distort camera framing; surface inspection can reach 35 mm',()=>{
 const root=new Group(),chair=new Mesh(new BoxGeometry(.7,1.2,.7)),removed=new Mesh(new BoxGeometry(50,50,50));
 root.add(chair,removed);removed.visible=false;const bounds=visibleBounds(root);
 assert(Math.abs(bounds.max.y-.6)<1e-6);const frame=cameraFrame(bounds,1,35);
 assert(frame.minimum<.04);assert(frame.near<.003);assert(frame.distance>1);
});
test('Oblique perspective fits all chair corners on desktop, phone and fullscreen without cropping front feet',()=>{
 const boxes=[new Box3(new Vector3(-.28,0,-.3),new Vector3(.28,.82,.3)),new Box3(new Vector3(-.4,0,-.4),new Vector3(.4,1.32,.4))];
 for(const box of boxes)for(const aspect of [1.6,1,.65,2.2])for(const direction of [new Vector3(2.6,1.25,3.7),new Vector3(-3,1,2),new Vector3(3,.25,-3)]){
  const frame=cameraFrame(box,aspect,35,direction),camera=new PerspectiveCamera(35,aspect,frame.near,50);
  camera.position.copy(frame.center).add(direction.clone().normalize().multiplyScalar(frame.distance));camera.lookAt(frame.center);camera.updateMatrixWorld(true);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const point=new Vector3(x,y,z).project(camera);assert(Math.abs(point.x)<=1/1.18+1e-7);assert(Math.abs(point.y)<=1/1.18+1e-7);assert(point.z<1);
  }
 }
});
test('wide desks fit beside the floating toolbar on phone and desktop',()=>{
 const box=new Box3(new Vector3(0,0,0),new Vector3(2,.75,1.0078443)),direction=new Vector3(2.6,1.25,3.7);
 for(const [width,height,inset]of [[295,374,64],[713,414,64],[360,600,64]]){
  const viewport=unobstructedCameraViewport(width,height,inset),frame=cameraFrame(box,viewport.aspect,35),camera=new PerspectiveCamera(35,width/height,frame.near,50);
  camera.setViewOffset(width,height,viewport.offsetX,0,width,height);camera.position.copy(frame.center).add(direction.clone().normalize().multiplyScalar(frame.distance));camera.lookAt(frame.center);camera.updateMatrixWorld(true);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=new Vector3(x,y,z).project(camera);
   assert(p.x>=-1&&p.x<=1-2*inset/width,'the complete desk stays left of the controls');assert(Math.abs(p.y)<=1);
  }
 }
 assert.deepEqual(unobstructedCameraViewport(713,414,0),{aspect:713/414,offsetX:0,inset:0},'chair framing is unchanged');
});

test('Physical upholstery preserves the source glTF material and independent hardware',()=>{
 const root=new Group(),texture=new Texture(),source=new MeshStandardMaterial({map:texture,color:'#8e7a65',roughness:.83,metalness:0});
 const cloth=new Mesh(new BoxGeometry(),source),hardware=new Mesh(new BoxGeometry(),source);cloth.userData.finishField='CUPHCOLOR';root.add(cloth,hardware);
 isolateFinishMaterials(root);physicalUpholstery(root);const material=cloth.material as MeshPhysicalMaterial;
 assert(material instanceof MeshPhysicalMaterial);assert.equal(material.map,texture);assert.equal(material.roughness,.83);assert.equal(material.color.getHex(),source.color.getHex());assert.equal(hardware.material,source);
 setFabricSheen(material,'CSE');assert(material.sheen>0);setFabricSheen(material,'VL');assert.equal(material.sheen,0);setFabricSheen(material,'LE');assert.equal(material.sheen,0);
});
test('Finish changes preserve UV scale, offset, rotation, coordinate channel and wrapping',()=>{
 const source=new Texture(),target=new Texture();source.repeat.set(7,11);source.offset.set(.2,.4);source.center=new Vector2(.3,.1);source.rotation=.6;source.channel=1;source.wrapS=RepeatWrapping;source.wrapT=MirroredRepeatWrapping;source.updateMatrix();
 copyTexturePlacement(target,source);assert.deepEqual(target.repeat,source.repeat);assert.deepEqual(target.offset,source.offset);assert.deepEqual(target.center,source.center);assert.equal(target.channel,1);assert.equal(target.rotation,.6);assert.equal(target.wrapT,MirroredRepeatWrapping);assert.deepEqual(target.matrix,source.matrix);
});
