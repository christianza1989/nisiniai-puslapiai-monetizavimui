/**
 * Immutable catalog exports repeat the same asset descriptors in many states.
 * Share equal JSON subtrees per request so React's transport can reference them
 * instead of serializing every copy. Values, order and model bindings stay exact;
 * there is no global cache or cross-product state.
 */
export function shareCatalogRuntimeData<T>(input:T):T{
 type Entry={id:number;value:unknown};
 const entries=new Map<string,Entry>();let next=0;
 function visit(value:unknown):Entry{
  let key:string,build:()=>unknown;
  if(value===null||typeof value!=='object'){
   key='p:'+typeof value+':'+(Object.is(value,-0)?'-0':JSON.stringify(value));build=()=>value;
  }else if(Array.isArray(value)){
   const children=value.map(visit);key='a:'+children.map(c=>c.id).join(',');build=()=>children.map(c=>c.value);
  }else{
   const children=Object.entries(value).map(([name,v])=>[name,visit(v)] as const);
   key='o:'+children.map(([name,c])=>JSON.stringify(name)+':'+c.id).join(',');
   build=()=>Object.fromEntries(children.map(([name,c])=>[name,c.value]));
  }
  const previous=entries.get(key);if(previous)return previous;
  const entry={id:next++,value:build()};entries.set(key,entry);return entry;
 }
 return visit(input).value as T;
}
