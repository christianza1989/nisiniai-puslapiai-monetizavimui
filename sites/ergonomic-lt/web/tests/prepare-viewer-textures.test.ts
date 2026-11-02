import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,BoxGeometry,MeshStandardMaterial,Texture,DataTexture,WebGLRenderTarget,type WebGLRenderer} from 'three';
import {prepareViewerTextures,viewerTextures} from '../src/lib/prepare-viewer-textures';

test('only active original material textures and the environment are uploaded; no render target is reallocated',async()=>{
 const scene=new Scene(),map=new Texture(),normal=new Texture(),environment=new DataTexture(new Uint8Array(4),1,1),hiddenMap=new Texture(),target=new WebGLRenderTarget(512,512);
 const material=new MeshStandardMaterial({map,normalMap:normal}),mesh=new Mesh(new BoxGeometry(),material),other=new Mesh(new BoxGeometry(),material),hidden=new Mesh(new BoxGeometry(),new MeshStandardMaterial({map:hiddenMap}));hidden.visible=false;
 scene.add(mesh,other,hidden,new Mesh(new BoxGeometry(),new MeshStandardMaterial({map:target.texture})));scene.environment=environment;
 const originals={material,source:map.source,normalSource:normal.source,geometry:mesh.geometry,matrix:mesh.matrix.clone()},uploaded:Texture[]=[];
 await prepareViewerTextures({initTexture:(texture:Texture)=>{uploaded.push(texture);}},scene,new AbortController().signal);
 assert.deepEqual(uploaded,[environment,map,normal]);assert.deepEqual(viewerTextures(scene),uploaded);
 assert.equal(mesh.material,originals.material);assert.equal(mesh.geometry,originals.geometry);assert.deepEqual(mesh.matrix,originals.matrix);assert.equal(map.source,originals.source);assert.equal(normal.source,originals.normalSource);
 target.dispose();
});
test('an aborted assembly never uploads textures into a disposed view',async()=>{
 const scene=new Scene();scene.environment=new Texture();const abort=new AbortController();abort.abort();
 await assert.rejects(()=>prepareViewerTextures({initTexture:()=>{throw Error('must not upload');}},scene,abort.signal),/abort/i);
});
