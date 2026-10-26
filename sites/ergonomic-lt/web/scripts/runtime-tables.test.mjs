import test from 'node:test';
import assert from 'node:assert/strict';
import {packRuntimeTables,unpackRuntimeTables,RUNTIME_TABLE_FORMAT} from '../src/lib/runtime-tables.mjs';
test('tables retain every JSON value, key and array position; equal subtrees share immutable data',()=>{
 const shared={axes:['A'],defaults:{A:'NONE',FINISH:'RX113'},choices:{A:['NONE','x']},geometry:{asset:'original.glb',sha256:'abc'}};
 const input={family:{id:'model',anchors:[{id:'a',...shared},{id:'b',...shared}]},values:[null,false,true,0,-0,3.125,'',[],{},JSON.parse('{"__proto__":{"safe":true},"constructor":"value"}')]};
 const encoded=JSON.parse(JSON.stringify(packRuntimeTables(input))),decoded=unpackRuntimeTables(encoded);
 assert.deepEqual(decoded,input);assert.equal(decoded.family.anchors[0].defaults,decoded.family.anchors[1].defaults);
 assert.equal(Object.getPrototypeOf(decoded.values.at(-1)),Object.prototype);assert.equal({}.safe,undefined);
 assert.deepEqual(packRuntimeTables(input),encoded);
});
test('runtime tables reject cycles, forward/missing references, duplicate keys and unknown tags',()=>{
 for(const nodes of [[[0,0]],[[0,9]],['k',1,[1,0,1,0,1]],[[3]],[[2,0]],[[1,0]],[[0,-1]]])assert.throws(()=>unpackRuntimeTables({format:RUNTIME_TABLE_FORMAT,nodes,root:nodes.length-1}),/Invalid/);
 assert.throws(()=>unpackRuntimeTables({format:RUNTIME_TABLE_FORMAT,nodes:[null],root:0,extra:true}),/Invalid/);
 assert.throws(()=>unpackRuntimeTables({format:'unknown',nodes:[null],root:0}),/Invalid/);
 assert.throws(()=>unpackRuntimeTables({format:RUNTIME_TABLE_FORMAT,nodes:[null],root:1}),/Invalid/);
 const nodes=[null];for(let i=0;i<130;i++)nodes.push([0,i]);assert.throws(()=>unpackRuntimeTables({format:RUNTIME_TABLE_FORMAT,nodes,root:130}),/Invalid/);
 for(const input of [undefined,NaN,Infinity,()=>0,new Date(),Array(3)])assert.throws(()=>packRuntimeTables(input),/Invalid/);
});
