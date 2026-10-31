import type {CatalogRuntime,CatalogAnchor} from './catalog-configurator';
import type {Asset,Patch} from './expanded-configurator';

type Values=Record<string,string>;
type Part={file:string;sha256:string;componentSha256:string;bytes:number;needsCompression:false};
type Context={dimensions:Values;choiceRules:'conditional selectable tuples only';invariant:Part|null;groups:{fields:string[];variants:{values:Values;asset:Part|null}[]}[];textOnly:Record<string,string[]>;default3DValues?:Record<string,string|null>;hybrid141?:boolean};
export type ChairComponents={schema:'desk-components-065-v1';code:string;coordinates:'original-world-matrices';finishPolicy:'original manufacturer finishes; no FINISH setters';fullGraphClosed:false;contexts:Context[]};
export type ChairIdentity={code:string;productId:string;sample:string;familyId:string};
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const field=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(v);
const scalar=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=100&&!/[\x00-\x1f]/.test(v);
const tuple=(v:unknown):v is Values=>plain(v)&&Object.entries(v).every(([k,x])=>field(k)&&scalar(x));
const key=(v:Values)=>JSON.stringify(Object.entries(v).sort());
const matches=(a:Values,b:Values,except?:string)=>Object.entries(a).every(([k,v])=>k===except||b[k]===v);
function fail():never{throw Error('Invalid prepared chair component table');}
/** Distinct chair admission; the existing desk validator is not broadened. */
export function validateChairComponents(input:unknown,code:string):asserts input is ChairComponents{
 validateChairTable(input,code,true);
}
/** The separate review selects one complete captured context at a time.
 * Unlike the catalog adapter, it never derives independent dimension choices
 * between contexts that have different axes. All other source guards apply. */
export function validateChairReviewComponents(input:unknown,code:string):asserts input is ChairComponents{
 validateChairTable(input,code,false);
}
function validateChairTable(input:unknown,code:string,consistentAxes:boolean):asserts input is ChairComponents{
 if(!plain(input)||input.schema!=='desk-components-065-v1'||input.code!==code||!/^K[A-Z0-9]{2,79}$/.test(code)||input.coordinates!=='original-world-matrices'||input.finishPolicy!=='original manufacturer finishes; no FINISH setters'||input.fullGraphClosed!==false||!Array.isArray(input.contexts)||!input.contexts.length||input.contexts.length>1000)fail();
 const contexts=new Set<string>(),parts=new Map<string,string>();
 const part=(a:unknown)=>{
  if(!plain(a)||typeof a.componentSha256!=='string'||!/^[a-f0-9]{64}$/.test(a.componentSha256)||a.file!=='assets/'+a.componentSha256+'.glb'||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256)||!Number.isSafeInteger(a.bytes)||Number(a.bytes)<=0||Number(a.bytes)>25*1024*1024||a.needsCompression!==false)fail();
  const previous=parts.get(String(a.file)),encoded=JSON.stringify([a.sha256,a.bytes,a.componentSha256]);if(previous&&previous!==encoded)fail();parts.set(String(a.file),encoded);
 };
 let axes:string|undefined;
 for(const c of input.contexts){
  if(!plain(c)||c.choiceRules!=='conditional selectable tuples only'||!tuple(c.dimensions)||!Array.isArray(c.groups)||c.groups.length>30||!plain(c.textOnly))fail();
  // Chair context keys include captured seat dimensions, colour-version
  // construction axes and fixed ranges. Never turn a range into new poses.
  const currentAxes=Object.keys(c.dimensions).sort().join(',');if(consistentAxes&&axes!==undefined&&axes!==currentAxes)fail();axes=currentAxes;
  const id=key(c.dimensions);if(contexts.has(id))fail();contexts.add(id);
  if(c.invariant!==null)part(c.invariant);
  if(!c.groups.length&&(c.hybrid141!==true||c.invariant===null))fail();
  const occupied=new Set(Object.keys(c.dimensions));
  for(const g of c.groups){
   if(!plain(g)||!Array.isArray(g.fields)||!g.fields.every(field)||new Set(g.fields).size!==g.fields.length||!Array.isArray(g.variants)||!g.variants.length||g.variants.length>5000||!g.fields.length&&g.variants.length!==1)fail();
   for(const f of g.fields){if(occupied.has(f))fail();occupied.add(f);}
   const seen=new Set<string>();
   for(const v of g.variants){
    if(!plain(v)||!tuple(v.values)||Object.keys(v.values).sort().join(',')!==[...g.fields].sort().join(','))fail();
    const id=key(v.values);if(seen.has(id))fail();seen.add(id);if(v.asset!==null)part(v.asset);
   }
  }
  if(c.invariant===null&&!(c.groups as Context['groups']).some(g=>g.variants.every(v=>v.asset!==null)))fail();
  for(const [f,values] of Object.entries(c.textOnly)){
   if(!field(f)||occupied.has(f)||!Array.isArray(values)||!values.every(scalar)||new Set(values).size!==values.length)fail();occupied.add(f);
  }
  if(c.default3DValues!==undefined){
   if(!plain(c.default3DValues))fail();
   for(const [f,v] of Object.entries(c.default3DValues)){
    const domain=c.textOnly[f];if(!Array.isArray(domain)||(v===null?domain.length!==0:!scalar(v)||domain.length>0&&!domain.includes(v)))fail();
   }
  }
 }
}
function reference(code:string,p:Part):Asset{return {asset:'/models/configurator/components/'+code+'-'+p.sha256.slice(0,20)+'.glb',assetSha256:p.sha256,bytes:p.bytes};}
/** Original additive assemblies, using the existing finite tuple engine.
 * Its historical internal mode is called desk-components; no desk admission,
 * palette application, candidate registration or public-loader hook is added.
 */
