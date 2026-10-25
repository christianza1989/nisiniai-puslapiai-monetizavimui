import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import index from '../content/configurator-additional-index.json';
import {createCatalogEngine,type CatalogFamily} from '../src/lib/catalog-configurator';
import type {Product} from '../src/lib/types';
import type {Asset} from '../src/lib/expanded-configurator';

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const cache=new Map<string,Promise<{id:string;field?:string}[]>>();
async function nodes(asset:Asset){
 if(!cache.has(asset.asset))cache.set(asset.asset,(async()=>{
  const bytes=await fs.readFile('public'+asset.asset);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.assetSha256);
  const document=await io.readBinary(bytes);
  return document.getRoot().listNodes().filter(node=>node.getMesh()).map(node=>({id:node.getName(),field:node.getExtras().finishField as string|undefined}));
 })());
 return cache.get(asset.asset)!;
}
for(const code of ['KNAU015WW001','KNAU016WW001'] as const)test(code+' retains real front/back finish bindings after choosing 810mm height',async()=>{
 await MeshoptDecoder.ready;
 const shard=JSON.parse(await fs.readFile('public'+index.articles[code].asset,'utf8'));
 const family={id:'measured-naudu-'+code,kind:'catalog',productId:'role-fixture-'+code,baseArticle:code,sample:shard.article.sample,articles:[shard.article],anchors:shard.anchors} as CatalogFamily;
 const engine=createCatalogEngine(family),anchor=family.anchors.find(a=>a.id===code+':_4--_4')!;assert(anchor);
 const product={id:family.productId,configurations:[{id:shard.article.sample,code}]} as Product;
 family.anchors=[anchor,...family.anchors.filter(a=>a!==anchor)];
 let state=engine.catalogValidate(product,engine.catalogInitial(family,code));
 for(const [field,value] of [['CUPHGROUPINTBACKSEAT','CUZ'],['CUPHBACKRESTFRONTCOLOR','CUZ4S'],['CUPHBACKRESTBACKCOLOR','CUZ1R']])state=engine.catalogChange(state,field,value);
 for(const height of ['_660','_810']){
  state=engine.catalogChange(state,'DSEATHEIGHT',height);
  const values=engine.catalogValues(state);assert.equal(values.CUPHBACKRESTFRONTCOLOR,'CUZ4S');assert.equal(values.CUPHBACKRESTBACKCOLOR,'CUZ1R');
  const assets=engine.catalogAssets(state),visible=new Map((await nodes(assets.base)).map(node=>[node.id,node]));
  for(const patch of assets.patches){for(const id of patch.remove)visible.delete(id);for(const asset of patch.geometries||(patch.geometry?[patch.geometry]:[]))for(const node of await nodes(asset))visible.set(node.id,node);}
  const roles=[...visible.values()].map(node=>node.field).filter(field=>field?.startsWith('CUPH')).sort();
  assert.deepEqual(roles,['CUPHBACKRESTBACKCOLOR','CUPHBACKRESTFRONTCOLOR','CUPHBACKRESTFRONTCOLOR'],height+' visible source upholstery surfaces must retain independent chosen finishes');
 }
});
