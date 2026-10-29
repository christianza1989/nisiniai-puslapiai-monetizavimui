import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import type {ChairPreview} from '../src/lib/chair-preview';
import {qualifiedChairPlan,type QualifiedWitness,type QualifiedPatch} from '../src/lib/chair-qualified-colors';
import {createChairColorApplication,tagChairSurfaces} from '../src/lib/chair-color-materials';
const h=(c:string)=>c.repeat(64),empty=():QualifiedPatch=>({bindings:[],remove:[],assets:[]});
function fixture(){
 const w:QualifiedWitness={id:'w',label:'Witness',context:0,construction:{DHEIGHT:'_1'},variants:[],requiredAssets:[h('a')],groups:[],singles:[],branches:[]};
 const d={
  schema:'pc2-chair-review-111-v1',code:'KTEST001WW001',runtimeSha256:h('1'),
  runtime:{contexts:[{dimensions:{DHEIGHT:'_1'},groups:[]}]},
  assets:{[h('a')]:{asset:'/base.glb',assetSha256:h('a'),bytes:100}},
  selectors:{assets:{[h('a')]:{assetSha256:h('a'),slots:[{selectorId:h('b'),materialId:h('c'),sourceNodePath:[0],primitive:0,transformChain:[]}],materials:{}}}},
  qualified:{schema:'chair-qualified-review-v1',code:'KTEST001WW001',runtimeSha256:h('1'),version:'test',witnesses:[w],legacyScopes:[],materials:{[h('d')]:{pbrMetallicRoughness:{baseColorFactor:[1,0,0,1]}}},extraAssets:{},opaqueAssets:[]}
 } as unknown as ChairPreview;
 return {d,w};
}
const binding={assetSha256:h('a'),selectorId:h('b'),baseMaterialId:h('c'),materialId:h('d')};
test('group choices cannot escape their actual construction or OWN asset set',()=>{
 const {d,w}=fixture();w.groups=[{id:'g',label:'G',base:'red',options:[{id:'red',label:'Red',values:{CUPHCOLOR:'RED'},patch:{...empty(),bindings:[binding]}}]}];
 const s={witness:'w',kind:'groups' as const,groups:{g:'red'}};
 assert.equal(qualifiedChairPlan(d,0,[],[h('a')],s).status,'observed-state');
 assert.equal(qualifiedChairPlan(d,0,[],[h('e')],s).status,'unavailable');
 d.runtime.contexts[0].dimensions.DHEIGHT='_2';assert.equal(qualifiedChairPlan(d,0,[],[h('a')],s).status,'unavailable');
});
test('two groups cannot write or remove the same primitive',()=>{
 const {d,w}=fixture();w.groups=['one','two'].map(id=>({id,label:id,base:'v',options:[{id:'v',label:'V',values:{CUPHCOLOR:'RED'},patch:{...empty(),bindings:[binding]}}]}));
 assert.equal(qualifiedChairPlan(d,0,[],[h('a')],{witness:'w',kind:'groups',groups:{}}).status,'unavailable');
});
test('a prefix part and its own leaf bindings compose only while that part is present',()=>{
 const {d,w}=fixture(),extra={asset:'/part.glb',assetSha256:h('e'),bytes:100};d.qualified!.extraAssets[h('e')]=extra;d.selectors.assets[h('e')]={assetSha256:h('e'),slots:[{selectorId:h('f'),materialId:h('c'),sourceNodePath:[0],primitive:0,transformChain:[]}],materials:{}};
 w.branches=[{id:'p',label:'Prefix',values:{CPRICEGROUP:'_4'},patch:{bindings:[],remove:[{assetSha256:h('a'),selectorId:h('b')}],assets:[extra]},groups:[{id:'seat',label:'Seat',base:'r',options:[{id:'r',label:'R',values:{CUPHSEATCOLOR:'RED'},patch:{...empty(),bindings:[{...binding,assetSha256:h('e'),selectorId:h('f')}]}}]}]}];
 const s={witness:'w',kind:'groups' as const,branch:'p',groups:{}};
 const p=qualifiedChairPlan(d,0,[],[h('a')],s);assert.equal(p.status,'observed-state');assert.equal(p.assets?.length,1);assert.equal(p.hidden?.length,1);
 w.branches[0].patch.assets=[];assert.equal(qualifiedChairPlan(d,0,[],[h('a')],s).status,'unavailable');
});
test('whole-state choices do not merge a group selection and reject unadmitted or oversized parts',()=>{
 const {d,w}=fixture();w.singles=[{id:'s',label:'S',values:{CUPHCOLOR:'RED'},patch:{...empty(),bindings:[binding]}}];
 const s={witness:'w',kind:'single' as const,single:'s',groups:{unknown:'injected'}};
 assert.deepEqual(qualifiedChairPlan(d,0,[],[h('a')],s).assignments,[binding]);
 const extra={asset:'/part.glb',assetSha256:h('e'),bytes:25*1024*1024+1};d.qualified!.extraAssets[h('e')]=extra;w.singles[0].patch.assets=[extra];assert.equal(qualifiedChairPlan(d,0,[],[h('a')],s).status,'unavailable');
});
test('additional part tagging leaves unaddressed primitives original and restores exact material and visibility references',async()=>{
 const {d}=fixture(),root=new Group(),base=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),extra=new Group(),part=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),untouched=new Mesh(new BoxGeometry(),new MeshStandardMaterial());root.add(base);extra.add(part,untouched);
 d.qualified!.extraAssets[h('e')]={asset:'/part.glb',assetSha256:h('e'),bytes:100};d.selectors.assets[h('e')]={assetSha256:h('e'),slots:[{selectorId:h('f'),materialId:h('c'),sourceNodePath:[0],primitive:0,transformChain:[]}],materials:{}};
 tagChairSurfaces(root,new Map([[base,{nodes:0,primitives:0}]]),d,h('a'));tagChairSurfaces(extra,new Map([[part,{nodes:0,primitives:0}],[untouched,{nodes:1,primitives:0}]]),d,h('e'));
 const app=createChairColorApplication(root),original=base.material,partOriginal=part.material;root.add(extra);app.register(extra);
 await app.apply({status:'observed-state',resetOriginalMaterialsFirst:true,assignments:[{...binding,assetSha256:h('e'),selectorId:h('f')}],materials:{[h('d')]:{}},hidden:[{assetSha256:h('a'),selectorId:h('b')}],fullPalettePass:false},async()=>new MeshStandardMaterial({color:'red'}));
 assert.equal(base.visible,false);assert.notEqual(part.material,partOriginal);assert.equal(untouched.userData.ergonomicChairSelector,undefined);
 extra.removeFromParent();await app.apply({status:'original',resetOriginalMaterialsFirst:true,assignments:[],materials:{},fullPalettePass:false},async()=>{throw Error('No colour fetch on restore');});assert.equal(base.material,original);assert.equal(base.visible,true);assert.equal(part.material,partOriginal);assert.deepEqual(root.children,[base]);app.dispose();
});
test('a failed additional-part material restores the original mesh visibility and references',async()=>{
 const {d}=fixture(),root=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());root.add(mesh);tagChairSurfaces(root,new Map([[mesh,{nodes:0,primitives:0}]]),d,h('a'));const original=mesh.material,app=createChairColorApplication(root);
 await assert.rejects(app.apply({status:'observed-state',resetOriginalMaterialsFirst:true,assignments:[binding],materials:{[h('d')]:{}},hidden:[{assetSha256:h('a'),selectorId:h('b')}],fullPalettePass:false},async()=>{throw Error('Texture SHA mismatch');}),/Texture SHA/);
 assert.equal(mesh.visible,true);assert.equal(mesh.material,original);app.dispose();
});