export function adaptChairComponents(source:ChairComponents,id:ChairIdentity,initialValues:Values={}):CatalogRuntime{
 validateChairComponents(source,id.code);
 if(!/^cfg-[a-f0-9]{12}$/.test(id.familyId)||!/^\d{1,30}$/.test(id.sample)||!/^[A-Za-z0-9_-]{1,200}$/.test(id.productId))fail();
 const contexts=[...source.contexts],initial=contexts.findIndex(c=>matches(c.dimensions,initialValues));
 if(initial>0)contexts.unshift(...contexts.splice(initial,1));
 const anchors:CatalogAnchor[]=contexts.map((c,index)=>{
  const defaults:Values={...c.dimensions},choices:Record<string,string[]>={};
  for(const [f,values] of Object.entries(c.textOnly)){
   if(values.length){choices[f]=[...values];defaults[f]=c.default3DValues?.[f]??values[0];}
   else if(c.default3DValues?.[f]!=null)defaults[f]=c.default3DValues[f]!;
  }
  for(const f of Object.keys(c.dimensions))choices[f]=[...new Set(contexts.filter(other=>matches(c.dimensions,other.dimensions,f)).map(other=>other.dimensions[f]))];
  const components=c.groups.map(g=>{
   const selected=g.variants.find(v=>matches(v.values,initialValues))||g.variants[0];Object.assign(defaults,selected.values);
   return {fields:[...g.fields],variants:g.variants.map((v,n)=>{
    const available=Object.fromEntries(g.fields.map(f=>[f,[...new Set(g.variants.filter(other=>matches(v.values,other.values,f)).map(other=>other.values[f]))]]));
    const patch:Patch={remove:[],addIds:[],changes:{},choices:{},geometry:v.asset?reference(id.code,v.asset):null};
    return {key:String(n),values:{...v.values},defaults:{},choices:available,transitions:{},patch};
   })};
  });
  return {id:id.code+':chair-components-'+index,article:id.code,sample:id.sample,name:id.code,axes:Object.keys(c.dimensions),defaults,choices,classes:{},geometry:c.invariant?reference(id.code,c.invariant):null,components,profiles:[],textOnlyFields:Object.keys(c.textOnly).filter(f=>c.textOnly[f].length)};
 });
 return {family:{id:id.familyId,kind:'catalog',productId:id.productId,baseArticle:id.code,sample:id.sample,articles:[{code:id.code,sample:id.sample,name:id.code}],anchors,collectionMode:'desk-components'},palettes:{}};
}
