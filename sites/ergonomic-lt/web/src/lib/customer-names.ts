import {hasDescriptionFormatting} from './product-description';
import {furnitureTerminology} from './furniture-terminology';
const matchers=new WeakMap<Set<string>,{size:number;matcher?:RegExp}>();
/** Never fall back to a supplier identifier when a customer-facing name is missing. */
export function customerLabel(text:string|undefined,codes:Iterable<string>,fallback:string){
 let value=text||'';
 const set=codes instanceof Set?codes:undefined,cached=set?matchers.get(set):undefined;
 let matcher=cached?.size===set?.size?cached?.matcher:undefined;
 if(!cached||cached.size!==set?.size){
  const identities=[...new Set(codes)].filter(c=>c.length>=2&&!/^\d+$/.test(c)&&!['NONE','TRUE','FALSE'].includes(c)).sort((a,b)=>b.length-a.length);
  const patterns=identities.map(code=>{const escaped=code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),parts=code.match(/[A-Z]+|[0-9]+/g),spaced=/[A-Z]/.test(code)?parts?.map(p=>/^[A-Z]+$/.test(p)?p.split('').join('[-_]?'):p).join('[\\s_-]*'):undefined;return escaped+(spaced?'|'+spaced:'');});
  matcher=patterns.length?new RegExp('(^|[^\\p{L}\\p{N}])(?:'+patterns.join('|')+')(?=$|[^\\p{L}\\p{N}])','gu'):undefined;
  if(set)matchers.set(set,{size:set.size,matcher});
 }
 if(matcher)value=value.replace(matcher,'$1');
 value=value.replace(/\bK[A-Z]{2,8}\d[A-Z0-9]{5,}\b/g,'').replace(/\bC[A-Z]{4,}\b/g,'').replace(/\bR\d{2}[A-Z0-9]*\b/g,'').replace(/\b(?:Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co)\b/gi,'').replace(/(?:\s*[·|=]\s*)+/g,' · ').replace(/^[\s·|=,;–-]+|[\s·|=,;–-]+$/g,'').replace(/\s+/g,' ').trim();
 value=value.replace(/^Be šio elemento\s*\(NONE\)$/i,'Nėra').replace(/\(\s*\)|\[\s*\]/g,'').replace(/\s+/g,' ').trim();
 return furnitureTerminology(value||fallback);
}

export function customerDescriptionLabel(text:string,codes:Iterable<string>,fallback:string){
 if(!hasDescriptionFormatting(text))return customerLabel(text,codes,fallback);
 const identities=codes instanceof Set?codes:new Set(codes);
 const lines=text.replace(/\r\n?/g,'\n').split('\n').map(line=>{
  const marker=line.match(/^([ \t]*(?:#{2,3}|[*-])[ \t]+)(.*)$/);
  const value=customerLabel(marker?marker[2]:line,identities,'');
  return value?(marker?marker[1]+value:value):'';
 });
 return lines.join('\n').trim()||fallback;
}

/** A catalogue availability suffix alone is not a colour name after private
 * supplier identifiers have been removed. Retain the existing UI fallback. */
export function customerColourLabel(text:string|undefined,codes:Iterable<string>,fallback:string,colourCodes:Iterable<string>=[]){
 const allowed=[...new Set(colourCodes)].filter(code=>code&&!/^(NONE|UNDEFINED|NOTDEFINED)$/i.test(code));
 if(allowed.length){
  // Owner 2026-11-06: only a verified colour-field value may cross the boundary.
  // Protect its printed spelling while all other supplier codes are removed.
  const saved:string[]=[];let protectedText=text||'';
  for(const code of allowed){const parts=code.match(/[A-Z]+|[0-9]+/g),literal=code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),spaced=parts?.join('[\\s_.-]*');
   const pattern=new RegExp('(^|[^\\p{L}\\p{N}])(?:'+literal+(spaced?'|'+spaced:'')+')(?=$|[^\\p{L}\\p{N}])','gu');
   protectedText=protectedText.replace(pattern,(_all,prefix:string)=>{const original=_all.slice(prefix.length);saved.push(original);return prefix+'colourmarktoken'+(saved.length-1)+'end';});
  }
  let value=customerLabel(protectedText,[...codes].filter(code=>!allowed.includes(code)),'');
  value=value.replace(/colourmarktoken(\d+)end/g,(_all,index:string)=>saved[Number(index)]);
  // Some genuine supplier labels contain only a shade name. Show their
  // verified selector mark as well, without guessing it from the wording.
  if(value&&allowed.length===1&&!saved.length)value=allowed[0]+' · '+value;
  return value||fallback;
 }
 const name=(text||'').replace(/^\d[\d.]*\s+/,'').replace(/\s+[A-Z0-9]{1,3}(?:,\s*[A-Z0-9]{1,3})*\s*$/,'');
 const value=customerLabel(name,codes,'');return !value||/^\(?extended\)?$/i.test(value)?fallback:value;
}
