/** One merchandising flag, shared by admin views and work queue projections.
 * Historical source identities remain available; visibility never deletes them.
 */
export function activeModels<T extends {active:boolean}>(models:readonly T[]):T[]{return models.filter(m=>m.active);}
export function visibleModels<T extends {active:boolean}>(models:readonly T[],showHidden=false):T[]{return showHidden?[...models]:activeModels(models);}
export function activePriorityOrder(models:readonly {key:string;active:boolean}[],order:readonly string[]):string[]{
 const keys=new Set(activeModels(models).map(m=>m.key));return [...new Set(order)].filter(key=>keys.has(key));
}
export function textQueue<T extends {key:string;active:boolean;geometryAccepted:boolean;geminiReady:boolean}>(models:readonly T[],order:readonly string[],draftKeys:readonly string[]=[]):T[]{
 const ranks=new Map(activePriorityOrder(models,order).map((key,i)=>[key,i]));const drafts=new Set(draftKeys);
 return activeModels(models).filter(m=>m.geometryAccepted&&!m.geminiReady&&!drafts.has(m.key)).sort((a,b)=>(ranks.get(a.key)??Number.MAX_SAFE_INTEGER)-(ranks.get(b.key)??Number.MAX_SAFE_INTEGER));
}
