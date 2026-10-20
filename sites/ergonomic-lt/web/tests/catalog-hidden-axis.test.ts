import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleModelsAsync} from '../src/lib/catalog';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';

test('Vapaa retains its native armrest configuration when the writing tablet is removed',async()=>{
 const product=(await visibleModelsAsync()).find(p=>p.configurations.find(c=>c.id===p.modelConfigurationId)?.code==='KVAP005WW002');
 assert(product,'The verified Vapaa model must be present');
 const runtime=await loadCatalogRuntime(product);assert(runtime);
 const engine=createExpandedEngine(runtime),initial=engine.initialStateForProduct(product);
 const tablet=engine.changeField(initial,'CTABLET','LEFTLAMINATE');
 const before=engine.expandedSelection(product,tablet);
 assert(before.configuration.supplierOptions?.includes('KVAP005WW002_OPTIONS.CARMRESTS=BUILTINFRAMEOPENFRONTMET'),'Tablet construction must use its native built-in armrests');
 // Independent native snapshot: LEFTLAMINATE/axis-transitions/CTABLET=NONE.
 // Removing the tablet leaves the existing valid armrest assembly in place.
 const without=engine.changeField(tablet,'CTABLET','NONE');
 const after=engine.expandedSelection(product,without);
 assert(engine.stateChoices(without).CARMRESTS.includes('BUILTINFRAMEOPENFRONTMET'));
 assert(after.configuration.supplierOptions?.includes('KVAP005WW002_OPTIONS.CARMRESTS=BUILTINFRAMEOPENFRONTMET'),'Native armrests must remain when CTABLET becomes NONE');
 assert(after.configuration.supplierOptions?.includes('KVAP005WW002_OPTIONS.CARMPAD=PLASTICBL'));
 assert(after.configuration.supplierOptions?.includes('KVAP005WW002_OPTIONS.CTABLET=NONE'));
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(without)),without);
});
