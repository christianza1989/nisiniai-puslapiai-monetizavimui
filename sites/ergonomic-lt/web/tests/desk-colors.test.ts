import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {deskColorPlan,validateDeskColors,withDeskColors,type DeskColors} from '../src/lib/desk-colors';
import {tagDeskSurfaces,createDeskColorApplication,createDeskColorMaterials,deskSurfaceKey} from '../src/lib/desk-color-materials';
import {adaptDeskComponents,type DeskComponents} from '../src/lib/desk-components';
import {createExpandedEngine,type Asset} from '../src/lib/expanded-configurator';
import type {Product} from '../src/lib/types';
import {studioBuilderSteps} from '../src/lib/product-studio';

const sha='a'.repeat(64),materialId='b'.repeat(64),selectorId='c'.repeat(64),code='KEM2013WW004';
const asset:Asset={asset:'/models/configurator/components/'+code+'-'+sha.slice(0,20)+'.glb',assetSha256:sha,bytes:100};
function overlay():DeskColors{return {schema:'desk-color-overlay-v1',code,componentRuntimeSha256:sha,sourceColorsSha256:'d'.repeat(64),baseDimensions:{GDWIDTH:'_1400',GDDEPTH:'_700'},fields:{FTOPCOLOR:{label:'Stalviršio spalva',default:'MP',owners:[],selectors:[selectorId],choices:[{value:'MP',text:'MP'},{value:'BI',text:'BI'}],values:{MP:{mode:'material',assignments:[{selectorId,materialId}],automatic:{}},BI:{mode:'material',assignments:[{selectorId,materialId}],automatic:{FAUTOCOLOR:'WHITE'}}}}},bindings:{[sha]:[{node:7,primitive:0,selectors:[{field:'FTOPCOLOR',selectorId}]}]},materialIds:[materialId],materialDocument:{asset:{version:'2.0'},images:[],materials:[{pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}]}};}
const values={GDWIDTH:'_1400',GDDEPTH:'_700',FTOPCOLOR:'BI'};
test('material uses only active exact bindings across captured sizes; inactive selectors do not block',()=>{
 const source=overlay();validateDeskColors(source,code,sha);
 assert.deepEqual(deskColorPlan(source,{...values,FTOPCOLOR:'MP'},[asset]),{materials:{},hidden:[],assets:[],pending:[]});
 assert.deepEqual(deskColorPlan(source,values,[{...asset,assetSha256:'e'.repeat(64)}]).pending,['FTOPCOLOR']);
 assert.deepEqual(deskColorPlan(source,values,[asset]).materials,{[sha+':7:0']:materialId});
 assert.deepEqual(deskColorPlan(source,{...values,GDWIDTH:'_1800'},[asset]).materials,{[sha+':7:0']:materialId});
 // An inactive source selector may have no assignment at all. It is not a
 // requirement for a component which is absent from the actual assembly.
 source.fields.FTOPCOLOR.selectors.push('f'.repeat(64));
 assert.deepEqual(deskColorPlan(source,values,[asset]).materials,{[sha+':7:0']:materialId});
 assert.deepEqual(deskColorPlan(source,values,[asset]).pending,[]);
 source.bindings[sha].push({node:8,primitive:0,selectors:[{field:'FTOPCOLOR',selectorId:'f'.repeat(64)}]});
 assert.deepEqual(deskColorPlan(source,values,[asset]).materials,{});
 assert.deepEqual(deskColorPlan(source,values,[asset]).pending,['FTOPCOLOR']);
});
test('ambiguous active selector or replacement material cannot partially paint a field',()=>{
 const source=overlay();source.bindings[sha].push({node:8,primitive:0,selectors:[{field:'FTOPCOLOR',selectorId}]});
 assert.deepEqual(deskColorPlan(source,values,[asset]),{materials:{},hidden:[],assets:[],pending:['FTOPCOLOR']});
 source.bindings[sha].pop();source.fields.FTOPCOLOR.values.BI.assignments.push({selectorId,materialId:'e'.repeat(64)});
 assert.deepEqual(deskColorPlan(source,values,[asset]),{materials:{},hidden:[],assets:[],pending:['FTOPCOLOR']});
});
test('part swap is base-size-only and requires every removed primitive exactly once',()=>{
 const source=overlay();source.fields.FTOPCOLOR.values.BI={mode:'partSwap',assignments:[],automatic:{},removeSelectors:[selectorId],assets:[asset],baseSizeOnly:true};validateDeskColors(source,code,sha);
 assert.deepEqual(deskColorPlan(source,{...values,GDWIDTH:'_1800'},[asset]),{materials:{},hidden:[],assets:[],pending:['FTOPCOLOR']});
 assert.deepEqual(deskColorPlan(source,values,[asset]).hidden,[sha+':7:0']);
 assert.deepEqual(deskColorPlan(source,values,[asset,asset]).pending,['FTOPCOLOR']);
});
test('reject wrong runtime, injected asset URLs, unknown materials and missing swap guards',()=>{
 assert.throws(()=>validateDeskColors(overlay(),code,'e'.repeat(64)));
 for(const mutate of [(d:DeskColors)=>{d.materialDocument.images=[{uri:'https://supplier.test/image.jpg'}];},(d:DeskColors)=>{d.fields.FTOPCOLOR.values.BI.assignments[0].materialId='f'.repeat(64);},(d:DeskColors)=>{d.fields.FTOPCOLOR.values.BI={mode:'partSwap',assignments:[],automatic:{},assets:[asset],removeSelectors:[selectorId]};}]){const d=overlay();mutate(d);assert.throws(()=>validateDeskColors(d,code,sha));}
});
test('color state and measured indirect finish codes survive validated quote/token flow',()=>{
 const part={file:'assets/'+sha+'.glb',sha256:sha,componentSha256:sha,bytes:100,needsCompression:false};
 const source:DeskComponents={schema:'desk-components-065-v1',code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:[{dimensions:{GDWIDTH:'_1400',GDDEPTH:'_700'},choiceRules:'conditional selectable tuples only',invariant:part,textOnly:{},groups:[{fields:['FBASE'],variants:[{values:{FBASE:'A'},asset:part}]}]}]};
 const id={code,sample:'23846535',productId:'product_emodel-2-0-desks_f22f1a81',familyId:'cfg-123456789abc'};
 const product={id:id.productId,categorySlug:'rasomieji-stalai-ir-darbo-vietos',modelConfigurationId:id.sample,configurations:[{id:id.sample,code}],name:'eModel 2.0'}as Product;
 const runtime=withDeskColors(adaptDeskComponents(source,id),overlay()),engine=createExpandedEngine(runtime);let state=engine.initialStateForProduct(product);const original=engine.assembledAssets(state);
 state=engine.changeField(state,'FTOPCOLOR','BI');assert.deepEqual(engine.assembledAssets(state),original);
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(state)),state);
 const options=engine.expandedSelection(product,state).configuration.supplierOptions!;
 assert(options.includes('FTOPCOLOR=BI'));assert(options.includes('FAUTOCOLOR=WHITE'));assert.equal(engine.stateChoices(state).FAUTOCOLOR,undefined);
 assert.throws(()=>engine.changeField(state,'FTOPCOLOR','INVENTED'));
 const owned=overlay();owned.fields.FTOPCOLOR.owners=['FBASE'];const ownedSource=structuredClone(source);ownedSource.contexts[0].groups[0].variants=[{values:{FBASE:'NONE'},asset:null},{values:{FBASE:'A'},asset:part}];
 const ownedEngine=createExpandedEngine(withDeskColors(adaptDeskComponents(ownedSource,id),owned)),absent=ownedEngine.initialStateForProduct(product);
 assert.equal(ownedEngine.stateChoices(absent).FTOPCOLOR,undefined);assert(!ownedEngine.expandedSelection(product,absent).configuration.supplierOptions!.some(option=>option.startsWith('FTOPCOLOR=')));
});
test('loader node associations isolate a shared material; restore keeps original matrices',async()=>{
 const root=new Group(),shared=new MeshStandardMaterial({color:'#000000'}),first=new Mesh(new BoxGeometry(),shared),second=new Mesh(new BoxGeometry(),shared);root.add(first,second);first.position.set(2,3,4);first.updateMatrix();const matrix=first.matrix.toArray();
 tagDeskSurfaces(root,new Map([[first,{nodes:7,primitives:0}],[second,{nodes:8,primitives:0}]]),sha);assert.equal(first.userData[deskSurfaceKey],sha+':7:0');
 const apply=createDeskColorApplication(root),white=new MeshStandardMaterial({color:'#ffffff'});await apply.apply(deskColorPlan(overlay(),values,[asset]),async()=>white);
 assert.notEqual(first.material,shared);assert.equal(second.material,shared);assert.equal(shared.color.getHexString(),'000000');assert.deepEqual(first.matrix.toArray(),matrix);
 await apply.apply(deskColorPlan(overlay(),{...values,FTOPCOLOR:'MP'},[asset]),async()=>white);assert.equal(first.material,shared);assert.equal(first.visible,true);apply.dispose();
});
test('a late material request cannot overwrite a newer color selection',async()=>{
 const root=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());root.add(mesh);mesh.userData[deskSurfaceKey]=sha+':7:0';const original=mesh.material,apply=createDeskColorApplication(root);
 let finish!:(material:MeshStandardMaterial)=>void;const old=apply.apply(deskColorPlan(overlay(),values,[asset]),()=>new Promise(resolve=>{finish=resolve;}));
 await apply.apply({materials:{},hidden:[],assets:[],pending:[]},async()=>new MeshStandardMaterial());finish(new MeshStandardMaterial());assert.equal(await old,false);assert.equal(mesh.material,original);apply.dispose();
});
test('the glTF material loader retains supplied PBR values instead of an approximate palette',async()=>{
 const data=overlay();data.materialDocument.materials=[{doubleSided:true,alphaMode:'MASK',alphaCutoff:0.3,pbrMetallicRoughness:{baseColorFactor:[0.1,0.2,0.3,0.8],roughnessFactor:0.27,metallicFactor:0.61}}];
 const store=createDeskColorMaterials(data),material=await store.get(materialId)as MeshStandardMaterial;
 assert.equal(material.roughness,0.27);assert.equal(material.metalness,0.61);assert.equal(material.opacity,0.8);assert.equal(material.alphaTest,0.3);assert.deepEqual(material.color.toArray(),[0.1,0.2,0.3]);assert.equal(material.side,2);store.dispose();
});
test('source-declared finish names ending in COL remain separate swatches without structural collisions',()=>{
 const data=overlay();data.fields.FOUTSIDEDESKTOPBOARDCOL=data.fields.FTOPCOLOR;delete data.fields.FTOPCOLOR;for(const targets of Object.values(data.bindings))for(const target of targets)for(const selector of target.selectors)selector.field='FOUTSIDEDESKTOPBOARDCOL';validateDeskColors(data,code,sha);
 const choices={GDWIDTH:['_1400'],FBASE:['A'],FOUTSIDEDESKTOPBOARDCOL:['MP','BI']},product={categorySlug:'rasomieji-stalai-ir-darbo-vietos'}as Product;const steps=studioBuilderSteps(product,choices,false,Object.keys(data.fields));
 assert.deepEqual(steps.find(s=>s.id==='colors')?.fields,['FOUTSIDEDESKTOPBOARDCOL']);assert.deepEqual(steps.find(s=>s.id==='construction')?.fields,['GDWIDTH','FBASE']);assert.equal(steps.find(s=>s.id==='colors')?.label,'Spalvos');
 data.fields.FOUTSIDEDESKTOPBOARDCOL.values.BI={mode:'pending',assignments:[],automatic:{}};validateDeskColors(data,code,sha);const plan=deskColorPlan(data,{...values,FOUTSIDEDESKTOPBOARDCOL:'BI'},[asset]);assert.deepEqual(plan.materials,{});assert.deepEqual(plan.pending,['FOUTSIDEDESKTOPBOARDCOL']);
});
test('fixed dimensions do not invent controls; exact material bindings remain valid at another captured width',()=>{
 const part={file:'assets/'+sha+'.glb',sha256:sha,componentSha256:sha,bytes:100,needsCompression:false};
 const source:DeskComponents={schema:'desk-components-065-v1',code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:['_1400','_1800'].map(width=>({dimensions:{GDWIDTH:width},choiceRules:'conditional selectable tuples only',invariant:part,textOnly:{},groups:[{fields:[],variants:[{values:{},asset:null}]}]}))};
 const runtime=withDeskColors(adaptDeskComponents(source,{code,sample:'1',productId:'p',familyId:'cfg-123456789abc'}),overlay());
 assert.deepEqual(runtime.family.deskColors!.baseDimensions,{GDWIDTH:'_1400'});assert.equal(runtime.family.anchors[0].choices.GDDEPTH,undefined);
 assert.equal(Object.keys(deskColorPlan(runtime.family.deskColors!,{GDWIDTH:'_1400',FTOPCOLOR:'BI'},[asset]).materials).length,1);
 assert.deepEqual(deskColorPlan(runtime.family.deskColors!,{GDWIDTH:'_1800',FTOPCOLOR:'BI'},[asset]).materials,{[sha+':7:0']:materialId});
});

