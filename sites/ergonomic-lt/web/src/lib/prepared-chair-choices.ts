import {chairInitialContext,chairInitialVariants,chairInitialQualifiedSelection,chairObservedChoices,chairPreviewAssembly,type ChairPreview} from './chair-preview';
import {qualifiedDefaultSelection,qualifiedWitnessMatches,qualifiedChairPlan} from './chair-qualified-colors';
import {qualifiedChairMaterialControls} from './chair-material-groups';
import type {PreparedChairSelection} from './prepared-chair-selection';
export type PreparedChoice={key:string;fields:string[];options:{key:string;values:Record<string,string>;selection:PreparedChairSelection}[];current:string};
export function initialPreparedChair(data:ChairPreview,context=chairInitialContext(data),variants=chairInitialVariants(data,context)):PreparedChairSelection{
 return {context,variants,observed:'original',qualified:chairInitialQualifiedSelection(data,context,variants)};
}
export function preparedChairAssembly(data:ChairPreview,s:PreparedChairSelection){
 const c=data.runtime.contexts[s.context];
 if(!c||s.variants.length!==c.groups.length||s.variants.some((v,i)=>!Number.isInteger(v)||!c.groups[i].variants[v]))throw Error('Nežinoma kėdės konstrukcija.');
 const choice=chairObservedChoices(data).find(c=>c.id===s.observed);if(!choice)throw Error('Nežinoma apdailos būsena.');
 const assembly=chairPreviewAssembly(data,s.context,s.variants,choice,s.qualified);
 if(assembly.chairColors.plan.status==='unavailable')throw Error('Apdaila nepriklauso šiai konstrukcijai.');
 return assembly;
}
export function preparedChairValues(data:ChairPreview,s:PreparedChairSelection){
 preparedChairAssembly(data,s);const c=data.runtime.contexts[s.context],p=data.palette;
 const values:Record<string,string>={...(p.schema==='chair-colors-observed-partial-344-v1'?p.observedPairs[0]?.constructionScope:{}),...(p.schema==='chair-colors-observed-partial-344-v1'?p.observedPairs[0]?.finishBaseScope:p.schema==='chair-base-observed-colours-v1'?Object.fromEntries(Object.entries(p.baselineObservedFinish).map(([f,v])=>[f,v.value])):{}),...Object.fromEntries(Object.entries(c.default3DValues||{}).filter((e):e is [string,string]=>e[1]!==null)),...c.dimensions};
 c.groups.forEach((g,i)=>Object.assign(values,g.variants[s.variants[i]].values));
 const choice=chairObservedChoices(data).find(c=>c.id===s.observed)!;Object.assign(values,choice.values);
 if(s.qualified){const q=s.qualified,w=data.qualified!.witnesses.find(w=>w.id===q.witness)!;Object.assign(values,w.fixed);
  if(q.kind==='single')Object.assign(values,w.singles.find(x=>x.id===q.single)!.values);
  else{const b=w.branches.find(b=>b.id===q.branch);Object.assign(values,b?.values);for(const g of [...w.groups,...b?.groups||[]])Object.assign(values,g.options.find(o=>o.id===(q.groups[g.id]??g.base))!.values);}
 }
 return values;
}
/** Only captured construction tuples and admitted colour plans are offered. */
export function preparedChairChoices(data:ChairPreview,s:PreparedChairSelection):PreparedChoice[]{
 const assembly=preparedChairAssembly(data,s),active=[assembly.base,...assembly.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256),c=data.runtime.contexts[s.context],rows:PreparedChoice[]=[];
 const fields=[...new Set(data.runtime.contexts.flatMap(c=>Object.keys(c.dimensions)))].filter(f=>new Set(data.runtime.contexts.map(c=>c.dimensions[f])).size>1);
 if(data.runtime.contexts.length>1)rows.push({key:'construction',fields,current:String(s.context),options:data.runtime.contexts.map((c,i)=>({key:String(i),values:c.dimensions,selection:initialPreparedChair(data,i)}))});
 c.groups.forEach((g,i)=>{if(!g.fields.length||g.variants.length<2)return;rows.push({key:'component:'+i,fields:g.fields,current:String(s.variants[i]),options:g.variants.map((v,n)=>{const variants=[...s.variants];variants[i]=n;return {key:String(n),values:v.values,selection:initialPreparedChair(data,s.context,variants)};})});});
 const baseline=chairPreviewAssembly(data,s.context,s.variants,chairObservedChoices(data)[0]),originalActive=[baseline.base,...baseline.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256);
 const finishOptions:{key:string;values:Record<string,string>;selection:PreparedChairSelection}[]=[{key:'original',values:preparedChairValues(data,{...s,observed:'original',qualified:undefined}),selection:{...s,observed:'original',qualified:undefined}}];
 for(const choice of chairObservedChoices(data).slice(1)){const next={...s,observed:choice.id,qualified:undefined};try{preparedChairAssembly(data,next);finishOptions.push({key:'observed:'+choice.id,values:choice.values,selection:next});}catch{}}
 for(const w of data.qualified?.witnesses||[]){if(!qualifiedWitnessMatches(data,w,s.context,s.variants,originalActive))continue;const q=qualifiedDefaultSelection(w),next={...s,observed:'original',qualified:q};try{preparedChairAssembly(data,next);finishOptions.push({key:'qualified:'+w.id,values:preparedChairValues(data,next),selection:next});}catch{}
  for(const single of w.singles){const next={...s,observed:'original',qualified:{witness:w.id,kind:'single' as const,single:single.id,groups:{}}};try{preparedChairAssembly(data,next);finishOptions.push({key:'single:'+w.id+':'+single.id,values:single.values,selection:next});}catch{}}
 }
 const currentFinish=s.qualified?(s.qualified.kind==='single'?'single:'+s.qualified.witness+':'+s.qualified.single:'qualified:'+s.qualified.witness):s.observed==='original'?'original':'observed:'+s.observed;
 // Thousands of captured whole states may also be represented by the supplied
 // independent groups. Omit only a proven exact equivalent, never an unknown tuple.
 const compact=finishOptions.filter(option=>{
  if(option.key==='original'||option.key.startsWith('qualified:')||option.key===currentFinish)return true;
  for(const w of data.qualified?.witnesses||[]){
   if(!(w.groups.length||w.branches.length)||!qualifiedWitnessMatches(data,w,s.context,s.variants,originalActive))continue;
   for(const branch of w.branches.length?w.branches:[undefined]){
    const groups:Record<string,string>={};let valid=true;
    for(const g of [...w.groups,...branch?.groups||[]]){const matched=g.options.find(o=>Object.entries(o.values).every(([f,v])=>option.values[f]===v));if(!matched){valid=false;break;}groups[g.id]=matched.id;}
    if(!valid)continue;
    try{const next={...s,observed:'original',qualified:{witness:w.id,kind:'groups' as const,branch:branch?.id,groups}},values=preparedChairValues(data,next);if(Object.entries(option.values).every(([f,v])=>values[f]===v))return false;}catch{}
   }
  }
  return true;
 });
 if(compact.length>1)rows.push({key:'finish-state',fields:[...new Set(compact.flatMap(o=>Object.keys(o.values)))].filter(f=>/COLOR|COL$|CHCOL|GROUP|MATERIAL/.test(f)),current:currentFinish,options:compact});
 if(s.qualified?.kind==='groups'){
  const q=s.qualified,w=data.qualified!.witnesses.find(w=>w.id===q.witness)!,b=w.branches.find(b=>b.id===q.branch);
  if(w.branches.length>1)rows.push({key:'finish-branch',fields:[...new Set(w.branches.flatMap(b=>Object.keys(b.values)))],current:q.branch!,options:w.branches.map(b=>({key:b.id,values:b.values,selection:{...s,qualified:{...q,branch:b.id,groups:{...q.groups,...Object.fromEntries(b.groups.map(g=>[g.id,g.base]))}}}})).filter(o=>qualifiedChairPlan(data,s.context,s.variants,originalActive,o.selection.qualified).status!=='unavailable')});
  const grouped=qualifiedChairMaterialControls(w,q,next=>qualifiedChairPlan(data,s.context,s.variants,originalActive,next).status!=='unavailable');
  for(const g of grouped.controls)if(g.options.length)rows.push({key:g.id,fields:g.fields,current:g.value,options:g.options.map(o=>({key:o.id,values:preparedChairValues(data,{...s,qualified:o.state}),selection:{...s,qualified:o.state}}))});
  for(const g of grouped.remaining)if(g.options.length>1)rows.push({key:'finish-group:'+g.id,fields:[...new Set(g.options.flatMap(o=>Object.keys(o.values)))],current:q.groups[g.id]??g.base,options:g.options.map(o=>({key:o.id,values:o.values,selection:{...s,qualified:{...q,groups:{...q.groups,[g.id]:o.id}}}})).filter(o=>qualifiedChairPlan(data,s.context,s.variants,originalActive,o.selection.qualified).status!=='unavailable')});
 }
 return rows;
}
