import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,Texture} from 'three';
import {legacyChairMaterialControls,qualifiedChairMaterialControls,type LegacyChairRoleProof} from '../src/lib/chair-material-groups';
import {tagLegacyChairRoles,visibleLegacyChairRoles,createLegacyChairMaterialApplication} from '../src/lib/chair-surface-roles';
import {createExpandedEngine,families,type ExpandedState} from '../src/lib/expanded-configurator';
import type {QualifiedWitness,QualifiedSelection,QualifiedGroup} from '../src/lib/chair-qualified-colors';
const engine=createExpandedEngine();
function originalRoles(family:string){
 const f=families.find(f=>f.id===family)!,state=engine.initialState(f),a=engine.anchorFor(state)!,assets=engine.assembledAssets(state);
 const refs=[...(assets.base?[assets.base]:[]),...assets.patches.flatMap(p=>p.geometry?[p.geometry]:[])];
 // Runtime grouping needs the loader's own SHA-bound associations. This
 // fixture uses the original anchor role table for finite-engine regression.
 const proof:LegacyChairRoleProof={assets:refs,surfaces:Object.entries(a.roles||{}).map(([partId,field],node)=>({assetSha256:refs[0].assetSha256,node,primitive:0,material:node,field,partId}))};
 const controls=(s=state,p=proof)=>legacyChairMaterialControls({state:s,proof:p,assets:refs,choices:engine.stateChoices,change:engine.changeField,
  values:engine.stateValues});
 return {state,proof,controls};
}
test('4ME keeps its mesh and upholstery distinct without changing plastic or metal',()=>{
 const {state,controls}=originalRoles('4me'),c=controls();assert.equal(c.length,2);
 const upholstery=c.find(c=>c.label==='Gobelenas')!,mesh=c.find(c=>c.id.endsWith('mesh'))!;
 assert.equal(upholstery.label,'Gobelenas');assert.equal(mesh.label,'Tinklelis');assert.ok(upholstery.options.length>10);assert.equal(mesh.options.length,2);
 for(const o of upholstery.options){assert.equal(o.state.values.CMESHCOLOR,state.values.CMESHCOLOR);assert.equal(o.state.values.CPLASTICCOLORVERSION,state.values.CPLASTICCOLORVERSION);assert.equal(o.state.values.CBASE,state.values.CBASE);}
});
test('Xilium applies one actual code to seat, both back cushions, side profiles and headrest',()=>{
 const {controls}=originalRoles('xilium'),c=controls();assert.equal(c.length,1);assert.equal(c[0].fields.length,5);assert.ok(c[0].options.length>10);
 for(const o of c[0].options)for(const f of c[0].fields)assert.equal(o.state.values[f],o.code);
 assert.equal(c[0].value,'','preserve the original two-tone state until the visitor chooses a uniform color');
});
test('Xilium price-group changes keep the mirrored seat collection in the same fabric control and export',()=>{
 const {state,controls}=originalRoles('xilium'),next=engine.changeField(state,'CPRICEGROUP','_1'),c=controls(next);
 assert.equal(engine.stateValues(next).CSEATUPHGROUP,next.values.CBACKRESTUPHGROUP);
 assert.equal(c.length,1);assert.equal(c[0].label,'Gobelenas');assert.ok(c[0].fields.includes('CUPHSEATCOLOR'));
 assert.ok(c[0].options.length>10);for(const o of c[0].options)for(const f of c[0].fields)assert.equal(engine.stateValues(o.state)[f],o.code);
});
test('Souly mesh remains independent; missing own roles never become guessed controls',()=>{
 const {controls,proof}=originalRoles('souly');assert.equal(controls().length,2);
 assert.ok(controls(undefined,{...proof,surfaces:[]}).every(c=>c.options.length===0&&c.reason));
 const foreign={...proof,assets:proof.assets.map(a=>({...a,assetSha256:'f'.repeat(64)}))};assert.ok(controls(undefined,foreign).every(c=>!c.options.length));
});

