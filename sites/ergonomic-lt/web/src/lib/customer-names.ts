const matchers=new WeakMap<Set<string>,{size:number;matcher?:RegExp}>();
/** Never fall back to a supplier identifier when a customer-facing name is missing. */
export function customerLabel(text:string|undefined,codes:Iterable<string>,fallback:string){
 let value=text||'';
 const set=codes instanceof Set?codes:undefined,cached=set?matchers.get(set):undefined;
 let matcher=cached?.size===set?.size?cached?.matcher:undefined;
 if(!cached||cached.size!==set?.size){
  const identities=[...new Set(codes)].filter(c=>c.length>=2&&!/^\d+$/.test(c)&&!['NONE','TRUE','FALSE'].includes(c)).sort((a,b)=>b.length-a.length);
  const patterns=identities.map(code=>{const escaped=code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),parts=code.match(/[A-Z]+|[0-9]+/g),spaced=parts?.map(p=>/^[A-Z]+$/.test(p)?p.split('').join('[-_]?'):p).join('[\\s_-]*');return escaped+(spaced?'|'+spaced:'');});
  matcher=patterns.length?new RegExp('(^|[^\\p{L}\\p{N}])(?:'+patterns.join('|')+')(?=$|[^\\p{L}\\p{N}])','gu'):undefined;
  if(set)matchers.set(set,{size:set.size,matcher});
 }
 if(matcher)value=value.replace(matcher,'$1');
 value=value.replace(/\bK[A-Z]{2,8}\d[A-Z0-9]{5,}\b/g,'').replace(/\bC[A-Z]{4,}\b/g,'').replace(/\bR\d{2}[A-Z0-9]*\b/g,'').replace(/\b(?:Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co)\b/gi,'').replace(/(?:\s*[·|=]\s*)+/g,' · ').replace(/^[\s·|=,;–-]+|[\s·|=,;–-]+$/g,'').replace(/\s+/g,' ').trim();
 return value||fallback;
}
