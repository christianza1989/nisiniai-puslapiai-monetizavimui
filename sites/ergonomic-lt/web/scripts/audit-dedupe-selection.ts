import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import seed from '../content/seed.json';
import {modelProduct} from '../src/lib/product-models';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {pilotForProduct} from '../src/lib/configurator';
import {supplierOptions} from '../src/lib/configuration-labels';
import type {Product} from '../src/lib/types';

const root='D:/Core/output/ergonomic-catalog-dedupe-20261016';
const audit='D:/Core/output/ergonomic-duplicate-audit-20261016';
const groups=JSON.parse(fs.readFileSync(audit+'/patvirtintos-grupes-212.json','utf8')) as {productId:string;code:string;keepSuggested:string;removeFromCatalogue:string[]}[];
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const checked=new Map<string,string>();
function asset(a:{asset:string;assetSha256:string}){
 let hash=checked.get(a.asset);if(!hash){const bytes=fs.readFileSync(path.join('public',a.asset));hash=sha(bytes);assert.equal(bytes.toString('ascii',0,4),'glTF');checked.set(a.asset,hash);}assert.equal(hash,a.assetSha256,a.asset);
}
const result:any[]=[],presets:any[]=[];
for(const group of groups){
 const p=(seed.products as Product[]).find(p=>p.id===group.productId)!;assert(p);
 const ids=[group.keepSuggested,...group.removeFromCatalogue];
 const members=[];
 for(const id of ids){
  const c=p.configurations.find(c=>c.id===id)!;assert.equal(c.code,group.code);
  const m=modelProduct(p,c),options=supplierOptions(c),head=options.find(o=>o.split('=')[0].endsWith('.CHEADREST'))?.split('=')[1];
  const row:any={id,path:`/produktai/${p.categorySlug}/${m.slug}/`,headrest:!!head&&head!=='NONE',headrestCode:head||null,has3D:false,mode:'photo',state:null};
  try{
   const runtime=await loadCatalogRuntime(m),engine=createExpandedEngine(runtime),family=engine.expandedForProduct(m);
   if(family){const state=engine.initialStateForProduct(m);engine.validateState(m,state);const assembled=engine.assembledAssets(state);asset(assembled.base);for(const patch of assembled.patches){if(patch.geometry)asset(patch.geometry);for(const geometry of patch.geometries||[])asset(geometry);}row.has3D=true;row.mode='expanded';row.state=state;row.token=engine.stateToken(state);row.runtime=runtime?.family.id||family.id;row.options=engine.expandedSelection(m,state).configuration.supplierOptions;}
   else {const pilot=pilotForProduct(m);if(pilot?.variants.length){for(const v of pilot.variants)asset({asset:v.asset,assetSha256:v.assetSha256});row.has3D=true;row.mode='pilot';}}
  }catch(error){row.error=String(error);}
  members.push(row);
  presets.push({productId:p.id,id,code:c.code,configuration:c,originalOptions:options,sourceSha256:sha(JSON.stringify(c)),runtimeBeforeMerge:row});
 }
 // Owner priority: functioning3D, then actual headrest; stable numeric ID as tie-breaker.
 const ranked=[...members].sort((a,b)=>Number(b.has3D)-Number(a.has3D)||Number(b.headrest)-Number(a.headrest)||a.id.localeCompare(b.id,'en',{numeric:true}));
 result.push({productId:p.id,code:group.code,keeperId:ranked[0].id,keeperPath:ranked[0].path,decision:'working3D_then_headrest_then_stable_id',members,retiredIds:ranked.slice(1).map(m=>m.id)});
}
assert.equal(result.length,212);assert.equal(result.reduce((n,g)=>n+g.retiredIds.length,0),314);
const receipt={at:new Date().toISOString(),sourceWorker:'54a8774e-015a-4bc3-9eb1-c98153b5ac23',sourceSeedSha256:sha(fs.readFileSync('content/seed.json')),groupCount:212,memberCount:presets.length,retireCount:314,activeCount:797,defaultGeometryAssetsChecked:checked.size,selection:result};
fs.writeFileSync(root+'/SELECTION-REVIEW.json',JSON.stringify(receipt,null,2));
fs.writeFileSync(root+'/ORIGINAL-PRESETS.json',JSON.stringify(presets,null,2));
console.log(JSON.stringify({groups:result.length,members:presets.length,retired:314,active:797,geometryAssets:checked.size,working3D:presets.filter(p=>p.runtimeBeforeMerge.has3D).length,errors:presets.filter(p=>p.runtimeBeforeMerge.error).map(p=>({id:p.id,error:p.runtimeBeforeMerge.error})),changedFromOldSuggestion:result.filter((g,i)=>g.keeperId!==groups[i].keepSuggested).length},null,2));
