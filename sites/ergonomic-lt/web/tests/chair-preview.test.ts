import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {chairMaterialDocument,type ChairPreview} from '../src/lib/chair-preview';
import {tagChairSurfaces,createChairColorApplication} from '../src/lib/chair-color-materials';
import type {ChairColorPlan} from '../src/lib/chair-color-admission';
const hash='a'.repeat(64),selector='b'.repeat(64),base='c'.repeat(64),next='d'.repeat(64);
const original:ChairColorPlan={status:'original',resetOriginalMaterialsFirst:true,assignments:[],materials:{},fullPalettePass:false};
const plan:ChairColorPlan={...original,status:'observed-state',assignments:[{assetSha256:hash,selectorId:selector,baseMaterialId:base,materialId:next}],materials:{[next]:{}}};
function fixture(){const root=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());root.add(mesh);const data={selectors:{assets:{[hash]:{assetSha256:hash,slots:[{selectorId:selector,sourceNodePath:[4],primitive:2,materialId:base}]}}}} as unknown as ChairPreview;tagChairSurfaces(root,new Map([[mesh,{nodes:4,primitives:2}]]),data,hash);return {root,mesh};}
test('chair selectors use own source associations, rejecting a missing or ambiguous primitive',()=>{
 const {root,mesh}=fixture();assert.throws(()=>tagChairSurfaces(root,new Map([[mesh,{nodes:5,primitives:2}]]),{selectors:{assets:{[hash]:{assetSha256:hash,slots:[]}}}} as unknown as ChairPreview,hash),/Ambiguous/);
});
test('complete observed state clones its material and restores exact original references',async()=>{
 const {root,mesh}=fixture(),baseMaterial=mesh.material,source=new MeshStandardMaterial({color:'red'}),app=createChairColorApplication(root);
 await app.apply(plan,async()=>source);assert.notEqual(mesh.material,source);assert.notEqual(mesh.material,baseMaterial);
 await app.apply(original,async()=>{throw Error('Original must not load materials');});assert.equal(mesh.material,baseMaterial);app.dispose();
});
test('late material load cannot overwrite a later original restoration',async()=>{
 const {root,mesh}=fixture(),baseMaterial=mesh.material,app=createChairColorApplication(root);let resolve!:(m:MeshStandardMaterial)=>void;
 const pending=app.apply(plan,()=>new Promise(r=>{resolve=r;}));await app.apply(original,async()=>new MeshStandardMaterial());resolve(new MeshStandardMaterial());assert.equal(await pending,false);assert.equal(mesh.material,baseMaterial);app.dispose();
});
test('failed texture/material loading leaves original materials, never the previous observed state',async()=>{
 const {root,mesh}=fixture(),baseMaterial=mesh.material,app=createChairColorApplication(root);await app.apply(plan,async()=>new MeshStandardMaterial());await assert.rejects(app.apply(plan,async()=>{throw Error('bad texture SHA');}));assert.equal(mesh.material,baseMaterial);app.dispose();
});
test('normalized PBR conversion preserves transforms and only resolves owned texture identities',()=>{
 const source={pbrMetallicRoughness:{baseColorTexture:{texCoord:1,extensions:{KHR_texture_transform:{offset:[.1,.2],scale:[40,40]}},texture:{image:{sha256:hash,bytes:12},sampler:{wrapS:33071}}}}};
 const textures={[hash]:{asset:'/models/configurator/chairs/KTEST/library/textures/'+hash+'.jpg',sha256:hash,bytes:12}},doc=chairMaterialDocument(source,textures);
 assert.deepEqual(doc.extensionsUsed,['KHR_texture_transform']);assert.deepEqual(doc.samplers,[{wrapS:33071}]);assert.deepEqual((doc.materials[0] as typeof source).pbrMetallicRoughness.baseColorTexture.extensions,source.pbrMetallicRoughness.baseColorTexture.extensions);assert.throws(()=>chairMaterialDocument(source,{}),/Unqualified/);
});
