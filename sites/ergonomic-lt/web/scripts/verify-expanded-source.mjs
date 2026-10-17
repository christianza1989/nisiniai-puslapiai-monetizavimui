import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {parts,compact} from './configurator-geometry.mjs';
const source=path.resolve('../research/configurator/expanded-source'),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const data=JSON.parse(await fs.readFile('content/configurator-expanded.json','utf8')),results=[],cache=new Map();
async function read(ref){if(!cache.has(ref.file))cache.set(ref.file,parts(compact(await io.read(path.join(source,ref.file)))));return cache.get(ref.file);}
for(const name of (await fs.readdir(source)).filter(n=>n.startsWith('combined-')&&n.endsWith('.json'))){
 const s=JSON.parse(await fs.readFile(path.join(source,name),'utf8')),a=data.families.find(f=>f.id===s.family).anchors.find(a=>a.id===s.anchor);
 const original=JSON.parse(await fs.readFile(path.join(source,s.family,s.anchor+'.json'),'utf8'));
 const base=await read(original.geometry),map=new Map(base.map(p=>[p.id,p.material]));
 const entries=Object.entries(s.selection).sort(([k],[l])=>(k==='CMECHANISM'?-1:k==='CARMRESTS'?1:0)-(l==='CMECHANISM'?-1:l==='CARMRESTS'?1:0));
 for(const [k,v] of entries){
  const joint=k==='CARMRESTS'?original.conditionalArms?.[s.selection.CMECHANISM+'|'+v]:null;
  const capture=joint||original.patches[Object.keys(original.patches).find(key=>key.endsWith('.'+k+'='+v))];if(!capture)continue;
  const basis=joint?await read(original.patches[Object.keys(original.patches).find(key=>key.endsWith('.CMECHANISM='+s.selection.CMECHANISM))].geometry):base;
  const basisMap=new Map(basis.map(p=>[p.id,p.material])),alternative=await read(capture.geometry),altMap=new Map(alternative.map(p=>[p.id,p.material]));
  const remove=basis.filter(p=>!altMap.has(p.id)||altMap.get(p.id)!==p.material).map(p=>p.id),added=alternative.filter(p=>!basisMap.has(p.id)||basisMap.get(p.id)!==p.material);
  const declared=joint?a.conditionalPatches[s.selection.CMECHANISM+'|'+v]:a.patches[k+'='+v];
  assert.deepEqual(declared.remove,remove);assert.deepEqual(declared.addIds,added.map(p=>p.id));
  for(const id of remove)map.delete(id);
  for(const p of added){assert(!map.has(p.id),'Duplicate part '+p.id);map.set(p.id,p.material);}
 }
 const actual=await read(s.geometry),sort=m=>[...m.entries()].sort(([a],[b])=>a.localeCompare(b));
 assert.deepEqual(sort(map),sort(new Map(actual.map(p=>[p.id,p.material]))),'Composition mismatch: '+name);
 results.push({family:s.family,anchor:s.anchor,changedFields:entries.length,parts:actual.length,matched:true});
}
const prep=JSON.parse(await fs.readFile('../research/configurator/expanded-preparation-report.json','utf8'));assert(prep.every(p=>p.conflicts.length===0));assert.equal(results.length,4);
await fs.writeFile('../research/configurator/expanded-source-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),results,disjointPatches:prep.length},null,2));console.log(JSON.stringify(results));
