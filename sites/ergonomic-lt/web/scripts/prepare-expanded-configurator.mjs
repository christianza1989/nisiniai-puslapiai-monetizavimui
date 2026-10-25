import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,prune,meshopt,getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';

const root=path.resolve('..'),source=path.join(root,'research/configurator/expanded-source');
const target=path.resolve('public/models/configurator/expanded');await fs.mkdir(target,{recursive:true});
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
import {hash,parts,compact} from './configurator-geometry.mjs';
const suffix=k=>k.split('.').at(-1);
async function load(ref){const b=await fs.readFile(path.join(source,ref.file));if(hash(b)!==ref.sha256)throw Error('Source checksum changed');return compact(await io.readBinary(b));}
async function write(doc,name,roles){
 if(process.argv.includes('--retag-only')){
  try{const previous=await io.read(path.join(target,name+'.glb')),wanted=new Map(parts(doc).flatMap(p=>[[p.oldId,p],[p.id,p]]));
   for(const node of previous.getRoot().listNodes().filter(n=>n.getMesh())){
    const part=wanted.get(node.getName());if(!part){node.dispose();continue;}
    node.setName(part.id).setExtras({partId:part.id,finishField:roles[part.id]||null});
   }
   await previous.transform(prune(),meshopt({encoder:MeshoptEncoder}));const b=await io.writeBinary(previous);await fs.writeFile(path.join(target,name+'.glb'),b);
   return {asset:'/models/configurator/expanded/'+name+'.glb',assetSha256:hash(b),bytes:b.length};
  }catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(process.argv.includes('--metadata-only')){const b=await fs.readFile(path.join(target,name+'.glb'));return {asset:'/models/configurator/expanded/'+name+'.glb',assetSha256:hash(b),bytes:b.length};}
 for(const {node,id} of parts(doc)){
   const role=roles[id]||null;node.setName(id).setExtras({partId:id,finishField:role});
   const primitive=node.getMesh().listPrimitives()[0];
   if(role){const material=primitive.getMaterial()?.clone();if(material){material.setName(role);primitive.setMaterial(material);}}
 }
 // Preserve the supplier's common physical origin and scale, including every
 // original node transform. A viewer may fit the whole assembled chair later.
 await doc.transform(weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeNormal:16,quantizeTexcoord:16}));
 const b=await io.writeBinary(doc);await fs.writeFile(path.join(target,name+'.glb'),b);
 return {asset:'/models/configurator/expanded/'+name+'.glb',assetSha256:hash(b),bytes:b.length};
}
const result={schemaVersion:2,status:'two-product-pilot',families:[],palettes:{}};
const observations=[];
function choices(s){return Object.fromEntries(Object.entries(s.choices).map(([k,c])=>[suffix(k),c.filter(v=>v.selectable).map(v=>v.value)]));}
function defaults(s){return Object.fromEntries(Object.entries(s.properties).filter(([k])=>/_OPTIONS\.|_FINISHES\./.test(k)).map(([k,p])=>[suffix(k),p.value]));}
function palette(s){for(const [k,c] of Object.entries(s.choices))for(const v of c)if(v.selectable){
 const id=suffix(k);result.palettes[id]??={};result.palettes[id][v.value]??={text:v.text,sourceIcon:v.icon};
}}
for(const [slug,productId,baseArticle,sample] of [
 ['xilium','product_xilium-swivel-chairs_0fe4091b','KXIL044WW001','23636148'],
 ['souly','product_souly-swivel-chairs_e1805fc7','KSOU001WW003','16088654']]){
 const dir=path.join(source,slug);let names;try{names=(await fs.readdir(dir)).filter(n=>n.endsWith('.json')&&n!=='manifest.json');}catch{continue;}
 const family={id:slug,productId,baseArticle,sample,anchors:[]};
 for(const name of names){
  const s=JSON.parse(await fs.readFile(path.join(dir,name),'utf8')),doc=await load(s.geometry),baseParts=parts(doc),baseMap=new Map(baseParts.map(p=>[p.id,p]));
  const roles={};
  for(const [field,probe] of Object.entries(s.roles)){
   const other=parts(await load(probe.geometry));
   for(const p of other)if(baseMap.get(p.id)&&baseMap.get(p.id).material!==p.material)roles[p.id]=suffix(field);
  }
  const anchor={id:s.id,defaults:defaults(s),classes:Object.fromEntries(Object.keys(s.properties).filter(k=>/_OPTIONS\.|_FINISHES\./.test(k)).map(k=>[suffix(k),k.split('.')[0]])),choices:choices(s),fields:Object.keys(s.choices).map(suffix),roles,
   geometry:await write(doc,slug+'-'+s.id,roles),patches:{},conditionalPatches:{},profiles:[]};
  palette(s);
  for(const [selection,ps] of Object.entries(s.patches)){
   const pd=await load(ps.geometry),pp=parts(pd),pMap=new Map(pp.map(p=>[p.id,p]));
   const remove=baseParts.filter(p=>!pMap.has(p.id)||pMap.get(p.id).material!==p.material).map(p=>p.id);
   const added=pp.filter(p=>!baseMap.has(p.id)||baseMap.get(p.id).material!==p.material);
   // Finishes of inherited upholstery are identified by real material-change
   // probes. New seat shapes inherit their material's role where unambiguous.
   const roleMaterials=new Map();for(const p of baseParts)if(roles[p.id]){
    const current=roleMaterials.get(p.material);roleMaterials.set(p.material,current&&current!==roles[p.id]?'ambiguous':roles[p.id]);
   }
   const patchRoles={...roles};for(const p of added){const r=roleMaterials.get(p.material);if(r&&r!=='ambiguous')patchRoles[p.id]=r;}
   for(const [field,probe] of Object.entries(ps.roles||{}))for(const p of parts(await load(probe.geometry)))if(pMap.get(p.id)&&pMap.get(p.id).material!==p.material)patchRoles[p.id]=suffix(field);
   const keep=new Set(added.map(p=>p.node));for(const p of pp)if(!keep.has(p.node))p.node.dispose();
   const overrides=Object.fromEntries(Object.entries(choices(ps)).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(anchor.choices[k])));
   const changes=Object.fromEntries(Object.entries(defaults(ps)).filter(([k,v])=>anchor.defaults[k]!==v));
   const patch={remove,addIds:added.map(p=>p.id),changes,choices:overrides,geometry:added.length?await write(pd,slug+'-'+s.id+'-'+suffix(selection),patchRoles):null};
   anchor.patches[suffix(selection)]=patch;palette(ps);
  }
  for(const [selection,ps] of Object.entries(s.conditionalArms||{})){
   const [mechanism,arm]=selection.split('|'),basis=s.patches[baseArticle+'_OPTIONS.CMECHANISM='+mechanism];
   const basisParts=parts(await load(basis.geometry)),basisMap=new Map(basisParts.map(p=>[p.id,p]));
   const pd=await load(ps.geometry),pp=parts(pd),pMap=new Map(pp.map(p=>[p.id,p]));
   const remove=basisParts.filter(p=>!pMap.has(p.id)||pMap.get(p.id).material!==p.material).map(p=>p.id);
   const added=pp.filter(p=>!basisMap.has(p.id)||basisMap.get(p.id).material!==p.material),keep=new Set(added.map(p=>p.node));
   for(const p of pp)if(!keep.has(p.node))p.node.dispose();
   anchor.conditionalPatches[selection]={remove,addIds:added.map(p=>p.id),changes:{},choices:{},geometry:added.length?await write(pd,slug+'-'+s.id+'-joint-'+selection.replace('|','-'),roles):null};
  }
  for(const p of [...Object.values(s.patches),...s.finishProfiles,...(s.sideFinishProfiles||[])])for(const key of Object.keys(p.properties))if(/_OPTIONS\.|_FINISHES\./.test(key))anchor.classes[suffix(key)]=key.split('.')[0];
  for(const p of [...s.finishProfiles,...(s.sideFinishProfiles||[])]){palette(p);const state=defaults(p);anchor.profiles.push({defaults:state,choices:choices(p)});}
  // Every overlapping patch must be treated explicitly. Never silently draw
  // duplicate parts or assume independence because controls look independent.
  const conflicts=[];const entries=Object.entries(anchor.patches);
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
   const [a,pa]=entries[i],[b,pb]=entries[j];if(a.split('=')[0]===b.split('=')[0])continue;
   const overlap=pa.remove.filter(id=>pb.remove.includes(id));if(overlap.length)conflicts.push({a,b,overlap});
  }
  const bounds=getBounds((await load(s.geometry)).getRoot().listScenes()[0]);
  observations.push({family:slug,anchor:s.id,parts:baseParts.length,patches:entries.length,roles:Object.keys(roles).length,conflicts,bounds});
  family.anchors.push(anchor);console.log(slug,s.id,'prepared',anchor.geometry.bytes,'conflicts',conflicts.length);
 }
 result.families.push(family);
}
const colorCache=new Map();
for(const [field,values] of Object.entries(result.palettes))for(const [code,item] of Object.entries(values)){
 const file=path.resolve('public/media/configurator/finishes/'+code.toLowerCase()+'.jpg');
 try{if(!colorCache.has(code)){const {data:rgb,info}=await sharp(file).resize(16,16).removeAlpha().raw().toBuffer({resolveWithObject:true});const sum=[0,0,0];for(let i=0;i<rgb.length;i+=info.channels)for(let c=0;c<3;c++)sum[c]+=rgb[i+c];colorCache.set(code,'#'+sum.map(v=>Math.round(v/(16*16)).toString(16).padStart(2,'0')).join(''));}item.image='/media/configurator/finishes/'+code.toLowerCase()+'.jpg';item.color=colorCache.get(code);}catch{}
 delete item.sourceIcon;
}
await fs.writeFile('content/configurator-expanded.json',JSON.stringify(result));
await fs.writeFile(path.join(root,'research/configurator/expanded-preparation-report.json'),JSON.stringify(observations,null,2));
console.log('Prepared',result.families.length,'pilot families');

