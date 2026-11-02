import type {Asset} from './expanded-configurator';
import type {DeskColors,DeskColorPlan} from './desk-colors';
type Values=Record<string,string>;

/** Only sealed, exact geometry/material/world-matrix matches are paintable. */
export function deskColorPlan(colors:DeskColors,values:Values,assets:Asset[]):DeskColorPlan{
 const plan:DeskColorPlan={materials:{},hidden:[],assets:[],pending:[]};
 const targets=assets.flatMap(a=>(colors.bindings[a.assetSha256]||[]).map(t=>({key:a.assetSha256+':'+t.node+':'+t.primitive,...t})));
 const sameSize=Object.entries(colors.baseDimensions).every(([k,v])=>values[k]===v);
 const claims=new Map<string,{id:string;field:string}[]>();
 for(const [key,f]of Object.entries(colors.fields)){
  const selected=values[key];if(!selected||selected===f.default)continue;
  const v=f.values[selected];if(!v){plan.pending.push(key);continue;}
  if(v.mode==='pending'){plan.pending.push(key);continue;}
  if(f.owners.some(owner=>values[owner]==='NONE'))continue;
  // Material bindings already identify exact original asset/node/primitive
  // witnesses. Stored selectors from inactive components must not block the
  // current assembly. No binding is inferred from size, names or material alone.
  if(v.mode==='material'){
   const active=[...new Set(targets.flatMap(t=>t.selectors.filter(s=>s.field===key).map(s=>s.selectorId)))];
   if(!active.length||active.some(id=>new Set(v.assignments.filter(a=>a.selectorId===id).map(a=>a.materialId)).size!==1||targets.filter(t=>t.selectors.some(s=>s.field===key&&s.selectorId===id)).length!==1)){plan.pending.push(key);continue;}
  }
  const indexed=new Map(v.assignments.map(a=>[a.selectorId,a.materialId]));let count=0;
  if(v.mode==='partSwap'){
   // Geometry replacement retains the original captured-size guard.
   if(!sameSize){plan.pending.push(key);continue;}
   const removed=(v.removeSelectors||[]).map(id=>targets.filter(t=>t.selectors.some(s=>s.field===key&&s.selectorId===id)));
   if(removed.some(matches=>matches.length!==1)){plan.pending.push(key);continue;}
   plan.hidden.push(...removed.flat().map(t=>t.key));plan.assets.push(...v.assets||[]);count=removed.length;
  }else for(const t of targets){const ids=[...new Set(t.selectors.filter(s=>s.field===key).map(s=>indexed.get(s.selectorId)).filter((id):id is string=>!!id))];
   if(ids.length!==1)continue;claims.set(t.key,[...claims.get(t.key)||[],{id:ids[0],field:key}]);count++;
  }
  if(!count)plan.pending.push(key);
 }
 for(const [key,values]of claims){if(new Set(values.map(v=>v.id)).size===1)plan.materials[key]=values[0].id;else plan.pending.push(...values.map(v=>v.field));}
 plan.pending=[...new Set(plan.pending)];plan.hidden=[...new Set(plan.hidden)];plan.assets=[...new Map(plan.assets.map(a=>[a.assetSha256,a])).values()];return plan;
}
