import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,DirectionalLight,Group,Mesh,MeshStandardMaterial,ShadowMaterial,Vector3} from 'three';
import {showroom,productShowroom} from '../src/lib/showroom';

test('room floor and shadow camera follow visible assembled geometry, excluding removed components',()=>{
 const chair=new Group(),seat=new Mesh(new BoxGeometry(.6,1,.6),new MeshStandardMaterial());seat.position.y=.5;chair.add(seat);
 const removed=seat.clone();removed.position.set(100,-20,0);removed.visible=false;chair.add(removed);
 const light=new DirectionalLight(),room=showroom(chair,light),floor=room.group.children[0] as Mesh;
 assert.equal(floor.position.y,-.012);assert.equal(floor.position.x,0);assert.equal(floor.receiveShadow,true);
 assert.equal(light.castShadow,true);assert.equal(light.shadow.mapSize.x,2048);
 assert.equal(light.shadow.camera.right,2);assert.equal(light.target.position.y,.45);
 const from=room.position([3,5,4],0).sub(light.target.position),to=room.position([3,5,4],90).sub(light.target.position);
 assert.ok(from.distanceTo(new Vector3(3,5,4))<1e-8);assert.ok(to.distanceTo(new Vector3(4,5,-3))<1e-8);
 assert.equal(room.group.children.length,2);
 room.group.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});room.paint.dispose();room.wallPaint.dispose();seat.geometry.dispose();(seat.material as MeshStandardMaterial).dispose();
});

test('white product stage has only a transparent shadow floor, never an opaque room horizon',()=>{
 const root=new Group(),material=new MeshStandardMaterial(),geometry=new BoxGeometry(.6,1,.6),mesh=new Mesh(geometry,material);mesh.position.y=.5;root.add(mesh);
 const hidden=mesh.clone();hidden.position.set(100,-20,0);hidden.visible=false;root.add(hidden);
 const light=new DirectionalLight(),room=productShowroom(root,light),floor=room.group.children[0] as Mesh;
 assert.equal(room.group.children.length,1);assert(floor.material instanceof ShadowMaterial);assert(floor.material.transparent);assert.equal(floor.material.opacity,.26);assert.equal(floor.material.toneMapped,false);
 assert.equal(floor.material.color.getHex(),0x000000);assert.equal(floor.receiveShadow,true);assert.equal(floor.position.y,-.012);assert.equal(light.shadow.camera.right,2);
 const positioned=room.position([-4,3,2],45).sub(light.target.position);assert.ok(positioned.distanceTo(new Vector3(-Math.SQRT2,3,3*Math.SQRT2))<1e-8);
 floor.geometry.dispose();room.paint.dispose();geometry.dispose();material.dispose();light.shadow.dispose();
});
