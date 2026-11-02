import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createExpandedEngine,expandedClientSources,families,palettes} from '../src/lib/expanded-configurator';
import {createScopedExpandedEngine} from '../src/lib/expanded-engine';
import seed from '../content/seed.json';
import type {Product} from '../src/lib/types';

test('the browser engine has no dependency on the full family/catalog registries',async()=>{
 const result=await build({entryPoints:['src/lib/expanded-engine.ts','src/components/product-detail-client.tsx'],bundle:true,write:false,metafile:true,platform:'browser',format:'esm',outdir:'scope-check',external:['react','react-dom','react/jsx-runtime','next/*','three','three/*'],tsconfig:'tsconfig.json',logLevel:'silent'});
 for(const input of Object.keys(result.metafile!.inputs))assert(!/content[\\/]configurator-(?:catalog|expanded)\.json$/.test(input),input);
});

test('per-product data preserves captured defaults, changes, labels, materials and order identities',()=>{
 const complete=createExpandedEngine();let checked=0;
 for(const family of families){
  const parent=(seed.products as unknown as Product[]).find(product=>product.id===family.productId);if(!parent)continue;
  const product={...parent,modelConfigurationId:family.sample},sources=expandedClientSources(product),scoped=createScopedExpandedEngine(undefined,sources);
  if(!complete.expandedForProduct(product))continue;
  const state=complete.initialStateForProduct(product);assert.deepEqual(scoped.initialStateForProduct(product),state);
  assert.deepEqual(scoped.expandedSelection(product,state),complete.expandedSelection(product,state));
  assert(sources.families.length+sources.catalogFamilies.length===1);
  for(const[field,values]of Object.entries(complete.stateChoices(state)))for(const value of values){
   let next;try{next=complete.changeField(state,field,value);}catch{assert.throws(()=>scoped.changeField(state,field,value));continue;}
   assert.deepEqual(scoped.changeField(state,field,value),next);assert.deepEqual(scoped.expandedSelection(product,next),complete.expandedSelection(product,next));
   assert.equal(scoped.choiceLabel(field,value,undefined,state.family),complete.choiceLabel(field,value,undefined,state.family));
   for(const[k,items]of Object.entries(complete.stateChoices(next)))for(const v of items)assert.deepEqual(sources.palettes[k]?.[v],palettes[k]?.[v]);
  }
  checked++;
 }
 assert.equal(checked,families.length);
});
