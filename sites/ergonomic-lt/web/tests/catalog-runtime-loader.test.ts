import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCatalogRuntimeLoader,type CatalogRuntimeIndex} from '../src/lib/catalog-runtime-loader';
import {createCatalogEngine,catalogFamilies} from '../src/lib/catalog-configurator';
import {baseSeed} from '../src/lib/catalog';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const original=catalogFamilies[0],article=original.articles[0],anchor=original.anchors.find(a=>a.article===article.code)!;
 const product=baseSeed().products.find(p=>p.id===original.productId)!;
 const bytes=Buffer.from(JSON.stringify({article,anchors:[anchor],palettes:{}}));
 const asset='/models/configurator/runtime/'+article.code+'-'+hash(bytes).slice(0,20)+'.json';
 const index:CatalogRuntimeIndex={schemaVersion:1,articles:{[article.code]:{asset,sha256:hash(bytes)}},products:{[product.id]:{id:'cfg-0123456789ab',articles:[article]}}};
 return {index,product,article,bytes,asset};
}
test('additional loaders are isolated and rebind the same source article to the exact product and sample',async()=>{
 const {index,product,article,bytes}=fixture();
 const alias={...product,id:'product_exact_alias',modelConfigurationId:'987654',configurations:[{...product.configurations.find(c=>c.id===article.sample)!,id:'987654'}]};
 const aliasIndex=structuredClone(index);aliasIndex.products[alias.id]={id:'cfg-abcdef012345',articles:[{...article,sample:'987654'}]};
 const load=createCatalogRuntimeLoader(index,async()=>bytes),loadAlias=createCatalogRuntimeLoader(aliasIndex,async()=>bytes);
 const [one,two]=await Promise.all([load(product),loadAlias(alias)]);assert(one&&two);
 assert.equal(one.family.productId,product.id);assert.equal(two.family.productId,alias.id);assert.equal(two.family.anchors[0].sample,'987654');
 const engine=createCatalogEngine(one.family),other=createCatalogEngine(two.family);
 const state=engine.catalogInitial(one.family),aliasState=other.catalogInitial(two.family);
 assert.throws(()=>other.catalogValidate(alias,state));assert.throws(()=>engine.catalogValidate(product,aliasState));
 assert.equal(engine.catalogSelection(product,state,()=>[]).configuration.code,article.code);
 assert.equal(other.catalogSelection(alias,aliasState,()=>[]).configuration.id,'987654');
 assert.equal(await load(alias),undefined);
});
test('loader accepts only release-listed articles and never follows a customer supplied asset URL',async()=>{
 const {index,product,bytes,asset}=fixture();const reads:string[]=[];
 const load=createCatalogRuntimeLoader(index,async requested=>{reads.push(requested);return bytes;});
 assert.equal(await load(product,{anchor:'KFORGED:default',asset:'https://arbitrary.invalid/model.json'}),undefined);
 assert.equal(reads.length,0);
 assert(await load(product));assert.deepEqual(reads,[asset]);
});
test('missing model source remains photo-only rather than falling back to a different article',async()=>{
 const {index,product,bytes}=fixture();let reads=0;
 const missing={...product,modelConfigurationId:'123456',configurations:[...product.configurations,{...product.configurations[0],id:'123456',code:'KUNAVAILABLE'}]};
 assert.equal(await createCatalogRuntimeLoader(index,async()=>{reads++;return bytes;})(missing),undefined);assert.equal(reads,0);
});
test('two sample IDs sharing one article keep their exact identity in server quotes and PDF token loading',async()=>{
 const {index,product,article,bytes}=fixture(),secondSample='987654';
 const duplicate={...product,configurations:[...product.configurations,{...product.configurations.find(c=>c.id===article.sample)!,id:secondSample}]};
 index.products[product.id].articles=[{...article,id:'cfg-111111111111'},{...article,sample:secondSample,id:'cfg-222222222222'}];
 const load=createCatalogRuntimeLoader(index,async()=>bytes),client=await load({...duplicate,modelConfigurationId:secondSample});assert(client);
 const state=createCatalogEngine(client.family).catalogInitial(client.family);
 const server=await load(duplicate,state);assert(server);assert.equal(server.family.sample,secondSample);assert.equal(server.family.id,state.family);
 assert.equal(createCatalogEngine(server.family).catalogSelection(duplicate,state,()=>[]).configuration.id,secondSample);
 const pdf=await load(duplicate,JSON.stringify([state.family,state.anchor,Object.entries(state.values)]));assert.equal(pdf?.family.sample,secondSample);
 assert.equal(await load(duplicate,{...state,family:'cfg-333333333333'}),undefined);
});
test('immutable model payload rejects tampering, oversized data, path escapes and mismatched source articles',async()=>{
 const {index,product,bytes}=fixture();
 await assert.rejects(createCatalogRuntimeLoader(index,async()=>Buffer.concat([bytes,Buffer.from(' ')]))(product),/source mismatch/);
 await assert.rejects(createCatalogRuntimeLoader(index,async()=>new Uint8Array(15_000_001))(product),/source mismatch/);
 const unsafe=structuredClone(index);Object.values(unsafe.articles)[0].asset='/models/configurator/runtime/../../secret.json';
 await assert.rejects(createCatalogRuntimeLoader(unsafe,async()=>{throw Error('must not read');})(product),/release binding/);
 const wrong=Buffer.from(JSON.stringify({article:{code:'KWRONG'},anchors:[{article:'KWRONG'}],palettes:{}}));
 const mismatched=structuredClone(index);Object.values(mismatched.articles)[0].sha256=hash(wrong);
 await assert.rejects(createCatalogRuntimeLoader(mismatched,async()=>wrong)(product),/article mismatch/);
});

test('legacy runtime accepts the exact 15 MB boundary and rejects one additional byte even with a valid SHA',async()=>{
 const {index,product,bytes}=fixture();
 for(const size of [8_000_001,15_000_000,15_000_001]){
  const padded=Buffer.concat([bytes,Buffer.alloc(size-bytes.length,32)]),copy=structuredClone(index);
  Object.values(copy.articles)[0].sha256=hash(padded);
  const loader=createCatalogRuntimeLoader(copy,async()=>padded);
  if(size<=15_000_000)assert(await loader(product));
  else await assert.rejects(loader(product),/source mismatch/);
 }
});
