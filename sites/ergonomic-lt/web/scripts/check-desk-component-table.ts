import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {adaptDeskComponents,deskAssetReference,validateDeskComponents,type DeskComponents} from '../src/lib/desk-components';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import type {Product} from '../src/lib/types';

const [sourcePath,output]=process.argv.slice(2);assert(sourcePath&&output,'runtime.json and new report path required');
const bytes=await fs.readFile(sourcePath),source:DeskComponents=JSON.parse(bytes.toString('utf8'));validateDeskComponents(source,'KEM2013WW004');
const seed=JSON.parse(await fs.readFile('content/seed.json','utf8')) as {products:Product[]};
const parent=seed.products.find(p=>p.configurations.some(c=>c.code===source.code))!,sample=parent.configurations.find(c=>c.code===source.code)!;
const product={...parent,modelConfigurationId:sample.id},runtime=adaptDeskComponents(source,{code:source.code,productId:parent.id,sample:sample.id,familyId:'cfg-'+createHash('sha256').update('desk-components:'+source.code).digest('hex').slice(0,12)}),engine=createExpandedEngine(runtime);
let variants=0,textSelections=0;const coverage=[];
for(const [index,context] of source.contexts.entries()){
 const anchor=runtime.family.anchors[index],initial=engine.catalog.catalogInitial({...runtime.family,anchors:[anchor]});engine.validateState(product,initial);
 assert.equal(initial.anchor,anchor.id);assert.deepEqual(engine.assembledAssets(initial).base,context.invariant?deskAssetReference(source.code,context.invariant):null);
 for(const [field,domain] of Object.entries(context.textOnly))for(const value of domain){
  const next=engine.changeField(initial,field,value);assert.deepEqual(engine.assembledAssets(next),engine.assembledAssets(initial));
  assert(engine.expandedSelection(product,next).configuration.supplierOptions?.includes(field+'='+value));textSelections++;
 }
 for(const [groupIndex,group] of context.groups.entries()){
  const queue=[initial],seen=new Set<string>();
  while(queue.length){
   const state=queue.pop()!,tuple=JSON.stringify(group.fields.map(f=>state.values[f]));if(seen.has(tuple))continue;seen.add(tuple);
   const captured=group.variants.find(v=>group.fields.every(f=>state.values[f]===v.values[f]));assert(captured,'Engine emitted an uncaptured tuple');
   assert.deepEqual(engine.assembledAssets(state).patches[groupIndex].geometry,captured.asset?deskAssetReference(source.code,captured.asset):null);
   assert.deepEqual(engine.parseStateToken(product,engine.stateToken(state)),state);variants++;
   for(const field of group.fields)for(const value of engine.stateChoices(state)[field]){
    const next=engine.changeField(state,field,value);assert.equal(next.anchor,state.anchor);engine.validateState(product,next);queue.push(next);
   }
  }
  assert.equal(seen.size,group.variants.length,'A captured tuple cannot be selected');
 }
 for(const field of Object.keys(context.dimensions))for(const value of engine.stateChoices(initial)[field]){
  const next=engine.changeField(initial,field,value);assert(source.contexts.some(c=>Object.entries(c.dimensions).every(([k,v])=>next.values[k]===v)));
  for(const [textField,domain] of Object.entries(context.textOnly))for(const selected of domain){
   const changed=engine.changeField(engine.changeField(initial,textField,selected),field,value);
   assert.equal(changed.values[textField],selected,'Compatible text-only choice was lost after dimension change');
  }
 }
 coverage.push({dimensions:context.dimensions,groups:context.groups.map(g=>({fields:g.fields,variants:g.variants.length}))});
}
const report={at:new Date().toISOString(),result:'PASS_CURRENT_ENGINE_COMPONENT_TABLE_ONLY',sourceRuntimeSha256:createHash('sha256').update(bytes).digest('hex'),contexts:coverage.length,componentTuplesSelected:variants,textOnlySelections:textSelections,coverage,fullGraphPass:false,browserVerified:false,geometryBytesVerified:false,Launch:false};
await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,coverage:undefined}));
