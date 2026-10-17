// Factor structural choices by measured surface overlap and OFML dependencies.
import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {parts,compact,hash} from './configurator-geometry.mjs';
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const source=path.resolve(option('source','../research/configurator/batch-10-source'));
const selection=JSON.parse(await fs.readFile(option('selection','../research/configurator/batch-10/selection.json'),'utf8'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const values=s=>Object.fromEntries(Object.entries(s.properties).filter(([k])=>(/_OPTIONS\.|_FINISHES\./.test(k)||k.includes('_DIMENSIONS.')&&(k.endsWith('.DFRAMEDIAMETER')||k in s.choices))).map(([k,p])=>[k,p.value]));
const choices=s=>Object.fromEntries(Object.entries(s.choices).filter(([k])=>s.properties[k]?.visible&&s.properties[k]?.editable).map(([k,vs])=>[k,vs.filter(v=>v.selectable).map(v=>v.value)]));
async function geometry(ref,dir){const bytes=await fs.readFile(ref.file.includes('/')?path.join(source,ref.file):path.join(dir,ref.file));if(hash(bytes)!==ref.sha256)throw Error('Source checksum mismatch');return parts(compact(await io.readBinary(bytes)));}
const onlyArticle=option('article','');
for(const product of selection.products)for(const article of product.articles){
 if(onlyArticle&&article.code!==onlyArticle)continue;
 const folder=path.join(source,article.code);let manifest;
 try{manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
 for(const anchor of manifest.anchors){
  const dir=path.join(folder,anchor),capture=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  if(!process.argv.includes('--force')){try{await fs.access(path.join(dir,'component-plan.json'));continue;}catch{}}
  const isFinish=k=>{const name=k.split('.').at(-1);return name==='CPRICEGROUP'||name.endsWith('GROUP')||(/COLOR|CHCOL/.test(name)&&!/PLASTIC|FRAME/.test(name));};
  const base=JSON.parse(await fs.readFile(path.join(dir,capture.base),'utf8')),baseParts=await geometry(base.geometry,dir),byId=new Map(baseParts.map(p=>[p.id,p]));
  const affected={},dependencies=new Map(),baseChoices=choices(base),baseValues=values(base);
  for(const [name,file] of Object.entries(capture.options)){
   const field=Object.keys(base.properties).find(k=>k.endsWith('.'+name.split('=')[0]));
   const state=JSON.parse(await fs.readFile(path.join(dir,file),'utf8')),actual=await geometry(state.geometry,dir),actualIds=new Set(actual.map(p=>p.id));
   affected[field]??=new Set();for(const p of baseParts)if(!actualIds.has(p.id))affected[field].add(p.id);
   for(const p of actual)if(!byId.has(p.id)||byId.get(p.id).material!==p.material)affected[field].add(p.id);
   const afterValues=values(state),afterChoices=choices(state);
   for(const other of new Set([...Object.keys(baseChoices),...Object.keys(afterChoices)]))if(other!==field&&!isFinish(other)&&!manifest.axes.includes(other)&&(afterValues[other]!==baseValues[other]||JSON.stringify(afterChoices[other])!==JSON.stringify(baseChoices[other]))){affected[other]??=new Set();dependencies.set([field,other].sort().join('|'),[field,other]);}
  }
  const fields=Object.keys(affected),edges=[...dependencies.values()];
  // Flesco's independent composite locates the stacking pillow 11.8 mm
  // higher with the selected frame/castors. Capture that coupled mounting,
  // rather than attaching the baseline pillow at a guessed height.
  if(article.code.startsWith('KFLS')){
   const stacking=fields.find(k=>k.endsWith('.CSTACKINGPROTECTION'));
   const diameter=fields.find(k=>k.endsWith('.DFRAMEDIAMETER'));
   if(stacking&&diameter)edges.push([stacking,diameter]);
  }
  // Creva's measured composite changes the painted footrest to the selected
  // frame colour. The chrome baseline has no such shared finish surface.
  if(article.code.startsWith('KCRE')){
   const footrest=fields.find(k=>k.endsWith('.CFOOTREST'));
   const frame=fields.find(k=>k.endsWith('.CFRAMEMETALCOLOR'));
   if(footrest&&frame)edges.push([footrest,frame]);
  }
  // Composite Axo source exports prove that connectors inherit the frame
  // finish even when the baseline has no connector surface to intersect.
  const connector=fields.find(k=>k.endsWith('.CCONNECTOR'));
  if(connector)for(const frame of fields.filter(k=>/\.CFRAMEMETAL(?:MATERIAL|COLOR)$/.test(k)))edges.push([connector,frame]);
  // Independent Cadeira composites show the row-connection preview at a
  // different ground height when the glides change (4 mm in the source).
  const glides=fields.find(k=>k.endsWith('.CGLIDES'));
  if(article.code.startsWith('KCAD')&&connector&&glides)edges.push([connector,glides]);
  // Combined source fixtures exposed dependencies absent from single-field
  // probes: lumbar position follows the mechanism when the support is added.
  if(article.code.startsWith('KBJA')||article.code.startsWith('KNXT')){
   const mechanism=fields.find(k=>k.endsWith('.CMECHANISM')),lumbar=fields.find(k=>k.endsWith('.CLUMBARSUPPORT'));
   if(mechanism&&lumbar)edges.push([mechanism,lumbar]);
   const arms=fields.find(k=>k.endsWith('.CARMRESTS'));if(article.code.startsWith('KNXT')&&mechanism&&arms)edges.push([mechanism,arms]);
  }
  // Exact composite fixtures expose a mounting mismatch only when support
  // parts are present. Measure these pairs jointly to test the interaction;
  // do not translate geometry or waive the final exact composite assertion.
  if(['KSOU001WW004','KXLI001WW002'].includes(article.code)){
   const mechanism=fields.find(k=>k.endsWith('.CMECHANISM'));
   const support=fields.find(k=>k.endsWith(article.code==='KSOU001WW004'?'.CARMRESTS':'.CLUMBARSUPPORT'));
   if(mechanism&&support)edges.push([mechanism,support]);
  }
  for(let i=0;i<fields.length;i++)for(let j=i+1;j<fields.length;j++)if([...affected[fields[i]]].some(id=>affected[fields[j]].has(id)))edges.push([fields[i],fields[j]]);
  const groups=fields.map(k=>new Set([k]));
  for(const [a,b] of edges){const x=groups.find(g=>g.has(a)),y=groups.find(g=>g.has(b));if(x&&y&&x!==y){for(const k of y)x.add(k);groups.splice(groups.indexOf(y),1);}}
  const plan={article:article.code,anchor,groups:groups.map(g=>[...g].sort()),edges,affected:Object.fromEntries(fields.map(k=>[k,[...affected[k]]]))};
  await fs.writeFile(path.join(dir,'component-plan.json'),JSON.stringify(plan,null,2));
  console.log(article.code,anchor,plan.groups.map(g=>g.map(k=>k.split('.').at(-1)).join('+')).join(' | '));
 }
}
