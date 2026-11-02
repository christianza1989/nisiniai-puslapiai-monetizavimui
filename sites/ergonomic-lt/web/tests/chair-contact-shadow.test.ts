import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BoxGeometry,MeshBasicMaterial,Color,type WebGLRenderer} from 'three';
import {contactShadow} from '../src/lib/contact-shadow';

function fixture(){
 const scene=new Scene(),object=new Group(),model=new Mesh(new BoxGeometry(1,1,1),new MeshBasicMaterial());object.add(model);scene.add(object);
 const room=new Mesh(new BoxGeometry(4,.01,4),new MeshBasicMaterial({transparent:true})),hidden=new Group();hidden.visible=false;scene.add(room,hidden);
 const observations:boolean[][]=[];
 const renderer={shadowMap:{enabled:true,needsUpdate:false},getRenderTarget:()=>null,getClearColor:(c:Color)=>c.set('#ffffff'),getClearAlpha:()=>1,setClearColor:()=>{},setRenderTarget:()=>{},clear:()=>{},render:(current:Scene)=>{if(current===scene)observations.push([object.visible,room.visible,hidden.visible]);}}as unknown as WebGLRenderer;
 return{scene,object,model,room,hidden,renderer,observations};
}
test('chair shadow projection excludes room receivers and restores their exact visibility',()=>{
 const f=fixture(),material=f.model.material,matrix=f.model.matrix.clone(),dispose=contactShadow(f.renderer,f.scene,f.object,true);
 assert.deepEqual(f.observations,[[true,false,false]]);assert.equal(f.room.visible,true);assert.equal(f.hidden.visible,false);assert.equal(f.model.material,material);assert.deepEqual(f.model.matrix.elements,matrix.elements);dispose();
});
test('existing viewer projection keeps the original default scene scope',()=>{
 const f=fixture(),dispose=contactShadow(f.renderer,f.scene,f.object);assert.deepEqual(f.observations,[[true,true,false]]);dispose();
});
test('failed isolated projection still restores every room visibility flag',()=>{
 const f=fixture();f.renderer.render=()=>{throw Error('simulated render failure');};assert.throws(()=>contactShadow(f.renderer,f.scene,f.object,true),/simulated render failure/);assert.equal(f.room.visible,true);assert.equal(f.hidden.visible,false);
});
