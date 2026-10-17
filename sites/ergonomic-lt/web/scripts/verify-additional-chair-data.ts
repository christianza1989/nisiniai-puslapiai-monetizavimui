import {verifyNativeStructuralPbr} from './verify-native-structural-pbr.mjs';
import fs from 'node:fs';
import {nativeAxisValueChanges} from './native-axis-value-changes.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createCatalogEngine,type CatalogFamily} from '../src/lib/catalog-configurator';
import {baseSeed} from '../src/lib/catalog';
import {compactCatalogRuntime} from './compact-catalog-runtime.mjs';

// Scoped engines also prove that independently loaded products do not share
// registry mutations. Candidate data never affects a live app or database.
const folder=path.resolve(process.argv.find(a=>a.startsWith('--folder='))?.slice(9)||'../research/configurator/all-chairs-20261014/prepared');
const source=path.resolve(process.argv.find(a=>a.startsWith('--source='))?.slice(9)||path.join(folder,'..',path.basename(folder).replace(/^prepared/,'source')));
const article=process.argv.find(a=>a.startsWith('--article='))?.slice(10);
const files=fs.readdirSync(folder).filter(f=>/^K[A-Z0-9]+\.json$/.test(f)&&(!article||f===article+'.json'));
const reports=[];
for(const file of files){
 const full=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));
 for(const family of full.families)await nativeAxisValueChanges(family,source);
 const compact=compactCatalogRuntime(full),fixtures=JSON.parse(fs.readFileSync(path.join(folder,file.replace('.json','-fixtures.json')),'utf8'));
 let independentSnapshots=0;
 for(const family of full.families as CatalogFamily[]){
  const product=baseSeed().products.find(p=>p.id===family.productId)!;assert(product);
  const compactFamily=compact.families.find((f:CatalogFamily)=>f.id===family.id);
  const fullEngine=createCatalogEngine(family),compactEngine=createCatalogEngine(compactFamily);
  const captures=fixtures.filter((f:{family:string})=>f.family===family.id);
  function outcome(f:CatalogFamily,state:unknown){const engine=f===family?fullEngine:compactEngine;const s=engine.catalogValidate(product,state);return {choices:engine.catalogChoices(s),spec:engine.catalogSelection(product,s,()=>[]).configuration.supplierOptions};}
  for(const fixture of captures){
   const state={family:family.id,anchor:fixture.anchor,values:fixture.values};
   const before=outcome(family,state),after=outcome(compactFamily,state);
   assert.deepEqual(before.choices,fixture.choices,fixture.anchor+' independent supplier choices');
   assert.deepEqual(before.spec,fixture.supplierOptions,fixture.anchor+' independent supplier codes');
   assert.deepEqual(after,before,fixture.anchor+' compact runtime parity');
  }
  // Each source-evaluated snapshot is independent evidence, including hidden
  // values. A composite fixture alone may miss a price/material rule that
  // silently resets a construction-dependent supplier code.
  for(const anchor of family.anchors){
   const dir=path.join(source,anchor.article,anchor.id.split(':').slice(1).join(':'));
   for(const relative of fs.readdirSync(dir,{recursive:true}).filter((f):f is string=>typeof f==='string'&&f.endsWith('.json'))){
    const snapshot=JSON.parse(fs.readFileSync(path.join(dir,relative),'utf8'));
    if(!snapshot.properties||!snapshot.choices)continue;
    const values=Object.fromEntries(Object.entries(snapshot.properties as Record<string,{value:string}>).filter(([key])=>(/_OPTIONS\.|_FINISHES\./.test(key)||key.includes('_DIMENSIONS.')&&(key.endsWith('.DFRAMEDIAMETER')||key in snapshot.choices))).map(([key,p])=>[key.split('.').at(-1)!,p.value]));
    const choices=Object.fromEntries(Object.entries(snapshot.choices as Record<string,{value:string;selectable:boolean}[]>).filter(([key])=>snapshot.properties[key]?.visible&&snapshot.properties[key]?.editable).map(([key,list])=>[key.split('.').at(-1)!,list.filter(v=>v.selectable).map(v=>v.value)]));
    const constructor=!relative.startsWith('axis-transitions')&&anchor.components.some(c=>c.nativeMeasuredAxes?.length)?anchor:family.anchors.find(a=>a.article===anchor.article&&a.axes.every(k=>a.defaults[k]===values[k]));
    assert(constructor,anchor.id+'/'+relative+' missing measured target constructor');
    const publicKeys=new Set([...Object.keys(choices),...constructor.axes,...constructor.components.flatMap(c=>c.fields)]);
    const state={family:family.id,anchor:constructor.id,values:Object.fromEntries(Object.entries(values).filter(([key])=>publicKeys.has(key)))};
    const expected=Object.entries(snapshot.properties as Record<string,{value:string}>).filter(([key])=>(/_OPTIONS\.|_FINISHES\./.test(key)||key.includes('_DIMENSIONS.')&&(key.endsWith('.DFRAMEDIAMETER')||key in snapshot.choices))).sort(([a],[b])=>a.split('.').at(-1)!.localeCompare(b.split('.').at(-1)!)).map(([key,p])=>key+'='+(key.endsWith('.CPRICEGROUP')?p.value.replace(/^_/,''):p.value));
    const result=outcome(family,state),label=anchor.id+'/'+relative;
    assert.deepEqual(result.choices,choices,label+' measured source choices');
    assert.deepEqual(result.spec,expected,label+' measured source codes');
    assert.deepEqual(outcome(compactFamily,state),result,label+' compact source parity');
    if(relative.startsWith('axis-transitions')){
     const key=path.basename(relative,'.json'),separator=key.indexOf('=');
     const initial=fullEngine.catalogValidate(product,{family:family.id,anchor:anchor.id,values:Object.fromEntries(Object.entries(anchor.defaults).filter(([k])=>new Set([...Object.keys(anchor.choices),...anchor.axes,...anchor.components.flatMap(c=>c.fields)]).has(k)))});
     const changed=fullEngine.catalogChange(initial,key.slice(0,separator),key.slice(separator+1));
     assert.equal(changed.anchor,constructor.id,label+' measured dependent-axis destination');
     assert.deepEqual(outcome(family,changed).spec,expected,label+' measured transition codes');
    }
    independentSnapshots++;
   }
  }
  for(const article of family.articles){
   let state=fullEngine.catalogInitial(family,article.code),random=913;
   for(let i=0;i<80;i++){
    const choices=fullEngine.catalogChoices(state),fields=Object.keys(choices);if(!fields.length)break;
    random=(Math.imul(random,1664525)+1013904223)>>>0;const field=fields[random%fields.length],value=choices[field][(random>>>8)%choices[field].length];
    let before,after;try{before=fullEngine.catalogChange(state,field,value);after=compactEngine.catalogChange(state,field,value);}catch(error){throw Error(JSON.stringify({article:article.code,field,value,state,choices}),{cause:error});}
    assert.deepEqual(after,before,article.code+' transition parity');state=before;
   }
  }
 }
 const structuralPbr=[];
 for(const family of full.families as CatalogFamily[]){
  const product=baseSeed().products.find(p=>p.id===family.productId)!;assert(product);
  const proof=await verifyNativeStructuralPbr({family,product,source,publicRoot:path.resolve('public'),createEngine:createCatalogEngine});structuralPbr.push(proof);
  if(proof.result!=='PASS'){
   const failedTarget=path.resolve(process.argv.find(a=>a.startsWith('--report='))?.slice(9)||'../research/configurator/all-chairs-20261014/runtime-verification.json');
   fs.mkdirSync(path.dirname(failedTarget),{recursive:true});fs.writeFileSync(failedTarget,JSON.stringify({reports,file,structuralPbr,result:'FAIL'},null,2));
   throw Error('Original Native structural PBR differs: '+JSON.stringify(proof.errors));
  }
 }
 reports.push({file,sourceBytes:JSON.stringify(full).length,runtimeBytes:JSON.stringify(compact).length,fixtures:fixtures.length,independentSnapshots,structuralPbr,result:'PASS'});
}
const target=path.resolve(process.argv.find(a=>a.startsWith('--report='))?.slice(9)||'../research/configurator/all-chairs-20261014/runtime-verification.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({reports,result:'PASS'},null,2));
console.log(JSON.stringify({articles:reports.length,sourceBytes:reports.reduce((n,r)=>n+r.sourceBytes,0),runtimeBytes:reports.reduce((n,r)=>n+r.runtimeBytes,0),result:'PASS'}));
