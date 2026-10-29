import type {Asset} from './expanded-configurator';
import type {ChairPreview} from './chair-preview';
import type {ChairColorPlan} from './chair-color-admission';
export type QualifiedBinding={assetSha256:string;selectorId:string;baseMaterialId:string;materialId:string};
export type QualifiedTarget={assetSha256:string;selectorId:string};
export type QualifiedPatch={bindings:QualifiedBinding[];remove:QualifiedTarget[];assets:Asset[]};
export type QualifiedOption={id:string;label:string;values:Record<string,string>;patch:QualifiedPatch};
export type QualifiedGroup={id:string;label:string;options:QualifiedOption[];base:string};
export type QualifiedBranch={id:string;label:string;values:Record<string,string>;patch:QualifiedPatch;groups:QualifiedGroup[]};
export type QualifiedWitness={id:string;label:string;context:number;construction:Record<string,string>;variants:number[];requiredAssets:string[];groups:QualifiedGroup[];singles:QualifiedOption[];branches:QualifiedBranch[];baseBranch?:string;fixed?:Record<string,string>;inference?:boolean};
export type ChairQualifiedData={schema:'chair-qualified-review-v1';code:string;runtimeSha256:string;version:string;witnesses:QualifiedWitness[];legacyScopes:{context:number;requiredAssets:string[];construction:Record<string,string>}[];materials:Record<string,unknown>;extraAssets:Record<string,Asset>;opaqueAssets:string[]};
export type QualifiedSelection={witness:string;kind:'groups'|'single';single?:string;groups:Record<string,string>;branch?:string};
const key=(a:QualifiedTarget)=>a.assetSha256+':'+a.selectorId;
const hash=(v:string)=>/^[a-f0-9]{64}$/.test(v);
const empty=(status:ChairColorPlan['status']):ChairColorPlan=>({status,resetOriginalMaterialsFirst:true,assignments:[],materials:{},fullPalettePass:false,hidden:[],assets:[]});
function actualConstruction(data:ChairPreview,context:number,variants:number[]){
 const c=data.runtime.contexts[context];if(!c)return;
 const values={...c.dimensions};for(const [i,g]of c.groups.entries()){const v=g.variants[variants[i]??0];if(!v)return;Object.assign(values,v.values);}
 return values;
}
export function qualifiedWitnessMatches(data:ChairPreview,w:Pick<QualifiedWitness,'context'|'construction'|'requiredAssets'>,context:number,variants:number[],active:string[]){
 if(w.context!==context||!w.requiredAssets.length||new Set(w.requiredAssets).size!==w.requiredAssets.length||w.requiredAssets.length!==active.length||!w.requiredAssets.every(h=>active.includes(h)))return false;
 const actual=actualConstruction(data,context,variants);return !!actual&&Object.entries(actual).every(([k,v])=>w.construction[k]===v);
}
export function currentQualifiedWitness(data:ChairPreview,context:number,variants:number[],active:string[]){return data.qualified?.witnesses.find(w=>qualifiedWitnessMatches(data,w,context,variants,active));}
export function qualifiedDefaultSelection(w:QualifiedWitness):QualifiedSelection{
 const branch=w.branches.find(b=>b.id===w.baseBranch)||w.branches[0];
 return {witness:w.id,kind:w.groups.length||w.branches.length?'groups':'single',single:w.singles[0]?.id,branch:branch?.id,groups:Object.fromEntries([...w.groups,...branch?.groups||[]].map(g=>[g.id,g.base]))};
}
/** Only supplied whole tuples and measured disjoint groups are composed. */
export function qualifiedChairPlan(data:ChairPreview,context:number,variants:number[],active:string[],selection:QualifiedSelection):ChairColorPlan{
 const q=data.qualified,w=q?.witnesses.find(w=>w.id===selection.witness);
 if(!q||q.code!==data.code||q.runtimeSha256!==data.runtimeSha256||!w||!qualifiedWitnessMatches(data,w,context,variants,active))return empty('unavailable');
 const patches:QualifiedPatch[]=[];
 if(selection.kind==='single'){const s=w.singles.find(s=>s.id===selection.single);if(!s)return empty('unavailable');patches.push(s.patch);}
 else{
  const branch=w.branches.find(b=>b.id===selection.branch);if(w.branches.length&&!branch)return empty('unavailable');
  if(branch)patches.push(branch.patch);
  for(const group of [...w.groups,...branch?.groups||[]]){const option=group.options.find(o=>o.id===(selection.groups[group.id]??group.base));if(!option)return empty('unavailable');patches.push(option.patch);}
 }
 const assets:Asset[]=[],hidden:QualifiedTarget[]=[],assignments:QualifiedBinding[]=[],owners=new Set<string>();
 for(const patch of patches){
  const effects=new Set<string>();
  for(const a of patch.assets){const own=q.extraAssets[a.assetSha256];if(!own||data.assets[a.assetSha256]||own.asset!==a.asset||own.bytes!==a.bytes||!hash(a.assetSha256)||!Number.isSafeInteger(a.bytes)||a.bytes!<=0||a.bytes!>25*1024*1024||assets.some(p=>p.assetSha256===a.assetSha256))return empty('unavailable');assets.push(a);}
  for(const r of patch.remove){const own=data.selectors.assets[r.assetSha256];if(!active.includes(r.assetSha256)||own?.slots.filter(s=>s.selectorId===r.selectorId).length!==1||effects.has(key(r)))return empty('unavailable');effects.add(key(r));hidden.push({...r});}
  for(const b of patch.bindings){const own=data.selectors.assets[b.assetSha256],slots=own?.slots.filter(s=>s.selectorId===b.selectorId);if(slots?.length!==1||slots[0].materialId!==b.baseMaterialId||!q.materials[b.materialId]||effects.has(key(b)))return empty('unavailable');effects.add(key(b));assignments.push({...b});}
  // Prefix geometry and leaf material effects may address distinct OWN assets,
  // but two measured groups must never write/remove the same primitive.
  for(const effect of effects){if(owners.has(effect))return empty('unavailable');owners.add(effect);}
 }
 const available=new Set([...active,...assets.map(a=>a.assetSha256)]),hiddenKeys=new Set(hidden.map(key));
 if(assignments.some(b=>!available.has(b.assetSha256)||hiddenKeys.has(key(b))))return empty('unavailable');
 const materials=Object.fromEntries(assignments.map(b=>[b.materialId,q.materials[b.materialId]]));
 return {status:assignments.length||hidden.length||assets.length?'observed-state':'original',resetOriginalMaterialsFirst:true,assignments,materials,hidden,assets,fullPalettePass:false};
}
