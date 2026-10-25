import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleModelsAsync} from '../src/lib/catalog';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createCatalogEngine} from '../src/lib/catalog-configurator';

async function linkedViden(){
 const product=(await visibleModelsAsync()).find(p=>p.configurations.find(c=>c.id===p.modelConfigurationId)?.code==='KVID010WW001');
 assert(product,'The verified Viden model must be present');
 const runtime=await loadCatalogRuntime(product);assert(runtime);
 const engine=createCatalogEngine(runtime.family);let state=engine.catalogInitial(runtime.family);
 for(const [field,value] of [['CHEADREST','HRUA'],['CPRICEGROUP','_2'],['CBACKRESTUPHGROUP','VL'],['CHEADRESTUPHCHGROUP','VL'],['CUPHBACKRESTCOLOR','VL3067'],['CHEADRESTUPHCHCOLOR','VL3067']]){
  if(engine.catalogValues(state)[field]===value)continue;
  assert(engine.catalogChoices(state)[field]?.includes(value),field+' must accept its measured native value');
  state=engine.catalogChange(state,field,value);
 }
 return {engine,state};
}

test('Viden linked headrest follows the current backrest colour while retaining the native black alternative',async()=>{
 const {engine,state}=await linkedViden();
 assert.deepEqual(engine.catalogChoices(state).CHEADRESTUPHCHCOLOR,['VL3067','VL9035'],'Linked headrest choices must follow the measured native domain');
 const changed=engine.catalogChange(state,'CUPHBACKRESTCOLOR','VL6012');
 assert.equal(engine.catalogValues(changed).CHEADRESTUPHCHCOLOR,'VL6012','A matching headrest must follow the new native body colour');
 assert.deepEqual(engine.catalogChoices(changed).CHEADRESTUPHCHCOLOR,['VL6012','VL9035']);
 const black=engine.catalogChange(state,'CHEADRESTUPHCHCOLOR','VL9035');
 assert.equal(engine.catalogValues(engine.catalogChange(black,'CUPHBACKRESTCOLOR','VL6012')).CHEADRESTUPHCHCOLOR,'VL9035');
});

test('Viden hides a measured singleton headrest choice and preserves black when its selector reopens',async()=>{
 const {engine,state}=await linkedViden();
 const black=engine.catalogChange(state,'CUPHBACKRESTCOLOR','VL9035');
 assert.equal(engine.catalogChoices(black).CHEADRESTUPHCHCOLOR,undefined);
 assert.equal(engine.catalogValues(black).CHEADRESTUPHCHCOLOR,'VL9035');
 const reopened=engine.catalogChange(black,'CUPHBACKRESTCOLOR','VL6012');
 assert.deepEqual(engine.catalogChoices(reopened).CHEADRESTUPHCHCOLOR,['VL6012','VL9035']);
 assert.equal(engine.catalogValues(reopened).CHEADRESTUPHCHCOLOR,'VL9035');
});
