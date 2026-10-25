import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,PerspectiveCamera} from 'three';
import {cameraFrame,cameraNear} from '../src/lib/viewer-camera';

test('Thin adjacent source surfaces remain distinct at product viewing distances on desktop and phone',()=>{
 const bounds=new Box3(new Vector3(-.35,0,-.35),new Vector3(.35,1.2,.35));
 for(const aspect of [1.6,1,.65]){
  const frame=cameraFrame(bounds,aspect,35),camera=new PerspectiveCamera(35,aspect,cameraNear(frame.distance),50);
  const depth=(distance:number)=>Math.round((new Vector3(0,0,-distance).project(camera).z*.5+.5)*(2**24-1));
  assert(Math.abs(depth(frame.distance)-depth(frame.distance+.0001))>=8,'0.1 mm layers must occupy distinct depth samples');
 }
});

test('Depth precision follows zoom while retaining close surface inspection',()=>{
 for(const distance of [.035,.18,1,3,12]){
  const near=cameraNear(distance);assert(Number.isFinite(near)&&near>0&&near<distance*.1);
  const camera=new PerspectiveCamera(35,1,near,50),point=new Vector3(0,0,-distance).project(camera);
  assert(point.z>-1&&point.z<1,'target surface remains in the camera range');
 }
 assert(cameraNear(.035)<.001,'35 mm surface inspection keeps sub-millimetre near clipping');
});
