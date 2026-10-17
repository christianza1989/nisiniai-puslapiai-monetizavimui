import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogEngine,type CatalogFamily} from '../src/lib/catalog-configurator';
import type {Product} from '../src/lib/types';
import {compactCatalogRuntime} from '../scripts/compact-catalog-runtime.mjs';

// Bounded contract fixture for the measured Naudu failure: changing the inner
// price group resets its fabric, while the independent outer fabric remains.
function fixture(){
 const inner='CPRICEGROUPINTBACKSEAT',outer='CPRICEGROUPEXTBACK';
 const fields=['CUPHGROUPINTBACKSEAT','CUPHGROUPEXTBACK'];
 const geometry={asset:'/test-only.glb',assetSha256:'test-only',bytes:0};
 const patch={remove:[],addIds:[],changes:{},choices:{},geometry:null};
 const base=(price:string,intGroup:string,extGroup:string)=>({[inner]:price,[outer]:'_2',CUPHGROUPINTBACKSEAT:intGroup,CUPHGROUPEXTBACK:extGroup,CUPHBACKRESTFRONTCOLOR:intGroup+'-1',CUPHBACKRESTBACKCOLOR:extGroup+'-1'});
 const variant=(intGroup:string,extGroup:string)=>({key:intGroup+'|'+extGroup,values:{CUPHGROUPINTBACKSEAT:intGroup,CUPHGROUPEXTBACK:extGroup},defaults:{CUPHBACKRESTFRONTCOLOR:intGroup+'-1',CUPHBACKRESTBACKCOLOR:extGroup+'-1'},choices:{CUPHGROUPINTBACKSEAT:[intGroup],CUPHGROUPEXTBACK:['CUR','VL'],CUPHBACKRESTFRONTCOLOR:[intGroup+'-1'],CUPHBACKRESTBACKCOLOR:[extGroup+'-1']},dependentChoices:{CUPHBACKRESTFRONTCOLOR:[intGroup+'-1'],CUPHBACKRESTBACKCOLOR:[extGroup+'-1']},transitions:{},patch});
 const classes=Object.fromEntries(Object.keys(base('_1','CSE','VL')).map(key=>[key,'KTEST_FINISHES']));
 const first={id:'_1--_2',article:'KTEST',sample:'fixture',name:'Fixture',axes:[inner,outer],defaults:base('_1','CSE','VL'),choices:{[inner]:['_1','_2'],[outer]:['_2']},classes,geometry,components:[{fields,variants:[variant('CSE','VL')]}],profiles:[],axisTransitions:{[inner+'=_2']:'_2--_2'},axisValueChanges:{[inner+'=_2']:{[inner]:'_2',CUPHGROUPINTBACKSEAT:'CUR',CUPHBACKRESTFRONTCOLOR:'CUR-1'}}};
 const second={...first,id:'_2--_2',defaults:base('_2','CUR','CUR'),components:[{fields,variants:[variant('CUR','CUR'),variant('CUR','VL')]}],axisTransitions:{[inner+'=_1']:'_1--_2'},axisValueChanges:{[inner+'=_1']:{[inner]:'_1',CUPHGROUPINTBACKSEAT:'CSE',CUPHBACKRESTFRONTCOLOR:'CSE-1'}}};
 const family={id:'independent-upholstery-fixture',kind:'catalog',productId:'fixture',baseArticle:'KTEST',sample:'fixture',articles:[{code:'KTEST',sample:'fixture',name:'Fixture'}],anchors:[first,second]} as unknown as CatalogFamily;
 const product={id:'fixture',configurations:[{id:'fixture',code:'KTEST'}]} as Product;
 return {family,product,engine:createCatalogEngine(family),inner};
}

test('changing the inner price group preserves the independently selected outer upholstery',()=>{
 const {family,product,engine,inner}=fixture(),initial=engine.catalogInitial(family);
 const changed=engine.catalogChange(initial,inner,'_2'),values=engine.catalogValues(changed);
 assert.equal(values.CUPHGROUPINTBACKSEAT,'CUR');
 assert.equal(values.CUPHGROUPEXTBACK,'VL','Independent outer upholstery must remain after inner price change');
 assert.equal(values.CUPHBACKRESTBACKCOLOR,'VL-1');
 assert.equal(values.CUPHBACKRESTFRONTCOLOR,'CUR-1');
 assert.deepEqual(engine.catalogValidate(product,changed),changed);
 assert(engine.catalogSelection(product,changed,()=>[]).configuration.supplierOptions!.includes('KTEST_FINISHES.CUPHGROUPEXTBACK=VL'));
 assert.deepEqual(engine.catalogChange(changed,inner,'_1'),initial);
});

test('compact runtime preserves measured axis deltas and cannot accept a fabricated price group',()=>{
 const {family,product,engine,inner}=fixture(),compact=createCatalogEngine(compactCatalogRuntime({families:[family],palettes:{}}).families[0]);
 const state=engine.catalogInitial(family),next=engine.catalogChange(state,inner,'_2');
 assert.deepEqual(compact.catalogChange(state,inner,'_2'),next);
 assert.deepEqual(compact.catalogSelection(product,next,()=>[]).configuration.supplierOptions,engine.catalogSelection(product,next,()=>[]).configuration.supplierOptions);
 assert.throws(()=>engine.catalogChange(state,inner,'FAKE'));
});
