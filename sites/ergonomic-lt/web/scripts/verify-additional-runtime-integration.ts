import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {baseSeed} from '../src/lib/catalog';
import {modelProduct} from '../src/lib/product-models';
import {supplierOptions} from '../src/lib/configuration-labels';
import {createCatalogRuntimeLoader,type CatalogRuntimeIndex} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {validQuoteEntry} from '../src/lib/quote-entry';
const root=path.resolve('../research/configurator/all-chairs-20261014');
const stage=path.resolve(process.argv.find(a=>a.startsWith('--stage='))?.slice(8)||path.join(root,'stage-model-identity-current'));
assert(stage.startsWith(root+path.sep));
const index=JSON.parse(await fs.readFile(path.join(stage,'configurator-additional-index.json'),'utf8')) as CatalogRuntimeIndex;
const load=createCatalogRuntimeLoader(index,async asset=>fs.readFile(path.join(stage,'public',asset)));
const reports=[];
for(const [id,binding] of Object.entries(index.products)){
 const parent=baseSeed().products.find(p=>p.id===id)!;assert(parent);
 for(const article of binding.articles){
  const configuration=parent.configurations.find(c=>c.id===article.sample)!;assert(configuration);
  const model=modelProduct(parent,configuration),runtime=await load(model);assert(runtime);
  const engine=createExpandedEngine(runtime),state=engine.initialStateForProduct(model),initial=engine.expandedSelection(model,state);
  const comparable=(field:string,value:string)=>field==='CPRICEGROUP'?value.replace(/^_/,''):value;
  const wanted=Object.fromEntries(supplierOptions(configuration).map(option=>{const [key,value]=option.split('='),field=key.split('.').at(-1)!;return [field,comparable(field,value)];}));
  const actual=Object.fromEntries(initial.configuration.supplierOptions!.map(option=>{const [key,value]=option.split('='),field=key.split('.').at(-1)!;return [field,comparable(field,value)];}));
  const differences=Object.entries(wanted).filter(([field,value])=>actual[field]!==value).map(([field,expected])=>({field,expected,actual:actual[field]}));
  let currentSourceDifferences:{field:string;expected:string;actual:string}[]|undefined;
  try{
   const folder=path.join(root,'source-v3',article.code),manifest=JSON.parse(await fs.readFile(path.join(folder,'seed-reference-manifest.json'),'utf8'));
   const reference=manifest.references.find((r:{samples:{productId:string;sample:string}[]})=>r.samples.some(s=>s.productId===id&&s.sample===configuration.id));assert(reference);
   const source=JSON.parse(await fs.readFile(path.join(folder,reference.file),'utf8'));
   currentSourceDifferences=Object.entries(source.properties as Record<string,{value:string}>).filter(([key])=>(/_OPTIONS\.|_FINISHES\./.test(key)||key.includes('_DIMENSIONS.')&&(key.endsWith('.DFRAMEDIAMETER')||key in source.choices))).map(([key,p])=>({field:key.split('.').at(-1)!,expected:comparable(key.split('.').at(-1)!,p.value)})).filter(v=>actual[v.field]!==v.expected).map(v=>({...v,actual:actual[v.field]}));
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  assert.equal(initial.configuration.id,configuration.id);assert.equal(initial.configuration.code,configuration.code);
  assert.deepEqual(engine.parseStateToken(model,engine.stateToken(state)),state);
  const parentRuntime=await load(parent,engine.stateToken(state));assert(parentRuntime);
  const server=createExpandedEngine(parentRuntime).expandedSelection(parent,state);
  assert.equal(server.configuration.id,configuration.id);assert.deepEqual(server.configuration.supplierOptions,initial.configuration.supplierOptions);
  const entry={productId:parent.id,name:model.name,brand:'',url:'/produktai/'+model.categorySlug+'/'+model.slug+'/',image:initial.configuration.image,configurationId:configuration.id,configurationState:state,configurationLabel:configuration.name,configurationDetails:initial.configuration.details,quantity:1,note:''};
  assert(validQuoteEntry(entry));
  await fs.access(path.join(stage,'public',initial.configuration.image!));
  // Exercise a real change, then the server and PDF token parse paths again.
  const choices=engine.stateChoices(state),field=Object.keys(choices).find(k=>choices[k].some(v=>v!==state.values[k]));
  if(field){const changed=engine.changeField(state,field,choices[field].find(v=>v!==state.values[field])!);
   const changedRuntime=await load(parent,engine.stateToken(changed));assert(changedRuntime);
   const resolved=createExpandedEngine(changedRuntime),selection=resolved.expandedSelection(parent,resolved.parseStateToken(parent,engine.stateToken(changed)));
   assert.equal(selection.configuration.id,configuration.id);assert.equal(selection.configuration.code,configuration.code);
  }
  reports.push({product:id,sample:configuration.id,article:article.code,initialMatchesOriginal:!differences.length,differences,currentSourceDifferences,tokenQuotePdfBinding:'PASS'});
 }
}
await fs.writeFile(path.join(stage,'model-integration.json'),JSON.stringify({models:reports.length,reports},null,2)+'\n');
console.log(JSON.stringify({models:reports.length,originalMismatches:reports.filter(r=>!r.initialMatchesOriginal),currentSourceMismatches:reports.filter(r=>r.currentSourceDifferences?.length),tokenQuotePdfBinding:'PASS'}));
if(reports.some(r=>r.currentSourceDifferences===undefined?!r.initialMatchesOriginal:r.currentSourceDifferences.length>0))process.exitCode=1;
