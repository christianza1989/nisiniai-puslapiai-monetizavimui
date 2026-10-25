import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial,BufferGeometry,Texture} from 'three';
import {isolateFinishMaterials} from '../src/lib/finish-materials';
test('Vienoda pradinė sėdynės ir galvos atramos medžiaga leidžia atskiras vėlesnes spalvas',()=>{
 const map=new Texture(),shared=new MeshStandardMaterial({color:'white',map}),geometry=new BufferGeometry(),head=new Mesh(geometry,shared),seat=new Mesh(geometry,shared),root=new Group();
 head.userData.finishField='CHEADRESTUPHCHCOLOR';seat.userData.finishField='CUPHSEATCOLOR';root.add(head,seat);isolateFinishMaterials(root);
 assert.notEqual(head.material,seat.material);assert.equal(head.material.map,map);assert.equal(seat.material.map,map);
 head.material.color.set('red');assert.equal(seat.material.color.getHexString(),'ffffff');
 head.material.dispose();seat.material.dispose();shared.dispose();geometry.dispose();map.dispose();
});
