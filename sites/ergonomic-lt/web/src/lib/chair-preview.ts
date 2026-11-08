import type {ChairComponents} from './chair-components';
import {chairColorPlan,type ChairPalette,type ChairColorPlan} from './chair-color-admission';
import type {Asset,Patch} from './expanded-configurator';
import {qualifiedChairPlan,qualifiedWitnessMatches,qualifiedDefaultSelection,type ChairQualifiedData,type QualifiedSelection} from './chair-qualified-colors';

export type ChairSlot={selectorId:string;materialId:string;sourceNodePath:number[];primitive:number;transformChain:{matrix:number[]}[]};
export type ChairSelectors={schema:'canonical-world-primitive-selectors-329-v1';assets:Record<string,{assetSha256:string;slots:ChairSlot[];materials:Record<string,unknown>}>};
export type ChairPreview={schema:'pc2-chair-review-111-v1';code:string;name:string;runtimeSha256:string;runtime:ChairComponents;palette:ChairPalette;selectors:ChairSelectors;assets:Record<string,Asset>;textures:Record<string,{asset:string;sha256:string;bytes:number}>;qualified?:ChairQualifiedData;originalFinishByContext?:Record<string,Record<string,string>>;visualMetadataByContext?:Record<string,{values:Record<string,string>;sameStaticAppearanceObservations:{field:string;value:string}[]}>;visualMetadata?:{values:Record<string,string>;sameStaticAppearanceObservations:{field:string;value:string}[]};unavailableFinishChoices?:{label:string;count:number;context:number;reason:string}[]};
export type ChairObservedChoice={id:string;label:string;selection:{kind:'original'}|{kind:'full-state';link:string}|{kind:'observed-pair';index:number};values:Record<string,string>};
export function chairInitialContext(data:ChairPreview){
 if(data.qualified?.witnesses.length)return data.qualified.witnesses[0].context;
 const scope=data.palette.schema==='chair-colors-observed-partial-344-v1'?data.palette.observedPairs[0]?.constructionScope||{}:{};
 const index=data.runtime.contexts.findIndex(c=>Object.entries(c.dimensions).every(([k,v])=>scope[k]===v));return index<0?0:index;
}
export function chairInitialVariants(data:ChairPreview,index:number){
 const witness=data.qualified?.witnesses.find(w=>w.context===index);if(witness)return [...witness.variants];
 const scope=data.palette.schema==='chair-colors-observed-partial-344-v1'?data.palette.observedPairs[0]?.constructionScope||{}:{};
 return data.runtime.contexts[index].groups.map(g=>{const n=g.variants.findIndex(v=>Object.entries(v.values).every(([k,x])=>scope[k]===x));return n<0?0:n;});
}
/** Expose a supplied material control immediately only when its complete base
 * tuple is a no-op against this exact original assembly. */
