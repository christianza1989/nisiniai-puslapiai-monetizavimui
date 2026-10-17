// Literal measured graph -> existing catalogue runtime. Complete original GLB
// scenes are copied unchanged; no factorized PBR reconstruction is required.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {hash,materialFingerprint} from './configurator-geometry.mjs';
import {verifiedInspectionCache} from './verified-inspection-cache.mjs';

const option=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const source=path.resolve(option('source')),output=path.resolve(option('output')),inventory=JSON.parse(await fs.readFile(option('inventory'),'utf8'));
const cp=JSON.parse(await fs.readFile(path.join(source,'CHECKPOINT.json'),'utf8')),job=inventory.queue.find(j=>j.job===cp.job);
assert(job?.modelKeys.length===1,'One exact active initial variant per literal runtime');
assert.equal(JSON.parse(await fs.readFile(path.join(source,'WIRE-PROOF.json'),'utf8')).result,'PASS');
await MeshoptDecoder.ready;
const io=new NodeIO().setLogger(new Logger(Verbosity.ERROR)).registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const short=k=>k.split('.').at(-1),structural=k=>/_OPTIONS\.|_DIMENSIONS\./.test(k);
const inside=relative=>{const p=path.resolve(source,relative);assert(p.startsWith(source+path.sep));return p;};
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));

function inspect(doc){
 const primitiveFingerprints=[],materials=[],bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let triangles=0;
 for(const node of doc.getRoot().listNodes()){
  const mesh=node.getMesh();if(!mesh)continue;
  const matrix=node.getWorldMatrix();assert(matrix.every(Number.isFinite));
  for(const p of mesh.listPrimitives()){
   assert.equal(p.getMode(),4,'Only reviewed triangular Native primitives');
   const attributes=p.listSemantics().sort().map(k=>[k,p.getAttribute(k)]),position=p.getAttribute('POSITION');assert(position);
   const count=position.getCount();for(const [,a] of attributes){assert.equal(a.getCount(),count);assert([...a.getArray()].every(Number.isFinite));}
   const values=attributes.map(([k,a])=>[k,a.getArray(),a.getElementSize(),a.getNormalized()]);
   const indices=p.getIndices()?.getArray()||Array.from({length:count},(_,i)=>i);assert.equal(indices.length%3,0);
   assert([...indices].every(i=>Number.isInteger(i)&&i>=0&&i<count));triangles+=indices.length/3;
   const vertex=i=>JSON.stringify(values.map(([k,a,size,normalized])=>[k,normalized,Array.from(a.slice(i*size,(i+1)*size))]));
   const keys=Array.from({length:count},(_,i)=>vertex(i)),faces=[];
   for(let i=0;i<indices.length;i+=3){const t=[keys[indices[i]],keys[indices[i+1]],keys[indices[i+2]]];faces.push([t.join('|'),[t[1],t[2],t[0]].join('|'),[t[2],t[0],t[1]].join('|')].sort()[0]);}
   faces.sort();const material=materialFingerprint(p.getMaterial());materials.push(material);
   primitiveFingerprints.push(hash(JSON.stringify([matrix,attributes.map(([k,a])=>[k,a.getType(),a.getNormalized()]),faces,material])));
   const a=position.getArray();for(let i=0;i<a.length;i+=3){const x=a[i],y=a[i+1],z=a[i+2];const world=[matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]];for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],world[k]);bounds.max[k]=Math.max(bounds.max[k],world[k]);}}
  }
 }
 assert(primitiveFingerprints.length&&triangles>0);assert(bounds.max.every((v,k)=>Number.isFinite(v)&&v>=bounds.min[k]));
 return {fingerprint:hash(JSON.stringify(primitiveFingerprints.sort())),primitives:primitiveFingerprints.length,triangles,bounds,materials:hash(JSON.stringify(materials.sort()))};
}

