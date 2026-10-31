import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,PerspectiveCamera,Vector3,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {bindProductPageScroll,createProductViewControls,upholsteryInspectionTarget} from '../src/lib/viewer-controls';

const chair=new Box3(new Vector3(-.35,0,-.35),new Vector3(.35,1.3,.35));
const desk=new Box3(new Vector3(-1.2,0,-.5),new Vector3(1.2,1.2,.5));
class TestCanvas extends EventTarget{
 style={touchAction:'none',cursor:'auto'};
 ownerDocument=new EventTarget();
 getRootNode(){return this.ownerDocument;}
}
function setup(bounds=chair,aspect=1.6){
 const camera=new PerspectiveCamera(35,aspect,.001,50),orbit=new OrbitControls(camera,new TestCanvas() as unknown as HTMLElement);
 const view=createProductViewControls(camera,orbit);view.frame(bounds,aspect);
 return {camera,orbit,view};
}
function completeInFrame(camera:PerspectiveCamera,bounds:Box3){
 camera.updateMatrixWorld(true);
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const point=new Vector3(x,y,z).project(camera);
  assert(Math.abs(point.x)<1&&Math.abs(point.y)<1,'all source bounds stay visible');
 }
}

test('chair and wide desk stay centered and fully framed on desktop and phone',()=>{
 for(const box of [chair,desk])for(const aspect of [1.6,.65]){
  const {camera,orbit,view}=setup(box,aspect);
  completeInFrame(camera,box);assert.equal(orbit.enablePan,false);assert.equal(orbit.zoomToCursor,false);
  orbit.target.add(new Vector3(100,-70,20));orbit.update();
  assert(orbit.target.distanceTo(view.center)<1e-8,'OrbitControls cannot pan outside the product anchor');
  for(const action of ['left','right','down','up'] as const)view.move(action);
  assert(orbit.target.distanceTo(view.center)<1e-8);orbit.dispose();
 }
});

test('second upholstery action restores the whole chair and rotation, including after close zoom',()=>{
 const {camera,orbit,view}=setup(),initial=camera.position.clone(),point=new Vector3(-.16,.9,.15);
 let lookups=0;const surface=()=>{lookups++;return {point,direction:new Vector3(0,0,1)};};
 view.toggleInspection(surface);assert(view.inspecting);assert.equal(orbit.enableRotate,false);
 assert(Math.abs(camera.position.distanceTo(point)-.18)<1e-8);assert(orbit.target.distanceTo(point)<1e-8);
 for(let n=0;n<30;n++)view.move('in');assert(Math.abs(camera.position.distanceTo(point)-.035)<1e-8);
 view.toggleInspection(surface);assert.equal(lookups,1,'toggle off does not need to find the old surface');
 assert.equal(view.inspecting,false);assert.equal(orbit.enableRotate,true);
 assert(camera.position.distanceTo(initial)<1e-8);assert(orbit.target.distanceTo(view.center)<1e-8);
 completeInFrame(camera,chair);orbit.dispose();
});

test('missing proof of an upholstered surface leaves the whole-product view unchanged',()=>{
 const {camera,orbit,view}=setup(desk),initial=camera.position.clone();
 view.toggleInspection(()=>undefined);
 assert.equal(view.inspecting,false);assert(camera.position.equals(initial));orbit.dispose();
});

test('underside is reachable without panning, and the camera never crosses either pole',()=>{
 const {camera,orbit,view}=setup(desk);
 for(let n=0;n<30;n++)view.move('down');
 assert(view.below);assert(orbit.getPolarAngle()>Math.PI/2);assert(orbit.getPolarAngle()<Math.PI);
 assert(camera.position.y<view.center.y);assert(orbit.target.distanceTo(view.center)<1e-8);
 for(let n=0;n<30;n++)view.move('up');assert(!view.below);assert(orbit.getPolarAngle()>0);orbit.dispose();
});

test('phone resize preserves a close surface, then toggle off fits the whole product to the new shape',()=>{
 const {camera,orbit,view}=setup(),point=new Vector3(-.16,.9,.15);
 view.inspect(point,new Vector3(0,0,1));const initial=camera.position.clone();
 camera.aspect=.65;camera.updateProjectionMatrix();view.resize(.65);
 assert(camera.position.equals(initial));assert(orbit.target.distanceTo(point)<1e-8);
 view.toggleInspection(()=>undefined);completeInFrame(camera,chair);orbit.dispose();
});

test('replacing geometry after inspection anchors the actual new assembly, not the removed chair surface',()=>{
 const {camera,orbit,view}=setup();view.inspect(new Vector3(-.16,.9,.15));
 const moved=desk.clone().translate(new Vector3(3,0,2));view.geometry(moved);
 assert.equal(view.inspecting,false);assert(orbit.target.distanceTo(moved.getCenter(new Vector3()))<1e-8);
 assert(orbit.cursor.distanceTo(orbit.target)<1e-8);completeInFrame(camera,moved);orbit.dispose();
});

test('page wheel stays uncancelled and vertical touch scrolling is restored on cleanup',()=>{
 const canvas=new EventTarget() as EventTarget&{style:{touchAction:string}};canvas.style={touchAction:'none'};
 const cleanup=bindProductPageScroll(canvas as unknown as HTMLElement);
 let consumed=0;const zoom=(e:Event)=>{consumed++;e.preventDefault();};canvas.addEventListener('wheel',zoom);
 const wheel=new Event('wheel',{cancelable:true});canvas.dispatchEvent(wheel);
 assert.equal(consumed,0);assert.equal(wheel.defaultPrevented,false);assert.equal(canvas.style.touchAction,'pan-y');
 cleanup();assert.equal(canvas.style.touchAction,'none');canvas.dispatchEvent(new Event('wheel'));
 assert.equal(consumed,1,'cleanup removes the capture listener');
});

test('upholstery focus hits an actual supplied pad, skips hidden parts and never substitutes a box center',()=>{
 const geometry=new BoxGeometry(.18,.4,.06),material=new MeshBasicMaterial();
 const left=new Mesh(geometry,material),right=new Mesh(geometry,material);
 left.position.set(-.16,.9,.1);right.position.set(.16,.9,.1);
 left.updateMatrixWorld(true);right.updateMatrixWorld(true);
 const target=upholsteryInspectionTarget([left,right]);assert(target);
 assert(Math.abs(target.point.x)>.05,'split-back center gap is never the inspection target');
 left.visible=false;right.visible=false;assert.equal(upholsteryInspectionTarget([left,right]),undefined);
 assert.equal(upholsteryInspectionTarget([]),undefined,'unknown upholstery has no invented target');
 geometry.dispose();material.dispose();
});
