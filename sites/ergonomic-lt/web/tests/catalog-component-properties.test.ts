import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogEngine,type CatalogFamily} from '../src/lib/catalog-configurator';
import type {Product} from '../src/lib/types';
import {compactCatalogRuntime} from '../scripts/compact-catalog-runtime.mjs';

function fixture(fixedOnly=false){
 const geometry={asset:'/fixture.glb',assetSha256:'fixture',bytes:0},patch={remove:[],addIds:[],changes:{},choices:{},geometry:null};
 const fixed={key:'fixed',values:{CVERSION:'FIXED',CFIXINGGROUND:'GLUE'},defaults:{},choices:fixedOnly?{CVERSION:['FIXED','FREE']}:{CVERSION:['FIXED','FREE'],CFIXINGGROUND:['GLUE']},transitions:{'CVERSION=FREE':'free'},patch};
 const free={key:'free',values:{CVERSION:'FREE',CGLIDES:'GD'},defaults:{CVERSION:'FREE',CGLIDES:'GD'},choices:{CVERSION:['FIXED','FREE'],CGLIDES:['GD']},transitions:{'CVERSION=FIXED':'fixed'},patch};
 const family={id:'property-removal',kind:'catalog',productId:'fixture',baseArticle:'KTEST',sample:'sample',articles:[{code:'KTEST',sample:'sample',name:'Fixture'}],anchors:[{id:'default',article:'KTEST',sample:'sample',name:'Fixture',axes:[],defaults:{CVERSION:'FIXED',CFIXINGGROUND:'GLUE'},choices:fixed.choices,classes:{CVERSION:'KTEST_OPTIONS',CFIXINGGROUND:'KTEST_OPTIONS',CGLIDES:'KTEST_OPTIONS'},geometry,components:[{fields:['CVERSION','CFIXINGGROUND','CGLIDES'],variants:[fixed,free]}],profiles:[]}]} as unknown as CatalogFamily;
 const product={id:'fixture',configurations:[{id:'sample',code:'KTEST'}]} as Product;
 return {family,product,engine:createCatalogEngine(family)};
}

test('removing a source component property removes its default from state and supplier specification, with a valid return transition',()=>{
 const {family,product,engine}=fixture(),initial=engine.catalogInitial(family);
 assert.equal(initial.values.CFIXINGGROUND,'GLUE');
 const free=engine.catalogChange(initial,'CVERSION','FREE');
 assert.equal('CFIXINGGROUND' in free.values,false);
 assert.equal('CFIXINGGROUND' in engine.catalogChoices(free),false);
 assert.equal('CFIXINGGROUND' in engine.catalogValues(free),false);
 assert.equal(free.values.CGLIDES,'GD');
 assert.deepEqual(engine.catalogSelection(product,free,()=>[]).configuration.supplierOptions,['KTEST_OPTIONS.CGLIDES=GD','KTEST_OPTIONS.CVERSION=FREE']);
 assert.deepEqual(engine.catalogValidate(product,free),free);
 assert.throws(()=>engine.catalogValidate(product,{...free,values:{...free.values,CFIXINGGROUND:'GLUE'}}));
 assert.deepEqual(engine.catalogChange(free,'CVERSION','FIXED'),initial);
});

test('a real fixed component property stays in the internal specification even without an editable selector',()=>{
 const {family,product,engine}=fixture(true),state=engine.catalogInitial(family);
 assert.equal(engine.catalogChoices(state).CFIXINGGROUND,undefined);
 assert.equal(state.values.CFIXINGGROUND,'GLUE');
 assert(engine.catalogSelection(product,state,()=>[]).configuration.supplierOptions!.includes('KTEST_OPTIONS.CFIXINGGROUND=GLUE'));
});

test('a measured frame transition can expose a finish selector while retaining its internal source code',()=>{
 const {family,product}=fixture(),anchor=family.anchors[0],patch=anchor.components[0].variants[0].patch;
 anchor.defaults={CFRAMEMETALCOLOR:'RAL9005',CARMPADPLCOLOR:'KB08'};
 anchor.choices={CFRAMEMETALCOLOR:['RAL9005','RAL1024']};
 anchor.classes={CFRAMEMETALCOLOR:'KTEST_FINISHES',CARMPADPLCOLOR:'KTEST_FINISHES'};
 anchor.components=[{fields:['CFRAMEMETALCOLOR'],variants:[
  {key:'dark',values:{CFRAMEMETALCOLOR:'RAL9005'},defaults:{},choices:{CFRAMEMETALCOLOR:['RAL9005','RAL1024']},transitions:{'CFRAMEMETALCOLOR=RAL1024':'ochre'},patch},
  {key:'ochre',values:{CFRAMEMETALCOLOR:'RAL1024'},defaults:{CFRAMEMETALCOLOR:'RAL1024'},choices:{CFRAMEMETALCOLOR:['RAL9005','RAL1024'],CARMPADPLCOLOR:['KB08']},dependentChoices:{CARMPADPLCOLOR:['KB08']},transitions:{'CFRAMEMETALCOLOR=RAL9005':'dark'},patch},
 ]}];
 const engine=createCatalogEngine(family),initial=engine.catalogInitial(family);
 assert.equal(engine.catalogChoices(initial).CARMPADPLCOLOR,undefined);
 const changed=engine.catalogChange(initial,'CFRAMEMETALCOLOR','RAL1024');
 assert.deepEqual(engine.catalogChoices(changed).CARMPADPLCOLOR,['KB08']);
 assert.equal(changed.values.CARMPADPLCOLOR,'KB08');
 assert.deepEqual(engine.catalogValidate(product,changed),changed);
 const compact=createCatalogEngine(compactCatalogRuntime({families:[family],palettes:{}}).families[0]);
 assert.deepEqual(compact.catalogChoices(changed),engine.catalogChoices(changed));
 assert.deepEqual(compact.catalogSelection(product,changed,()=>[]).configuration.supplierOptions,engine.catalogSelection(product,changed,()=>[]).configuration.supplierOptions);
 assert(engine.catalogSelection(product,changed,()=>[]).configuration.supplierOptions!.includes('KTEST_FINISHES.CARMPADPLCOLOR=KB08'));
 assert.deepEqual(engine.catalogChange(changed,'CFRAMEMETALCOLOR','RAL9005'),initial);
 assert.throws(()=>engine.catalogValidate(product,{...changed,values:{...changed.values,CARMPADPLCOLOR:'FAKE'}}));
});