export function chairInitialQualifiedSelection(data:ChairPreview,context=chairInitialContext(data),variants=chairInitialVariants(data,context)):QualifiedSelection|undefined{
 if(!data.qualified?.witnesses.length)return;
 const original=chairPreviewAssembly(data,context,variants,chairObservedChoices(data)[0]);
 const active=[original.base,...original.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256);
 for(const witness of data.qualified.witnesses){
  if(!(witness.groups.length||witness.branches.length)||!qualifiedWitnessMatches(data,witness,context,variants,active))continue;
  const selection=qualifiedDefaultSelection(witness);
  if(qualifiedChairPlan(data,context,variants,active,selection).status==='original')return selection;
 }
}
export function chairObservedChoices(data:ChairPreview):ChairObservedChoice[]{
 const original:ChairObservedChoice={id:'original',label:'Originalios medžiagos',selection:{kind:'original'},values:{}};
 const p=data.palette;
 if(p.schema==='chair-colors-full-state-329-v1')return [original,...Object.entries(p.selectionLinks).map(([id,link])=>({id,label:[link.field==='__CONTEXT_DEFAULT__'?'Pradinė būsena':link.field+' = '+link.value,...Object.entries(link.context).map(([k,v])=>k+' = '+v)].join(' · '),selection:{kind:'full-state' as const,link:id},values:{...link.context,...(link.field==='__CONTEXT_DEFAULT__'?{}:{[link.field]:link.value})}}))];
 if(p.schema==='chair-base-observed-colours-v1')return [original];
 return [original,...p.observedPairs.map((pair,index)=>({id:String(index),label:Object.entries(pair.finishAlternativeScope).filter(([k,v])=>pair.finishBaseScope[k]!==v).map(([k,v])=>k+' = '+v).join(' · ')||'Surinkta būsena '+(index+1),selection:{kind:'observed-pair' as const,index},values:{...pair.finishAlternativeScope}}))];
}
/** A complete observed tuple, never independent colour fields. */
export function chairPreviewAssembly(data:ChairPreview,contextIndex:number,variants:number[],choice:ChairObservedChoice,qualifiedSelection?:QualifiedSelection):{base:Asset|null;patches:Patch[];finishes:Record<string,never>;chairColors:{source:ChairPreview;plan:ChairColorPlan}}{
 const c=data.runtime.contexts[contextIndex];if(!c)throw Error('Unknown chair context');
 const firstScope=data.palette.schema==='chair-colors-observed-partial-344-v1'?data.palette.observedPairs[0]?.constructionScope||{}:{};
 // A scope field present only in another captured context is not evidence
 // about this context. Colour choices cannot replace actual geometry values.
 const changing=new Set(data.runtime.contexts.flatMap(context=>[...Object.keys(context.dimensions),...context.groups.flatMap(g=>g.fields)]));
 const baseScope=Object.fromEntries(Object.entries(firstScope).filter(([field])=>!changing.has(field)));
 const defaults=Object.fromEntries(Object.entries(c.default3DValues||{}).filter((entry):entry is [string,string]=>entry[1]!==null));
 const values={...baseScope,...defaults,...choice.values,...c.dimensions},active:string[]=[],patches:Patch[]=[];
 const ref=(part:NonNullable<typeof c.invariant>)=>{const asset=data.assets[part.sha256];if(!asset||asset.assetSha256!==part.sha256||asset.bytes!==part.bytes||active.includes(part.sha256))throw Error('Chair asset identity mismatch or duplicate active component');active.push(part.sha256);return asset;};
 const base=c.invariant?ref(c.invariant):null;
 c.groups.forEach((g,index)=>{const v=g.variants[variants[index]??0];if(!v)throw Error('Unknown chair tuple');Object.assign(values,v.values);patches.push({remove:[],addIds:[],changes:{},choices:{},geometry:v.asset?ref(v.asset):null});});
 const scope={...c.dimensions,...Object.fromEntries(c.groups.flatMap((g,index)=>Object.entries(g.variants[variants[index]??0].values)))};
 let plan=qualifiedSelection?qualifiedChairPlan(data,contextIndex,variants,active,qualifiedSelection):chairColorPlan({palette:data.palette,selectors:data.selectors,code:data.code,runtimeSha256:data.runtimeSha256,activeAssetSha256:active,values,selection:choice.selection,fullStateConstructionScope:scope});
 if(!qualifiedSelection&&choice.selection.kind!=='original'&&data.qualified?.legacyScopes.length&&!data.qualified.legacyScopes.some(w=>qualifiedWitnessMatches(data,w,contextIndex,variants,active)))plan={status:'unavailable',resetOriginalMaterialsFirst:true,assignments:[],materials:{},fullPalettePass:false};
 return {base,patches,finishes:{},chairColors:{source:data,plan}};
}

/** Convert only the self-contained normalized glTF material representation.
 * Texture byte identities come from this package's qualified manifest.
 */
export function chairMaterialDocument(material:unknown,textures:ChairPreview['textures']){
 const images:unknown[]=[],samplers:unknown[]=[],maps:unknown[]=[];
 const extensionsUsed=new Set<string>();
 function visit(value:unknown):unknown{
  if(Array.isArray(value))return value.map(visit);
  if(!value||typeof value!=='object')return value;
  const object=value as Record<string,unknown>;
  if(object.extensions&&typeof object.extensions==='object')for(const key of Object.keys(object.extensions))extensionsUsed.add(key);
  if('texture'in object){
   const texture=object.texture as {image?:{sha256?:string;bytes?:number};sampler?:unknown};
   const image=texture?.image,entry=image?.sha256?textures[image.sha256]:undefined;
   if(!entry||entry.sha256!==image?.sha256||entry.bytes!==image.bytes)throw Error('Unqualified chair texture');
   const index=maps.length;images.push({uri:entry.asset});samplers.push(texture.sampler||{});maps.push({source:index,sampler:index});
   return {...Object.fromEntries(Object.entries(object).filter(([k])=>k!=='texture').map(([k,v])=>[k,visit(v)])),index};
  }
  return Object.fromEntries(Object.entries(object).map(([k,v])=>[k,visit(v)]));
 }
 const converted=visit(material);
 return {asset:{version:'2.0'},extensionsUsed:[...extensionsUsed],materials:[converted],textures:maps,images,samplers};
}
