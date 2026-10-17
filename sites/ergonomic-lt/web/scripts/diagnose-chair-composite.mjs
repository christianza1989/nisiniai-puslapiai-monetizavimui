// Read-only geometry diagnosis while another worker owns conversion of an
// article. The report is research evidence, never a released runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {parts,compact,hash} from './configurator-geometry.mjs';
const option=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const code=option('article'),anchor=option('anchor');
assert(/^K[A-Z0-9]+$/.test(code||''));assert(anchor&&!anchor.includes('..')&&!/[\\/]/.test(anchor));
const root=path.resolve('../research/configurator/all-chairs-20261014');
const source=path.join(root,'source-v3'),directory=path.join(source,code,anchor);
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
async function geometry(state){
 const file=state.geometry.file.includes('/')?path.join(source,state.geometry.file):path.join(directory,state.geometry.file);
 const bytes=await fs.readFile(file);assert.equal(hash(bytes),state.geometry.sha256);return parts(compact(await io.readBinary(bytes)));
}
const base=await read(path.join(directory,'base.json')),fixture=await read(path.join(directory,'combined.json'));
const plan=await read(path.join(directory,'component-plan.json')),capture=await read(path.join(directory,'manifest.json'));
const baseline=await geometry(base),original=new Map(baseline.map(p=>[p.id,p])),assembled=new Map(original),owners=new Map();
const checks=[];
for(const [index,fields] of plan.groups.entries()){
 let selected=base,selectedFile='base.json';
 if(fields.length>1){
  const component=await read(path.join(directory,'component-'+index,'manifest.json'));selected=null;
  for(const record of Object.values(component.records)){
   const state=await read(path.join(directory,'component-'+index,record.file));
   if(fields.every(k=>state.properties[k]?.value===fixture.properties[k]?.value)){selected=state;selectedFile='component-'+index+'/'+record.file;break;}
  }
 }else if(base.properties[fields[0]]?.value!==fixture.properties[fields[0]]?.value){
  const key=fields[0].split('.').at(-1)+'='+fixture.properties[fields[0]]?.value;
  selectedFile=capture.options[key];selected=selectedFile?await read(path.join(directory,selectedFile)):null;
 }
 assert(selected,'Missing source component for '+fields.join('+'));
 const actual=await geometry(selected),actualIds=new Map(actual.map(p=>[p.id,p]));
 const removed=baseline.filter(p=>!actualIds.has(p.id)||actualIds.get(p.id).material!==p.material);
 const added=actual.filter(p=>!original.has(p.id)||original.get(p.id).material!==p.material);
 for(const p of removed)assembled.delete(p.id);
 for(const p of added){assembled.set(p.id,p);owners.set(p.id,fields.map(k=>k.split('.').at(-1)));}
 checks.push({fields:fields.map(k=>k.split('.').at(-1)),selectedFile,removed:removed.length,added:added.length});
}
const actual=await geometry(fixture),actualIds=new Set(actual.map(p=>p.id));
const missing=actual.filter(p=>!assembled.has(p.id)),extra=[...assembled.values()].filter(p=>!actualIds.has(p.id));
const report={code,anchor,expected:actual.length,assembled:assembled.size,checks,
 missing:missing.map(p=>({id:p.id,matrix:p.node.getWorldMatrix()})),
 extra:extra.map(p=>({id:p.id,fields:owners.get(p.id)||[],matrix:p.node.getWorldMatrix()})),
 geometryMatches:!missing.length&&!extra.length,finishMaterialsStillRequireNormalReleaseVerification:true};
await fs.writeFile(path.join(root,code+'-'+anchor+'-composite-diagnosis.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({code,anchor,expected:report.expected,assembled:report.assembled,missing:missing.length,extra:extra.length,checks}));
