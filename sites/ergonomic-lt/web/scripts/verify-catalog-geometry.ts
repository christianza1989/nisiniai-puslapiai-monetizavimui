import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO,type Node} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import fixtures from '../content/configurator-catalog-fixtures.json';
import {catalogAssets} from '../src/lib/catalog-configurator';
import {parts,compact} from './configurator-geometry.mjs';
async function main(){
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
function measured(node:Node){
 const matrix=node.getWorldMatrix(),low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];let area=0,triangles=0;
 for(const primitive of node.getMesh()!.listPrimitives()){
  const position=primitive.getAttribute('POSITION')!,vertices:number[][]=[];
  for(let i=0;i<position.getCount();i++){
   const v=position.getElement(i,[]),w=[0,1,2].map(k=>matrix[k]*v[0]+matrix[k+4]*v[1]+matrix[k+8]*v[2]+matrix[k+12]);
   vertices.push(w);for(let k=0;k<3;k++){low[k]=Math.min(low[k],w[k]);high[k]=Math.max(high[k],w[k]);}
  }
  const indices=primitive.getIndices()!.getArray()!;triangles+=indices.length/3;
  for(let i=0;i<indices.length;i+=3){const a=vertices[indices[i]],b=vertices[indices[i+1]],c=vertices[indices[i+2]],u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);area+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;}
 }
 return {low,high,area,triangles};
}
const cache=new Map<string,Map<string,ReturnType<typeof measured>>>();
async function output(asset:string){if(!cache.has(asset)){const doc=await io.read(path.join('public',asset));cache.set(asset,new Map(doc.getRoot().listNodes().filter(n=>n.getMesh()).map(n=>[n.getName(),measured(n)])));}return cache.get(asset)!;}
const report=[];
for(const proof of fixtures as any[]){
 const state={family:proof.family,anchor:proof.anchor,values:proof.values},assembly=catalogAssets(state);assert(assembly.base);const actual=new Map(await output(assembly.base.asset));
 for(const patch of assembly.patches){for(const id of patch.remove)actual.delete(id);for(const asset of [...(patch.geometry?[patch.geometry]:[]),...(patch.geometries||[])])for(const [id,stats] of await output(asset.asset))actual.set(id,stats);}
 const [article,anchor]=proof.anchor.split(':'),folder=path.resolve('../research/configurator/batch-10-source',article,anchor),capture=JSON.parse(await fs.readFile(path.join(folder,'combined.json'),'utf8'));
 const sourceFile=capture.geometry.file.includes('/')?path.resolve('../research/configurator/batch-10-source',capture.geometry.file):path.join(folder,capture.geometry.file);
 const original=parts(compact(await io.read(sourceFile)));assert.equal(actual.size,original.length,proof.anchor+' physical part count');
 let maxPositionError=0,maxAreaError=0;
 for(const part of original){const before=measured(part.node),after=actual.get(part.id);assert(after,proof.anchor+' missing '+part.id);assert.equal(after.triangles,before.triangles,part.id+' triangles');
  const error=Math.max(...before.low.map((v,k)=>Math.abs(v-after.low[k])),...before.high.map((v,k)=>Math.abs(v-after.high[k]))),areaError=Math.abs(before.area-after.area)/Math.max(before.area,1e-8);
  maxPositionError=Math.max(maxPositionError,error);maxAreaError=Math.max(maxAreaError,areaError);
  assert(error<0.00006,proof.anchor+' world transform/shape '+part.id+' '+error);assert(areaError<0.002,proof.anchor+' surface area '+part.id+' '+areaError);
 }
 const record={family:proof.family,article,anchor,parts:actual.size,maxPositionError,maxAreaError,passed:true};report.push(record);console.log(proof.anchor,'physical output verified');
}
await fs.writeFile('../research/configurator/batch-10/packed-geometry-verification.json',JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