test('Tref fixed back mesh remains a separate original material while its seat color changes',()=>{
 const family=families.find(f=>f.baseArticle==='KTRF001WW001')!,state=engine.initialState(family),assembly=engine.assembledAssets(state);
 const asset=assembly.base!,proof:LegacyChairRoleProof={assets:[asset],surfaces:['CUPHSEATCOLOR','CBACKRESTMESHCOLOR'].map((field,node)=>({assetSha256:asset.assetSha256,node,primitive:0,material:node,field}))};
 const controls=legacyChairMaterialControls({state,assets:[asset],proof,choices:engine.stateChoices,values:engine.stateValues,change:engine.changeField});
 const mesh=controls.find(c=>c.label==='Tinklelis')!,seat=controls.find(c=>c.fields.includes('CUPHSEATCOLOR'))!;
 assert.deepEqual(mesh.fields,['CBACKRESTMESHCOLOR']);assert.deepEqual(mesh.options.map(o=>o.code),['FX01']);
 assert.ok(seat.options.some(o=>o.code==='LAR101'));
 for(const option of seat.options)assert.equal(engine.stateValues(option.state).CBACKRESTMESHCOLOR,'FX01');
});
test('a fixed differently colored upholstered part blocks a fake common color',()=>{
 const state:ExpandedState={family:'fixture',anchor:'a',values:{CUPHSEATCOLOR:'RED',CUPHBACKRESTCOLOR:'BLUE',CBASE:'POL'}},asset={asset:'/own.glb',assetSha256:'a'.repeat(64),bytes:123};
 const proof={assets:[asset],surfaces:['CUPHSEATCOLOR','CUPHBACKRESTCOLOR'].map((field,node)=>({assetSha256:asset.assetSha256,node,primitive:0,material:node,field}))};
 const c=legacyChairMaterialControls({state,assets:[asset],proof,choices:()=>({CUPHSEATCOLOR:['RED','GREEN']}),values:s=>s.values,change:(s,k,v)=>({...s,values:{...s.values,[k]:v}})});
 assert.equal(c[0].options.length,0);assert.ok(c[0].reason);
});
const group=(id:string,field:string,colors:string[]):QualifiedGroup=>({id,label:field,base:colors[0],options:colors.map(code=>({id:code,label:code,values:{[field]:code},patch:{bindings:[],remove:[],assets:[]}}))});
test('qualified synchronization intersects whole disjoint groups and preserves the branch/metal selection',()=>{
 const seat=group('seat','CUPHSEATCOLOR',['RED','BLUE']),back=group('back','CUPHBACKCOLOR',['BLUE','GREEN']),metal=group('metal','CBASEMETALCOLOR',['POL','BLACK']);
 const w={id:'w',groups:[metal],branches:[{id:'b',values:{CUPHGROUP:'CSE'},groups:[seat,back]}]} as unknown as QualifiedWitness;
 const s:QualifiedSelection={witness:'w',kind:'groups',branch:'b',groups:{seat:'RED',back:'GREEN',metal:'BLACK'}};
 const projected=qualifiedChairMaterialControls(w,s,()=>true);assert.equal(projected.remaining[0],metal);assert.deepEqual(projected.controls[0].options.map(o=>o.code),['BLUE']);
 assert.deepEqual(projected.controls[0].options[0].state,{...s,groups:{seat:'BLUE',back:'BLUE',metal:'BLACK'}});
 assert.equal(qualifiedChairMaterialControls(w,s,()=>false).controls[0].options.length,0);
});
test('mixed qualified tuples and part swaps stay indivisible; no name/SHA joins',()=>{
 const mixed=group('mixed','CUPHCOLOR',['RED']);mixed.options[0].values.CBASEMETALCOLOR='BLACK';
 const w={id:'w',groups:[mixed],branches:[]} as unknown as QualifiedWitness;
 assert.deepEqual(qualifiedChairMaterialControls(w,{witness:'w',kind:'groups',groups:{}},()=>true).remaining,[mixed]);
});
test('a measured upholstery collection/color tuple remains one complete option',()=>{
 const g=group('fabric','CUPHCOLOR',['CSE01','CSE02']);for(const o of g.options)o.values.CUPHGROUP='CSE';
 const w={id:'w',groups:[g],branches:[]} as unknown as QualifiedWitness;
 const p=qualifiedChairMaterialControls(w,{witness:'w',kind:'groups',groups:{fabric:'CSE01'}},()=>true);
 assert.equal(p.controls.length,1);assert.equal(p.controls[0].label,'Gobelenas');assert.deepEqual(p.remaining,[]);assert.equal(p.controls[0].options.length,2);
 assert.equal(p.controls[0].options[1].state.groups.fabric,'CSE02');
});
test('original node/primitive associations identify surfaces even when every mesh has the same name',()=>{
 const root=new Group(),seat=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),plastic=new Mesh(new BoxGeometry(),seat.material);seat.name=plastic.name='identical';root.add(seat,plastic);
 const doc={nodes:[{mesh:0,extras:{finishField:'CUPHCOLOR'}},{mesh:1,extras:{finishField:'CPLASTICCOLOR'}}],meshes:[{primitives:[{material:0}]},{primitives:[{material:0}]}]};
 tagLegacyChairRoles(root,new Map([[seat,{nodes:0,primitives:0}],[plastic,{nodes:1,primitives:0}]]),doc,{asset:'/own.glb',assetSha256:'a'.repeat(64),bytes:123});
 assert.equal(visibleLegacyChairRoles(root).length,1);assert.equal(visibleLegacyChairRoles(root)[0].node,0);seat.visible=false;assert.deepEqual(visibleLegacyChairRoles(root),[]);
});
test('all upholstered parts use clones and restore exact original material, texture and world matrices',()=>{
 const root=new Group(),texture=new Texture(),source=new MeshStandardMaterial({color:'green',map:texture,metalness:.1,roughness:.7}),seat=new Mesh(new BoxGeometry(),source),back=new Mesh(new BoxGeometry(),source),plastic=new Mesh(new BoxGeometry(),source);root.add(seat,back,plastic);seat.position.set(1,2,3);root.updateMatrixWorld(true);
 tagLegacyChairRoles(root,new Map([[seat,{nodes:0,primitives:0}],[back,{nodes:1,primitives:0}],[plastic,{nodes:2,primitives:0}]]),{nodes:[{mesh:0,extras:{finishField:'CUPHSEATCOLOR'}},{mesh:0,extras:{finishField:'CUPHBACKRESTCOLOR'}},{mesh:0}],meshes:[{primitives:[{material:0}]}]},{asset:'/own.glb',assetSha256:'a'.repeat(64),bytes:123});
 const matrix=seat.matrixWorld.clone(),app=createLegacyChairMaterialApplication(root);app.prepare();assert.notEqual(seat.material,source);assert.notEqual(back.material,source);assert.equal(plastic.material,source);
 (seat.material as MeshStandardMaterial).color.set('red');(back.material as MeshStandardMaterial).map=null;app.resetOriginal();
 assert.equal(seat.material,source);assert.equal(back.material,source);assert.equal(source.map,texture);assert.deepEqual(seat.matrixWorld,matrix);assert.equal(source.color.getHexString(),'008000');app.dispose();
});
test('a node-wide role never qualifies a mixed multi-primitive mesh',()=>{
 const root=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());root.add(mesh);
 tagLegacyChairRoles(root,new Map([[mesh,{nodes:0,primitives:1}]]),{nodes:[{mesh:0,extras:{finishField:'CUPHCOLOR'}}],meshes:[{primitives:[{material:0},{material:1}]}]},{asset:'/mixed.glb',assetSha256:'a'.repeat(64),bytes:123});
 assert.deepEqual(visibleLegacyChairRoles(root),[]);
});
test('fixed leather upholstery does not block a separate fabric seat or acquire its color',()=>{
 const state:ExpandedState={family:'fixture',anchor:'a',values:{CUPHSEATCOLOR:'CSE01',CSEATUPHGROUP:'CSE',CHEADRESTUPHCOLOR:'VL9035',CHEADRESTUPHGROUP:'VL'}},asset={asset:'/own.glb',assetSha256:'a'.repeat(64),bytes:123};
 const proof={assets:[asset],surfaces:['CUPHSEATCOLOR','CHEADRESTUPHCOLOR'].map((field,node)=>({assetSha256:asset.assetSha256,node,primitive:0,material:node,field}))};
 const c=legacyChairMaterialControls({state,assets:[asset],proof,choices:()=>({CUPHSEATCOLOR:['CSE01','CSE02']}),values:s=>s.values,change:(s,k,v)=>({...s,values:{...s.values,[k]:v}})});
 assert.equal(c.length,2);const fabric=c.find(c=>c.label==='Gobelenas')!;assert.equal(fabric.options.length,2);assert.equal(fabric.options[1].state.values.CHEADRESTUPHCOLOR,'VL9035');assert.ok(c.some(c=>c.label==='Dirbtinė oda'));
});
