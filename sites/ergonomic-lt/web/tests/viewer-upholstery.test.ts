import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,type Object3D} from 'three';
import {tagViewerUpholstery,isViewerUpholstery} from '../src/lib/viewer-upholstery';
const sha='a'.repeat(64);
test('own original single primitive roles qualify upholstery without changing materials or geometry',()=>{
 const root=new Group(),cloth=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),plastic=new Mesh(new BoxGeometry(),new MeshStandardMaterial());
 cloth.name=plastic.name='same name';root.add(cloth,plastic);root.updateMatrixWorld(true);
 const material=cloth.material,geometry=cloth.geometry,matrix=cloth.matrixWorld.clone();
 const document={nodes:[{mesh:0,extras:{finishField:'CUPHSEATCOLOR'}},{mesh:1,extras:{finishField:'CBASECOLOR'}}],meshes:[{primitives:[{material:0}]},{primitives:[{material:1}]}]};
 tagViewerUpholstery(root,new Map([[cloth,{nodes:0,primitives:0}],[plastic,{nodes:1,primitives:0}]]),document,sha);
 assert(isViewerUpholstery(cloth));assert(!isViewerUpholstery(plastic));
 assert.equal(cloth.material,material);assert.equal(cloth.geometry,geometry);assert(cloth.matrixWorld.equals(matrix));
});
test('mixed primitives, mesh, unknown and similar-looking materials never invent an upholstery role',()=>{
 for(const field of ['CMESHCOLOR','CBASECOLOR','unknown','CUPHSEATCOLOR']){
  const mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());
  const primitives=field==='CUPHSEATCOLOR'?[{material:0},{material:1}]:[{material:0}];
  tagViewerUpholstery(mesh,new Map([[mesh,{nodes:0,primitives:0}]]),{nodes:[{mesh:0,extras:{finishField:field}}],meshes:[{primitives}]},sha);
  assert(!isViewerUpholstery(mesh));
 }
});
test('primitive children inherit only their own addressed original parent node',()=>{
 const root=new Group(),parent=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());root.add(parent);parent.add(mesh);
 tagViewerUpholstery(root,new Map<Object3D,{nodes?:number;primitives?:number}>([[parent,{nodes:0}],[mesh,{primitives:0}]]),{nodes:[{mesh:0,extras:{finishField:'CUPHBACKRESTCOLOR'}}],meshes:[{primitives:[{material:0}]}]},sha);
 assert(isViewerUpholstery(mesh));
});
