import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleModelsAsync} from '../src/lib/catalog';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createCatalogEngine} from '../src/lib/catalog-configurator';

async function tiger(){
 const product=(await visibleModelsAsync()).find(p=>p.configurations.find(c=>c.id===p.modelConfigurationId)?.code==='KTGU004WW002');
 assert(product,'The verified Tiger model must be present');
 const runtime=await loadCatalogRuntime(product);assert(runtime);
 const engine=createCatalogEngine(runtime.family),initial=engine.catalogInitial(runtime.family);
 assert.equal(engine.catalogValues(initial).CARMRESTS,'NONE');
 const hard=engine.catalogChange(initial,'CMECHANISM','GTGO1HARD');
 return {product,engine,hard};
}

test('Tiger headrest selects the measured native armrest construction and rejects the obsolete constructor state',async()=>{
 const {product,engine,hard}=await tiger();
 const added=engine.catalogChange(hard,'CHEADREST','HRUA');
 assert.equal(added.anchor,'KTGU004WW002:GTPTIGBLPU','Headrest must select the measured native destination constructor');
 const values=engine.catalogValues(added);
 assert.equal(values.CARMRESTS,'GTPTIGBLPU');
 assert.equal(values.CHEADREST,'HRUA');
 assert.equal(values.CMECHANISM,'GTGO1HARD');
 assert.deepEqual(engine.catalogValidate(product,added),added);
 assert.throws(()=>engine.catalogValidate(product,{...hard,values:{...hard.values,CHEADREST:'HRUA'}}));
});

test('Tiger preserves its native armrest construction when the headrest or mechanism is changed back',async()=>{
 const {engine,hard}=await tiger(),added=engine.catalogChange(hard,'CHEADREST','HRUA');
 for(const [field,value] of [['CHEADREST','NONE'],['CMECHANISM','GTGO1']]){
  const changed=engine.catalogChange(added,field,value),values=engine.catalogValues(changed);
  assert.equal(changed.anchor,'KTGU004WW002:GTPTIGBLPU');
  assert.equal(values.CARMRESTS,'GTPTIGBLPU');
  assert.equal(values.CHEADREST,'NONE');
  assert.equal(values[field],value);
 }
});
