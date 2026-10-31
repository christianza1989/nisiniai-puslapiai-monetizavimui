import {Box3,PerspectiveCamera,Raycaster,Vector3,type Mesh} from 'three';
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {cameraFrame} from './viewer-camera';

export type ProductViewAction='left'|'right'|'up'|'down'|'in'|'out';
const initialDirection=new Vector3(2.6,1.25,3.7).normalize();

/** The caller supplies ONLY meshes with proved upholstery roles. Ray hits,
 * rather than a bounding-box center, avoid empty gaps in split backrests.
 * No mesh names, color similarity or material hashes infer upholstery here. */
export function upholsteryInspectionTarget(surfaces:readonly Mesh[]){
 const direction=new Vector3(.18,.12,1).normalize(),ray=new Raycaster();
 const candidates=surfaces.filter(mesh=>mesh.visible).map(mesh=>({mesh,box:new Box3().setFromObject(mesh,true)}))
  .filter(({box})=>!box.isEmpty()).sort((a,b)=>b.box.getSize(new Vector3()).lengthSq()-a.box.getSize(new Vector3()).lengthSq());
 for(const {mesh,box}of candidates){
  const size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  for(const fraction of [.5,.25,.75]){
   const aim=center.clone();aim.x=box.min.x+size.x*fraction;
   ray.set(aim.clone().addScaledVector(direction,Math.max(1,size.length()*2)),direction.clone().negate());
   const hit=ray.intersectObject(mesh,false)[0];
   if(hit)return {point:hit.point,direction};
  }
 }
 return undefined;
}

/** Product inspection never owns the page's wheel or vertical touch scroll.
 * Install after OrbitControls, in capture phase; do not prevent the browser's
 * default scroll. Explicit zoom buttons and pinch remain available. */
export function bindProductPageScroll(canvas:HTMLElement){
 const previous=canvas.style.touchAction;
 const wheel=(event:WheelEvent)=>event.stopImmediatePropagation();
 canvas.style.touchAction='pan-y';
 canvas.addEventListener('wheel',wheel,{capture:true,passive:true});
 return ()=>{canvas.removeEventListener('wheel',wheel,{capture:true});canvas.style.touchAction=previous;};
}

/** Camera-only state. No material, source identity or part selection changes.
 * The caller supplies bounds after an admitted geometry change and a proven
 * surface point for close inspection. Unknown material roles stay unknown. */
export function createProductViewControls(camera:PerspectiveCamera,controls:OrbitControls){
 let bounds=new Box3(),aspect=1,fittedDistance=1,inspection:Vector3|undefined;
 const center=new Vector3();
 controls.enablePan=false;controls.zoomToCursor=false;controls.enableDamping=false;
 controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI-.15;
 controls.maxTargetRadius=0;
 function anchor(point:Vector3){controls.target.copy(point);controls.cursor.copy(point);}
 function limits(){controls.minDistance=fittedDistance*.45;controls.maxDistance=fittedDistance*3;}
 function reset(){
  if(bounds.isEmpty())return;
  const frame=cameraFrame(bounds,aspect,camera.fov);
  center.copy(frame.center);fittedDistance=frame.distance;inspection=undefined;
  anchor(center);limits();controls.enableRotate=true;
  camera.position.copy(center).addScaledVector(initialDirection,fittedDistance);
  camera.far=Math.max(50,fittedDistance*10);camera.updateProjectionMatrix();controls.update();controls.saveState();
 }
 function frame(next:Box3,nextAspect:number){
  bounds.copy(next);aspect=nextAspect;reset();
 }
 function resize(nextAspect:number){
  if(bounds.isEmpty())return;
  const previousAspect=aspect;aspect=nextAspect;
  if(inspection)return;
  const offset=camera.position.clone().sub(controls.target);
  const previous=cameraFrame(bounds,previousAspect,camera.fov,offset).distance;
  const next=cameraFrame(bounds,aspect,camera.fov,offset).distance;
  if(previous>0)offset.multiplyScalar(next/previous);
  fittedDistance=cameraFrame(bounds,aspect,camera.fov).distance;limits();
  anchor(center);camera.position.copy(center).add(offset);controls.update();
 }
 function geometry(next:Box3){
  // A removed/replaced part must never leave the camera targeting its old
  // surface. Reframe the actual visible assembly, including its new center.
  bounds.copy(next);reset();
 }
 function inspect(point:Vector3,direction?:Vector3){
  if(bounds.isEmpty())return;
  const offset=direction?.clone()||camera.position.clone().sub(point);
  if(offset.lengthSq()===0)offset.copy(initialDirection);
  inspection=point.clone();anchor(inspection);controls.enableRotate=false;
  controls.minDistance=.035;controls.maxDistance=Math.max(.5,fittedDistance*.6);
  camera.position.copy(point).addScaledVector(offset.normalize(),.18);controls.update();
 }
 function move(action:ProductViewAction){
  if(bounds.isEmpty())return;
  if(inspection&&['left','right','up','down'].includes(action))return;
  const target=inspection||center,offset=camera.position.clone().sub(target);
  if(action==='left'||action==='right')offset.applyAxisAngle(new Vector3(0,1,0),action==='left'?Math.PI/8:-Math.PI/8);
  else if(action==='up'||action==='down'){
   const radius=offset.length(),theta=Math.atan2(offset.x,offset.z);
   const polar=Math.max(controls.minPolarAngle,Math.min(controls.maxPolarAngle,Math.acos(Math.max(-1,Math.min(1,offset.y/radius)))+(action==='down'?.2:-.2)));
   offset.set(Math.sin(polar)*Math.sin(theta),Math.cos(polar),Math.sin(polar)*Math.cos(theta)).multiplyScalar(radius);
  }else offset.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length()*(action==='in'?.82:1.22))));
  anchor(target);camera.position.copy(target).add(offset);controls.update();
 }
 return {frame,resize,geometry,inspect,reset,move,
  toggleInspection(find:()=>{point:Vector3;direction?:Vector3}|undefined){
   if(inspection){reset();return;}
   const surface=find();if(surface)inspect(surface.point,surface.direction);
  },
  get inspecting(){return !!inspection;},
  get center(){return center.clone();},
  get focus(){return (inspection||center).clone();},
  get below(){return camera.position.y<controls.target.y;},
 };
}
