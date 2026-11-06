import {createHash} from 'node:crypto';
import type {TextDefinition,TextEdit} from './text-review-types';

type Group='chairs'|'desks';
type Model={path:string;bindings:Record<string,string>};
type Target={key:string;sourceHash:string;affected:number};
const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
const hash=(s:unknown)=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const groupFor=(category:string):Group=>category==='rasomieji-stalai-ir-darbo-vietos'?'desks':'chairs';

// Identity stays model-specific. Only the storage key is shared, and only when
// category, exact field/value and a captured, meaningful original all agree.
export function createRuntimeTextSharing(models:Record<string,Model>,terms:Record<string,TextDefinition>,originals:Record<string,Record<string,string>>,inventoryKey:(category:string,id:string)=>string){
 const contexts=new Map<string,{ids:Set<string>;models:Set<string>}>(),byRuntime=new Map<string,string>(),references=new Map<string,Set<string>>();
 for(const[model,meta]of Object.entries(models)){
  const group:Group=meta.path.startsWith('/produktai/rasomieji-stalai-ir-darbo-vietos/')?'desks':'chairs';
  for(const[binding,english]of Object.entries(originals[model]||{})){
   if(!/^(?:field:|value:)/.test(binding))continue;
   const meaning=normalize(english),code=binding.startsWith('field:')?binding.slice(6):binding.slice(binding.indexOf('=')+1);
   if(!meaning||meaning===normalize(code)&&!['none','standard'].includes(meaning)||/^[A-Z0-9_./+-]+$/.test(english.trim()))continue;
   const context=JSON.stringify([group,binding,meaning]),row=contexts.get(context)||{ids:new Set<string>(),models:new Set<string>()};
   const id=meta.bindings[binding];if(id&&terms[id])row.ids.add(id);
   row.models.add(model);contexts.set(context,row);byRuntime.set('runtime:'+model+':'+binding,context);
   const referenceKey=JSON.stringify([group,binding]),meanings=references.get(referenceKey)||new Set<string>();meanings.add(context);references.set(referenceKey,meanings);
  }
 }
 const targets=new Map<string,Target>();
 for(const[id,context]of byRuntime){
  const row=contexts.get(context)!;if(row.ids.size>1)continue; // Historical ambiguity needs review, never arbitrary winner selection.
  const[group]=JSON.parse(context)as[Group];
  const existing=[...row.ids][0],def=terms[existing];
  targets.set(id,def?{key:inventoryKey(group==='desks'?'rasomieji-stalai-ir-darbo-vietos':'kedes',existing),sourceHash:def.sourceHash,affected:row.models.size}:{key:'shared-runtime:'+group+':'+hash(context),sourceHash:hash(context),affected:row.models.size});
 }
 return {
  target(category:string,id:string){
   const group=groupFor(category),own=byRuntime.get(id),match=id.match(/^runtime:([^:]+):((?:field:|value:).+)$/);
   if(!match||!models[match[1]])return;
   const modelGroup=models[match[1]].path.startsWith('/produktai/rasomieji-stalai-ir-darbo-vietos/')?'desks':'chairs';if(modelGroup!==group)return;
   if(own)return JSON.parse(own)[0]===group?targets.get(id):undefined;
   // Missing per-model originals can inherit an exact field/value reference
   // only if all captured originals in that furniture group agree. The UI
   // continues to identify this as a reference, not a model-specific original.
   const refs=references.get(JSON.stringify([group,match[2]]));if(refs?.size!==1)return;
   const context=[...refs][0],row=contexts.get(context)!;if(row.ids.size>1)return;
   const existing=[...row.ids][0],def=terms[existing];
   return def?{key:inventoryKey(category,existing),sourceHash:def.sourceHash,affected:row.models.size+(row.models.has(match[1])?0:1)}:{key:'shared-runtime:'+group+':'+hash(context),sourceHash:hash(context),affected:row.models.size+(row.models.has(match[1])?0:1)};
  },
 };
}

// A shared stored edit has its canonical source hash; the unchanged local
// definition keeps its old hash for callers and concurrency validation.
export function sharedEditForDefinition(def:TextDefinition,edit:TextEdit|undefined,target?:Target){
 if(!edit||!target||edit.source_hash!==target.sourceHash)return edit;
 return {...edit,source_hash:def.sourceHash,published_hash:edit.published_hash===target.sourceHash?def.sourceHash:edit.published_hash};
}

export function runtimeReviewEdits(def:TextDefinition,model:string,edits:Map<string,TextEdit>,target?:Target){
 const explicit=edits.get('local:'+model+':'+def.id),legacy=target&&edits.get(def.id);
 const local=explicit||(legacy?{...legacy,key:'local:'+model+':'+def.id}:undefined);
 const global=sharedEditForDefinition(def,edits.get(target?.key||def.id),target);
 return {local,global};
}
