import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {modelProduct} from '../src/lib/product-models';
import seed from '../content/seed.json';
import type {Product} from '../src/lib/types';
import type {CatalogRuntime} from '../src/lib/catalog-configurator';
const option=(n:string)=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3)!;
const directory=option('prepared'),source=option('source');
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const runtime=read(path.join(directory,'runtime.json')) as CatalogRuntime;
const cp=read(path.join(source,'CHECKPOINT.json'));
const parent=(seed.products as unknown as Product[]).find(p=>p.id===runtime.family.productId)!;
const sample=parent.configurations.find(c=>c.id===runtime.family.sample)!;
const product=modelProduct(parent,sample),engine=createExpandedEngine(runtime);
const native=new Map<string,any>(Object.entries(cp.states).map(([k,v]:any)=>[k,read(path.join(source,v.file))]));
const key=(anchor:string)=>anchor.split(':structure-')[1];
const states=new Map<string,any>();let transitions=0;
for(const a of runtime.family.anchors){
 const s=engine.catalog.catalogInitial(runtime.family as any,a.article);
 // Test every canonical measured anchor, not only the initial one.
 const input={...s,anchor:a.id,values:Object.fromEntries(a.axes.map(k=>[k,a.defaults[k]]).sort(([a],[b])=>a.localeCompare(b)))};
 const selected=engine.expandedSelection(product,input),snapshot=native.get(key(a.id));assert(snapshot);
 assert.deepEqual(engine.validateState(product,selected.state),selected.state);
 const expected=Object.fromEntries(Object.entries(snapshot.choices as Record<string,any[]>).filter(([f])=>/_OPTIONS\.|_DIMENSIONS\./.test(f)&&snapshot.properties[f]?.visible&&snapshot.properties[f]?.editable).map(([f,v])=>[f.split('.').at(-1)!,v.filter(v=>v.selectable!==false).map(v=>v.value)]));
 assert.deepEqual(engine.stateChoices(selected.state),expected,'Only exact Native construction domains');
 assert(!Object.keys(engine.stateChoices(selected.state)).some(f=>a.classes[f]?.endsWith('_FINISHES')));
 assert.equal(selected.configuration.id,sample.id);assert.equal(selected.configuration.code,sample.code);
 assert.equal(selected.assets.base.assetSha256,snapshot.geometry.sha256);assert.deepEqual(selected.assets.patches,[]);
 for(const [field,cls] of Object.entries(a.classes))assert(selected.configuration.supplierOptions!.includes(cls+'.'+field+'='+(field==='CPRICEGROUP'?a.defaults[field].replace(/^_/,''):a.defaults[field])),'Exact Native supplier code '+field);
 states.set(key(a.id),selected.state);
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(selected.state)),selected.state);
}
for(const edge of cp.edges){
 const sourceState=states.get(edge.from),target=engine.changeField(sourceState,edge.field.split('.').at(-1),edge.requested);
 assert.equal(key(target.anchor),edge.to);assert.deepEqual(target,states.get(edge.to));transitions++;
}
const bytes=fs.readFileSync(path.join(directory,'runtime.json'));
const proof={at:new Date().toISOString(),result:'PASS',states:states.size,transitions,modelId:sample.id,code:sample.code,productId:product.id,
 runtimeSha256:createHash('sha256').update(bytes).digest('hex'),roundTrips:true,fullSupplierOptions:true,finishSelectors:0,modelPrepared:false};
fs.writeFileSync(path.join(directory,'RUNTIME-PROOF.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
