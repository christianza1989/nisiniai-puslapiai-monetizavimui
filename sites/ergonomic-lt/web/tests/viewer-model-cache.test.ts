import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,Texture} from 'three';
import {ViewerModelCache,disposeViewerModel} from '../src/lib/viewer-model-cache';
function model(){const root=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial({color:'#123456',map:new Texture()}));mesh.name='source-node';mesh.position.set(1,2,3);mesh.userData.proof={sha:'exact-source',node:4,primitive:0};root.add(mesh);return root;}
test('cached parse preserves source address/world transform and isolates finish, geometry and disposal',()=>{
 const original=model(),cache=new ViewerModelCache();assert(cache.put('sha:bytes:mode',original));const a=cache.get('sha:bytes:mode')!,b=cache.get('sha:bytes:mode')!,ma=a.children[0] as Mesh,mb=b.children[0] as Mesh;
 assert.deepEqual(ma.position.toArray(),[1,2,3]);assert.deepEqual(ma.userData.proof,{sha:'exact-source',node:4,primitive:0});assert.notEqual(ma.geometry,mb.geometry);assert.notEqual(ma.material,mb.material);
 const material=ma.material as MeshStandardMaterial;material.color.set('#ffffff');assert.equal((mb.material as MeshStandardMaterial).color.getHexString(),'123456');assert.notEqual(material.map,(mb.material as MeshStandardMaterial).map);
 ma.geometry.getAttribute('position').setX(0,99);assert.notEqual(mb.geometry.getAttribute('position').getX(0),99);disposeViewerModel(a);assert(cache.get('sha:bytes:mode'));assert.equal(cache.get('different-sha:bytes:mode'),undefined);cache.clear();assert.equal(cache.size,0);
});
test('decoded-memory budget evicts only templates, retaining independent active scenes',()=>{
 const cache=new ViewerModelCache(1200);assert(cache.put('one',model()));const active=cache.get('one')!;assert(cache.put('two',model()));assert.equal(cache.get('one'),undefined);assert.equal(active.children[0].name,'source-node');cache.clear();disposeViewerModel(active);
});
