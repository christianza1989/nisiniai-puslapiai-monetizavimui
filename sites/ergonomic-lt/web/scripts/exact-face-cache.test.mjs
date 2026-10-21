import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {exactPrimitiveCache} from './exact-face-cache.mjs';
const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const attribute=(array,type='VEC3',normalized=false)=>({getArray:()=>array,getType:()=>type,getNormalized:()=>normalized,getElementSize:()=>3});
const data=()=>[['POSITION',attribute(new Float32Array([0,0,0,1,0,0,0,1,0]))],['NORMAL',attribute(new Float32Array([0,0,1,0,0,1,0,0,1]))]];
function original(attributes,count,indices,m,material){
 const values=attributes.map(([k,a])=>[k,a.getArray(),a.getElementSize(),a.getNormalized()]);
 const keys=Array.from({length:count},(_,i)=>JSON.stringify(values.map(([k,a,size,n])=>[k,n,Array.from(a.slice(i*size,(i+1)*size))]))),faces=[];
 for(let i=0;i<indices.length;i+=3){const t=[keys[indices[i]],keys[indices[i+1]],keys[indices[i+2]]];faces.push([t.join('|'),[t[1],t[2],t[0]].join('|'),[t[2],t[0],t[1]].join('|')].sort()[0]);}
 return createHash('sha256').update(JSON.stringify([m,attributes.map(([k,a])=>[k,a.getType(),a.getNormalized()]),faces.sort(),material])).digest('hex');
}
test('equal complete buffers reuse the exact legacy fingerprint',()=>{
 const c=exactPrimitiveCache(),indices=new Uint16Array([0,1,2]),a=data();
 assert.equal(c.fingerprint(a,3,indices,matrix,'pbr'),original(a,3,indices,matrix,'pbr'));
 assert.equal(c.fingerprint(data(),3,new Uint16Array(indices),matrix,'pbr'),original(a,3,indices,matrix,'pbr'));
 assert.deepEqual(c.stats,{hits:1,misses:1});
});
for(const change of ['position','normal','normalization','type','semantic','winding','transform','material'])test(change+' cannot borrow a previous primitive proof',()=>{
 const c=exactPrimitiveCache(),a=data(),indices=new Uint16Array([0,1,2]),m=[...matrix];let material='pbr';c.fingerprint(data(),3,indices,matrix,'pbr');
 if(change==='position')a[0][1].getArray()[0]=0.25;
 if(change==='normal')a[1][1].getArray()[0]=0.25;
 if(change==='normalization')a[1][1]=attribute(a[1][1].getArray(),'VEC3',true);
 if(change==='type')a[1][1]=attribute(a[1][1].getArray(),'OTHER');
 if(change==='semantic')a[1][0]='TANGENT';
 if(change==='winding')indices.set([0,2,1]);
 if(change==='transform')m[12]=0.125;
 if(change==='material')material='different-full-PBR';
 assert.equal(c.fingerprint(a,3,indices,m,material),original(a,3,indices,m,material));assert.deepEqual(c.stats,{hits:0,misses:2});
});
test('index and attribute buffer view offsets are exact',()=>{
 const c=exactPrimitiveCache(),a=data(),indexStorage=new Uint16Array([999,0,1,2,999]),indices=indexStorage.subarray(1,4);
 assert.equal(c.fingerprint(a,3,indices,matrix,'pbr'),original(a,3,indices,matrix,'pbr'));
 assert.equal(c.fingerprint(data(),3,new Uint16Array([0,1,2]),matrix,'pbr'),original(a,3,indices,matrix,'pbr'));assert.equal(c.stats.hits,1);
});
