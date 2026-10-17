import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shareCatalogRuntimeData} from '../src/lib/catalog-runtime-sharing';
import index from '../content/configurator-additional-index.json';

test('Sharing preserves every JSON value, order and distinct source descriptor',()=>{
 const input={a:{asset:'/a.glb',assetSha256:'abc',partIds:['seat']},b:{asset:'/a.glb',assetSha256:'abc',partIds:['seat']},c:{asset:'/a.glb',assetSha256:'abc',partIds:['back']},numbers:[0,-0,1,null,true,'1'],empty:[[],{}]};
 const before=JSON.stringify(input),result=shareCatalogRuntimeData(input);
 assert.equal(JSON.stringify(result),before);assert.deepEqual(result,input);assert.equal(result.a,result.b);assert.notEqual(result.a,result.c);assert(Object.is(result.numbers[1],-0));
 assert.notEqual(shareCatalogRuntimeData(input).a,result.a,'No state retained between requests');
 assert.notEqual(result.a,input.a,'Original source is not mutated or reused');
});

test('Large real Flesco data retains exact content while repeated assets share references',()=>{
 const receipt=index.articles.KFLS001WW001;assert(receipt);
 const source=JSON.parse(fs.readFileSync('public'+receipt.asset,'utf8'));
 const before=JSON.stringify(source),result=shareCatalogRuntimeData(source);
 assert.equal(JSON.stringify(source),before);assert.equal(JSON.stringify(result),before);
 const assets=new Map<string,unknown>();let total=0,duplicates=0;
 function inspect(value:any){if(!value||typeof value!=='object')return;
  if(typeof value.asset==='string'&&typeof value.assetSha256==='string'){
   const key=JSON.stringify(value);total++;if(assets.has(key)){assert.equal(value,assets.get(key));duplicates++;}else assets.set(key,value);
  }
  for(const child of Object.values(value))inspect(child);
 }
 inspect(result);assert(total>100);assert(duplicates>total/2,`Expected substantial repeated assets; ${duplicates}/${total}`);
});
