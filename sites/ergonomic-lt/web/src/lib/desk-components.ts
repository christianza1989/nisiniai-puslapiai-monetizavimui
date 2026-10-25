import type {CatalogRuntime,CatalogAnchor} from './catalog-configurator';
import type {Asset,Patch} from './expanded-configurator';

type Values=Record<string,string>;
export type DeskAsset={file:string;sha256:string;componentSha256:string;bytes:number;needsCompression:boolean};
export type DeskContext={dimensions:Values;choiceRules:'conditional selectable tuples only';invariant:DeskAsset;groups:{fields:string[];variants:{values:Values;asset:DeskAsset|null}[]}[];textOnly:Record<string,string[]>};
export type DeskComponents={schema:'desk-components-065-v1';code:string;coordinates:'original-world-matrices';finishPolicy:'original manufacturer finishes; no FINISH setters';fullGraphClosed:false;contexts:DeskContext[]};
export type DeskIdentity={productId:string;sample:string;familyId:string;code:string};
const matches=(a:Values,b:Values,except?:string)=>Object.entries(a).every(([k,v])=>k===except||b[k]===v);
const field=(s:unknown):s is string=>typeof s==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(s);
const value=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=100;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function fail():never{throw Error('Invalid prepared desk component runtime');}
function values(v:unknown){if(!plain(v)||!Object.keys(v).length||!Object.entries(v).every(([k,v])=>field(k)&&value(v)))fail();}
function asset(a:unknown){
 if(!plain(a)||typeof a.file!=='string'||!/^assets\/[a-f0-9]{64}\.glb$/.test(a.file)||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256)||typeof a.componentSha256!=='string'||a.file!=='assets/'+a.componentSha256+'.glb'||!Number.isSafeInteger(a.bytes)||Number(a.bytes)<=0||Number(a.bytes)>25*1024*1024||a.needsCompression!==false)fail();
}
/** This certifies the finite component table, never a closed Native graph. */
export function validateDeskComponents(input:unknown,code:string):asserts input is DeskComponents{
 if(!plain(input)||input.schema!=='desk-components-065-v1'||input.code!==code||input.coordinates!=='original-world-matrices'||input.finishPolicy!=='original manufacturer finishes; no FINISH setters'||input.fullGraphClosed!==false||!Array.isArray(input.contexts)||!input.contexts.length||input.contexts.length>1000)fail();
 const contexts=new Set<string>(),assets=new Map<string,string>();
 const checkAsset=(a:unknown)=>{asset(a);const x=a as DeskAsset,old=assets.get(x.file);if(old&&old!==JSON.stringify(x))fail();assets.set(x.file,JSON.stringify(x));};
 for(const c of input.contexts){
  if(!plain(c)||c.choiceRules!=='conditional selectable tuples only')fail();values(c.dimensions);
  if(Object.keys(c.dimensions as Values).sort().join(',')!=='GDDEPTH,GDWIDTH'||!Object.values(c.dimensions as Values).every(v=>/^_\d+$/.test(v)))fail();
  const key=JSON.stringify(Object.entries(c.dimensions as Values).sort());if(contexts.has(key))fail();contexts.add(key);checkAsset(c.invariant);
  if(!Array.isArray(c.groups)||!c.groups.length||c.groups.length>30||!plain(c.textOnly))fail();
  const fields=new Set(Object.keys(c.dimensions as Values));
  for(const g of c.groups as DeskContext['groups']){
   if(!plain(g)||!Array.isArray(g.fields)||!g.fields.length||!g.fields.every(field)||new Set(g.fields).size!==g.fields.length||!Array.isArray(g.variants)||!g.variants.length||g.variants.length>5000)fail();
   for(const f of g.fields){if(fields.has(f)||/COLOR|FINISH|GROUP/.test(f))fail();fields.add(f);}
   const tuples=new Set<string>();
   for(const v of g.variants){
    if(!plain(v))fail();values(v.values);if(Object.keys(v.values).sort().join(',')!==[...g.fields].sort().join(','))fail();
    const key=JSON.stringify(Object.entries(v.values).sort());if(tuples.has(key))fail();tuples.add(key);if(v.asset!==null)checkAsset(v.asset);
   }
  }
  for(const [f,domain] of Object.entries(c.textOnly as Record<string,unknown>)){
   if(!field(f)||fields.has(f)||/COLOR|FINISH|GROUP/.test(f)||!Array.isArray(domain)||!domain.length||!domain.every(value)||new Set(domain).size!==domain.length)fail();fields.add(f);
  }
 }
}
export function deskAssetReference(code:string,a:DeskAsset):Asset{return {asset:'/models/configurator/components/'+code+'-'+a.sha256.slice(0,20)+'.glb',assetSha256:a.sha256,bytes:a.bytes};}
export function deskReferencedAssets(source:DeskComponents){return [...new Map(source.contexts.flatMap(c=>[c.invariant,...c.groups.flatMap(g=>g.variants.flatMap(v=>v.asset?[v.asset]:[]))]).map(a=>[a.file,a])).values()];}
/** Adapt original world-space parts to the existing additive assembly path. */
export function adaptDeskComponents(source:DeskComponents,id:DeskIdentity):CatalogRuntime{
 validateDeskComponents(source,id.code);
 const anchors:CatalogAnchor[]=source.contexts.map((c,index)=>{
  const defaults:Values={...c.dimensions},choices:Record<string,string[]>={...c.textOnly};
  for(const [f,domain] of Object.entries(c.textOnly))defaults[f]=domain[0];
  // Only dimension pairs explicitly present in the table are selectable.
  for(const f of Object.keys(c.dimensions))choices[f]=[...new Set(source.contexts.filter(other=>matches(c.dimensions,other.dimensions,f)).map(other=>other.dimensions[f]))];
  const components=c.groups.map(g=>{
   Object.assign(defaults,g.variants[0].values);
   return {fields:g.fields,variants:g.variants.map((v,n)=>{
    const available=Object.fromEntries(g.fields.map(f=>[f,[...new Set(g.variants.filter(other=>matches(v.values,other.values,f)).map(other=>other.values[f]))]]));
    const patch:Patch={remove:[],addIds:[],changes:{},choices:{},geometry:v.asset?deskAssetReference(id.code,v.asset):null};
    return {key:String(n),values:v.values,defaults:{},choices:available,transitions:{},patch};
   })};
  });
  return {id:id.code+':components-'+index,article:id.code,sample:id.sample,name:id.code,axes:Object.keys(c.dimensions),defaults,choices,classes:{},geometry:deskAssetReference(id.code,c.invariant),components,profiles:[]};
 });
 const labels:Record<string,string>={GDWIDTH:'Plotis',GDDEPTH:'Gylis',FBASEFEET:'Pagrindas',FCASTORS:'Ratukai',FCABLECOVER:'Laidų uždanga',FHADJUSTMENTWAY:'Aukščio valdymas',FHORWIRETRUNKING:'Horizontalus laidų kanalas',FVERWIRETRUNKING:'Vertikalus laidų kanalas',FMEDIAPORTLEFT:'Kairysis įvadas',FMEDIAPORTMIDDLE:'Vidurinis įvadas',FMEDIAPORTRIGHT:'Dešinysis įvadas',FSOCKETSTANDARD:'Lizdo standartas'};
 const dimensionLabels=Object.fromEntries(source.contexts.flatMap(c=>Object.entries(c.dimensions).map(([f,v])=>[f+'='+v,{text:v.slice(1)}])));
 return {family:{id:id.familyId,kind:'catalog',productId:id.productId,baseArticle:id.code,sample:id.sample,articles:[{code:id.code,sample:id.sample,name:id.code}],anchors,collectionMode:'desk-components'},palettes:{_fieldLabels:Object.fromEntries(Object.entries(labels).map(([k,text])=>[k,{text}])),_valueLabels:dimensionLabels}};
}
