import {createHash} from 'node:crypto';

// Cache the unchanged oriented-face fingerprint only after hashing all typed
// attribute/index bytes, their interpretation, exact transform and full PBR.
// Finite values, index validity, bounds and whole-file SHA remain caller checks.
export function exactPrimitiveCache(){
 const entries=new Map(),stats={hits:0,misses:0};
 return {stats,fingerprint(attributes,count,indices,matrix,material){
  const digest=createHash('sha256');
  digest.update(JSON.stringify([count,attributes.map(([k,a])=>[k,a.getType(),a.getNormalized(),a.getElementSize(),a.getArray().constructor.name,a.getArray().byteLength]),indices.constructor.name,indices.length]));
  for(const [,a] of attributes){const v=a.getArray();digest.update(Buffer.from(v.buffer,v.byteOffset,v.byteLength));}
  if(ArrayBuffer.isView(indices))digest.update(Buffer.from(indices.buffer,indices.byteOffset,indices.byteLength));
  else digest.update(JSON.stringify(indices));
  digest.update(JSON.stringify([matrix,material]));
  const key=digest.digest('hex');
  if(entries.has(key)){stats.hits++;return entries.get(key);}
  stats.misses++;
  const values=attributes.map(([k,a])=>[k,a.getArray(),a.getElementSize(),a.getNormalized()]);
  const keys=Array.from({length:count},(_,i)=>JSON.stringify(values.map(([k,a,size,normalized])=>[k,normalized,Array.from(a.slice(i*size,(i+1)*size))]))),faces=[];
  for(let i=0;i<indices.length;i+=3){
   const t=[keys[indices[i]],keys[indices[i+1]],keys[indices[i+2]]];
   // Preserve the original three complete oriented rotations and lexical sort.
   faces.push([t.join('|'),[t[1],t[2],t[0]].join('|'),[t[2],t[0],t[1]].join('|')].sort()[0]);
  }
  const fingerprint=createHash('sha256').update(JSON.stringify([matrix,attributes.map(([k,a])=>[k,a.getType(),a.getNormalized()]),faces.sort(),material])).digest('hex');
  entries.set(key,fingerprint);return fingerprint;
 }};
}
