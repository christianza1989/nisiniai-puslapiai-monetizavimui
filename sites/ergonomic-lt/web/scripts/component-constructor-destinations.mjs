import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parts} from './configurator-geometry.mjs';
const read=p=>fs.readFile(p,'utf8').then(JSON.parse);
export async function componentConstructorDestinations(family,source,load,defaults){
 for(const article of family.articles){
  let evidence;try{evidence=await read(path.join(source,article.code,'constructor-destinations.json'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  assert.equal(evidence.article,article.code);assert.equal(evidence.schemaVersion,1);
  for(const row of evidence.rows){
   const a=family.anchors.find(a=>a.id===row.from&&a.article===article.code),target=family.anchors.find(a=>a.id===row.to&&a.article===article.code);assert(a&&target&&a!==target);
   const matches=a.components.flatMap(c=>c.variants.filter(v=>v.key===row.variant));assert.equal(matches.length,1);const variant=matches[0];
   const fromDir=path.join(source,article.code,a.id.split(':').slice(1).join(':')),toDir=path.join(source,article.code,target.id.split(':').slice(1).join(':'));
   const before=await read(path.join(fromDir,row.source)),after=await read(path.join(toDir,row.destination)),va=defaults(before),vb=defaults(after);
   assert.deepEqual(va,vb,'Captured destination preserves every native option and finish code');
   for(const k of target.axes){assert.equal(va[k],target.defaults[k]);assert.equal(variant.defaults[k]??a.defaults[k],va[k]);}
   for(const [k,v] of Object.entries(variant.values))assert.equal(va[k],v);
   const original=parts(await load(before,fromDir)),destination=parts(await load(after,toDir));
   assert.deepEqual(destination.map(p=>[p.id,p.material]).sort(),original.map(p=>[p.id,p.material]).sort(),'Measured constructor destination has identical native surfaces and materials');
   variant.destinationAnchor=target.id;
  }
 }
 return family;
}
