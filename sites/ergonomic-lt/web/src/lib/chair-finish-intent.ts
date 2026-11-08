import {chairPreviewAssembly,chairObservedChoices,type ChairPreview} from './chair-preview';
import {qualifiedWitnessMatches,qualifiedChairPlan,type QualifiedSelection} from './chair-qualified-colors';

/** A user's finish tuple, never a binding or material copied from another GLB. */
export type ChairFinishIntent={code:string;label:string;values:Record<string,string>};
const supported=new Set(['KSEG001WW001','KSEG002WW001','KSEG003WW001']);
const fields=['CPRICEGROUP','CUPHGROUP','CUPHCOLOR'];
const complete=(values:Record<string,string>)=>Object.keys(values).length===fields.length&&fields.every(k=>typeof values[k]==='string'&&values[k].length>0);
export function chairFinishIntent(data:ChairPreview,selection:QualifiedSelection|undefined):ChairFinishIntent|undefined{
 if(!supported.has(data.code)||selection?.kind!=='single')return;
 const w=data.qualified?.witnesses.find(w=>w.id===selection.witness),s=w?.singles.find(s=>s.id===selection.single);
 if(!s||!complete(s.values))return;
 return {code:data.code,label:s.label,values:{...s.values}};
}
/** Re-resolve against the target's own exact construction, assets and selectors.
 * An absent tuple remains requested but unavailable; it never becomes a tint. */
export function resolveChairFinishIntent(data:ChairPreview,intent:ChairFinishIntent|undefined,context:number,variants:number[]):QualifiedSelection|undefined{
 if(!intent||intent.code!==data.code||!supported.has(data.code)||!complete(intent.values))return;
 const assembly=chairPreviewAssembly(data,context,variants,chairObservedChoices(data)[0]);
 const active=[assembly.base,...assembly.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256);
 for(const w of data.qualified?.witnesses||[]){
  if(!qualifiedWitnessMatches(data,w,context,variants,active))continue;
  const single=w.singles.find(s=>complete(s.values)&&fields.every(k=>s.values[k]===intent.values[k]));if(!single)continue;
  const selection:QualifiedSelection={kind:'single',witness:w.id,single:single.id,groups:{}};
  if(qualifiedChairPlan(data,context,variants,active,selection).status!=='unavailable')return selection;
 }
}