test('initial desk context maximizes actual color coverage and is not overwritten by supplier example dimensions',()=>{
 const part=(id:string)=>({file:'assets/'+id+'.glb',sha256:id,componentSha256:id,bytes:100,needsCompression:false});
 const source:DeskComponents={schema:'desk-components-065-v1',code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:['_1400','_1800'].map((width,index)=>({dimensions:{GDWIDTH:width},choiceRules:'conditional selectable tuples only',invariant:part(index?sha:'e'.repeat(64)),textOnly:{},groups:[{fields:[],variants:[{values:{},asset:null}]}]}))};
 const id={code,sample:'1',productId:'p',familyId:'cfg-123456789abc'};
 const product={id:'p',categorySlug:'rasomieji-stalai-ir-darbo-vietos',modelConfigurationId:'1',configurations:[{id:'1',code,supplierOptions:['GDWIDTH=_1400']}],name:'Desk'}as Product;
 const runtime=withDeskColors(adaptDeskComponents(source,id),overlay()),engine=createExpandedEngine(runtime);
 const initial=engine.initialStateForProduct(product);
 assert.equal(initial.values.GDWIDTH,'_1800');assert.equal(initial.values.FTOPCOLOR,'MP');
 const oldWidth=engine.changeField(initial,'GDWIDTH','_1400');
 assert.equal(engine.parseStateToken(product,engine.stateToken(oldWidth)).values.GDWIDTH,'_1400');
 assert.equal(source.contexts[0].dimensions.GDWIDTH,'_1400');
});