const verified=verifiedInspectionCache(async raw=>inspect(await io.readBinary(raw)));
await fs.mkdir(path.join(output,'assets'),{recursive:true});
const states=new Map(),assets=new Map(),checks=[];
for(const [key,ref] of Object.entries(cp.states)){
 const bytes=await fs.readFile(inside(ref.file));assert.equal(hash(bytes),ref.sha256);const s=JSON.parse(bytes);assert.equal(s.stateKey,key);
 const raw=await fs.readFile(inside(s.geometry.file));assert.equal(hash(raw),s.geometry.sha256);assert.equal(raw.length,s.geometry.bytes);
 const inspection=await verified.inspect(raw,s.geometry.sha256),name=job.code+'-'+hash(raw).slice(0,20)+'.glb';
 await fs.writeFile(path.join(output,'assets',name),raw);
 const reread=await fs.readFile(path.join(output,'assets',name));assert.equal(hash(reread),hash(raw));assert.deepEqual(await verified.inspect(reread,s.geometry.sha256),inspection);
 assets.set(key,{asset:'/models/configurator/structure/'+name,assetSha256:hash(raw),bytes:raw.length});states.set(key,s);checks.push({state:key,...inspection,bytesUnchanged:true});
}
// Every new transition, even one returning to an existing state, has its own
// complete Native export. Compare all of them, including all vertex attributes,
// oriented faces, transforms, five PBR channels/scalars/samplers/texture transforms.
for(const file of (await fs.readdir(path.join(source,'observations'))).filter(f=>f.endsWith('.json'))){
 const s=await read(path.join(source,'observations',file)),raw=await fs.readFile(inside(s.geometry.file));assert.equal(hash(raw),s.geometry.sha256);
 const expected=checks.find(c=>c.state===s.stateKey);assert(expected);const actual=await verified.inspect(raw,s.geometry.sha256);
 for(const key of ['fingerprint','primitives','triangles','bounds','materials'])assert.deepEqual(actual[key],expected[key],'Full Native observation '+key);
}
const [productId,sample]=job.modelKeys[0].split(':'),familyId='cfg-'+hash(job.modelKeys[0]).slice(0,12),id=key=>job.code+':structure-'+key;
const palettes={_fieldLabels:{}};
const anchors=[...states].sort(([a],[b])=>a===cp.initial?-1:b===cp.initial?1:a.localeCompare(b)).map(([key,s])=>{
 const defaults={},classes={},choices={},sourceDimensions={};
 const explicit=new Set(job.originalVariant.split(';').filter(Boolean).map(v=>v.split('=')[0]));
 for(const [field,p] of Object.entries(s.properties)){
  if(!/_OPTIONS\.|_FINISHES\.|_DIMENSIONS\./.test(field))continue;
  const k=short(field);assert(!Object.hasOwn(defaults,k),'Duplicate short source field');defaults[k]=p.value;
  if(field.includes('_DIMENSIONS.'))sourceDimensions[k]={value:p.value,text:p.text};
  if(!field.includes('_DIMENSIONS.')||explicit.has(field)||s.choices[field]&&p.visible&&p.editable)classes[k]=field.split('.')[0];
  palettes._fieldLabels[k]={text:p.label||k};palettes[k]||={};palettes[k][p.value]={text:p.text||p.value};
  if(structural(field)&&p.visible&&p.editable){assert(s.choices[field],'Unbounded dimension requires review');choices[k]=s.choices[field].filter(v=>v.selectable!==false).map(v=>v.value);for(const v of s.choices[field])palettes[k][v.value]={text:v.text||v.value};}
 }
 const axisTransitions={},axisValueChanges={};
 for(const edge of cp.edges.filter(e=>e.from===key)){
  assert(edge.measured===true&&structural(edge.field));assert.equal(edge.requestedApplied,true,'Unreachable construction value requires owner report, no activation');
  const control=short(edge.field)+'='+edge.requested;axisTransitions[control]=id(edge.to);
  axisValueChanges[control]=Object.fromEntries(Object.entries(states.get(edge.to).properties).filter(([k])=>/_OPTIONS\.|_FINISHES\.|_DIMENSIONS\./.test(k)).map(([k,p])=>[short(k),p.value]));
 }
 for(const [field,domain] of Object.entries(choices))for(const value of domain)if(value!==defaults[field])assert(axisTransitions[field+'='+value],'Missing real construction transition');
 return {id:id(key),article:job.code,sample,name:job.code,axes:Object.keys(choices),axisTransitions,axisValueChanges,defaults,choices,classes,
   geometry:assets.get(key),components:[],profiles:[],sourceDimensions,collectionMode:'structure-only'};
});
const runtime={family:{id:familyId,kind:'catalog',productId,baseArticle:job.code,sample,articles:[{code:job.code,sample,name:job.code}],anchors,collectionMode:'structure-only'},palettes};
await fs.writeFile(path.join(output,'runtime.json'),JSON.stringify(runtime));
await fs.writeFile(path.join(output,'FACTS.private.json'),JSON.stringify({job,states:[...states].map(([key,s])=>({key,properties:s.properties,choices:s.choices,sourceDescription:s.sourceDescription,sourceOrderText:s.sourceOrderText}))},null,2));
await fs.writeFile(path.join(output,'GEOMETRY-PBR-PROOF.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',job:job.job,code:job.code,checks,originalScenesPreserved:true,
  verifiedByteReuse:{...verified.stats,basis:'Every complete source/staged/observation file is SHA256 checked before lookup. Only byte-identical files share a full geometric/PBR inspection; every distinct byte sequence is fully inspected.'},
  comparison:'All vertex attributes, oriented triangles, exact node world transforms, all five PBR maps/scalars/samplers/KHR_texture_transform; source and staged GLB bytes identical',
  dimensionEvidence:'Full source DIMENSIONS preserved and source/staged world bounds identical. Technical ranges are not asserted to equal one posed scene extent.',runtimeAccepted:false,textAccepted:false},null,2));
console.log(JSON.stringify({job:job.job,states:states.size,geometryPbr:'PASS',runtime:path.join(output,'runtime.json'),modelPrepared:false}));
