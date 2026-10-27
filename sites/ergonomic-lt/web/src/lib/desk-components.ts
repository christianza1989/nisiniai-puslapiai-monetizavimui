import type {CatalogRuntime,CatalogAnchor} from './catalog-configurator';
import type {Asset,Patch} from './expanded-configurator';

type Values=Record<string,string>;
export type DeskAsset={file:string;sha256:string;componentSha256:string;bytes:number;needsCompression:boolean};
export type DeskContext={dimensions:Values;choiceRules:'conditional selectable tuples only';invariant:DeskAsset|null;groups:{fields:string[];variants:{values:Values;asset:DeskAsset|null}[]}[];textOnly:Record<string,string[]>;default3DValues?:Record<string,string|null>;hybrid141?:boolean};
export type DeskComponents={schema:'desk-components-065-v1';code:string;coordinates:'original-world-matrices';finishPolicy:'original manufacturer finishes; no FINISH setters';fullGraphClosed:false;contexts:DeskContext[];dimensionChoices?:Values[];textOnlyDimensionChoices?:Values[];missing3D?:string[];unavailable3DMessage?:string};
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
  if(!Object.keys(c.dimensions as Values).every(f=>['GDDEPTH','GDWIDTH','GDTOPDEPTH','GDTOPWIDTH','GDTOPSDEPTH','GDTOPSWIDTH','DDEPTH','DWIDTH','DTOPDEPTH','DTOPWIDTH'].includes(f))||!Object.values(c.dimensions as Values).every(v=>/^_\d+(?:X\d+)*$/.test(v)))fail();
  const key=JSON.stringify(Object.entries(c.dimensions as Values).sort());if(contexts.has(key))fail();contexts.add(key);if(c.invariant!==null)checkAsset(c.invariant);
  if(!Array.isArray(c.groups)||c.groups.length>30||!plain(c.textOnly))fail();
  // A supplied hybrid may contain one intact original scene and only textual
  // options. An empty component list must not invent geometry alternatives.
  if(!c.groups.length&&(c.hybrid141!==true||!plain(c.default3DValues)||!Object.keys(c.textOnly).length))fail();
  const fields=new Set(Object.keys(c.dimensions as Values));
  for(const g of c.groups as DeskContext['groups']){
   if(!plain(g)||!Array.isArray(g.fields)||!g.fields.every(field)||new Set(g.fields).size!==g.fields.length||!Array.isArray(g.variants)||!g.variants.length||g.variants.length>5000||!g.fields.length&&g.variants.length!==1)fail();
   for(const f of g.fields){if(fields.has(f)||/COLOR|FINISH|GROUP/.test(f))fail();fields.add(f);}
   const tuples=new Set<string>();
   for(const v of g.variants){
    if(!plain(v))fail();if(g.fields.length)values(v.values);else if(!plain(v.values)||Object.keys(v.values).length)fail();if(Object.keys(v.values).sort().join(',')!==[...g.fields].sort().join(','))fail();
    const key=JSON.stringify(Object.entries(v.values).sort());if(tuples.has(key))fail();tuples.add(key);if(v.asset!==null)checkAsset(v.asset);
   }
  }
  // No common invariant is legitimate when a supplied group always provides
  // real geometry. Do not invent a base, or admit an empty assembled scene.
  if(c.invariant===null&&!(c.groups as DeskContext['groups']).some(g=>g.variants.every(v=>v.asset!==null)))fail();
  for(const [f,domain] of Object.entries(c.textOnly as Record<string,unknown>)){
   if(!field(f)||fields.has(f)||/COLOR|FINISH|GROUP/.test(f)||!Array.isArray(domain)||!domain.every(value)||new Set(domain).size!==domain.length)fail();fields.add(f);
  }
  if(c.default3DValues!==undefined){
   if(!plain(c.default3DValues))fail();
   for(const [f,v] of Object.entries(c.default3DValues)){
    const domain=(c.textOnly as Record<string,string[]>)[f];
    // A source may retain the current read-only value while offering no
    // alternatives. Keep that explicit captured default, never invent a
    // selectable singleton. Nonempty domains still require membership.
    if(!domain||(v===null?domain.length!==0:!value(v)||(domain.length>0&&!domain.includes(v))))fail();
   }
  }
 }
 if(input.dimensionChoices!==undefined||input.textOnlyDimensionChoices!==undefined||input.missing3D!==undefined||input.unavailable3DMessage!==undefined){
  // Only the explicitly supplied unavailable tuple is admitted. It receives
  // no substitute geometry or inferred component specification.
  if(code!=='KEM2013WW009'||JSON.stringify(input.missing3D)!==JSON.stringify(['1800×900X800'])||input.unavailable3DMessage!=='3D peržiūra šiam dydžiui neprieinama'||!Array.isArray(input.dimensionChoices)||!Array.isArray(input.textOnlyDimensionChoices)||JSON.stringify(input.textOnlyDimensionChoices)!==JSON.stringify([{DDEPTH:'_900X800',DWIDTH:'_1800'}]))fail();
  const declared=new Set<string>();
  for(const d of input.dimensionChoices){values(d);const key=JSON.stringify(Object.entries(d as Values).sort());if(declared.has(key))fail();declared.add(key);}
  const missing=JSON.stringify(Object.entries(input.textOnlyDimensionChoices[0] as Values).sort());
  if(contexts.has(missing)||declared.size!==contexts.size+1||!declared.has(missing)||[...contexts].some(k=>!declared.has(k)))fail();
 }
}
export function deskAssetReference(code:string,a:DeskAsset):Asset{return {asset:'/models/configurator/components/'+code+'-'+a.sha256.slice(0,20)+'.glb',assetSha256:a.sha256,bytes:a.bytes};}
export function deskReferencedAssets(source:DeskComponents){return [...new Map(source.contexts.flatMap(c=>[...(c.invariant?[c.invariant]:[]),...c.groups.flatMap(g=>g.variants.flatMap(v=>v.asset?[v.asset]:[]))]).map(a=>[a.file,a])).values()];}
/** Adapt original world-space parts to the existing additive assembly path. */
export function adaptDeskComponents(source:DeskComponents,id:DeskIdentity):CatalogRuntime{
 validateDeskComponents(source,id.code);
 const dimensions=[...source.contexts.map(c=>c.dimensions),...source.textOnlyDimensionChoices||[]];
 const dimensionChoices=(d:Values)=>Object.fromEntries(Object.keys(d).map(f=>[f,[...new Set(dimensions.filter(other=>matches(d,other,f)).map(other=>other[f]))]]));
 const anchors:CatalogAnchor[]=source.contexts.map((c,index)=>{
  const defaults:Values={...c.dimensions},choices:Record<string,string[]>=Object.fromEntries(Object.entries(c.textOnly).filter(([,domain])=>domain.length));
  for(const [f,domain] of Object.entries(choices))defaults[f]=c.default3DValues?.[f]??domain[0];
  for(const [f,v]of Object.entries(c.default3DValues||{}))if(v!==null&&!c.textOnly[f].length)defaults[f]=v;
  // Only dimension pairs explicitly present in the table are selectable.
  Object.assign(choices,dimensionChoices(c.dimensions));
  const components=c.groups.map(g=>{
   Object.assign(defaults,g.variants[0].values);
   return {fields:g.fields,variants:g.variants.map((v,n)=>{
    const available=Object.fromEntries(g.fields.map(f=>[f,[...new Set(g.variants.filter(other=>matches(v.values,other.values,f)).map(other=>other.values[f]))]]));
    const patch:Patch={remove:[],addIds:[],changes:{},choices:{},geometry:v.asset?deskAssetReference(id.code,v.asset):null};
    return {key:String(n),values:v.values,defaults:{},choices:available,transitions:{},patch};
   })};
  });
  return {id:id.code+':components-'+index,article:id.code,sample:id.sample,name:id.code,axes:Object.keys(c.dimensions),defaults,choices,classes:{},geometry:c.invariant?deskAssetReference(id.code,c.invariant):null,components,profiles:[],textOnlyFields:Object.keys(c.textOnly).filter(f=>c.textOnly[f].length)};
 });
 for(const [index,d] of (source.textOnlyDimensionChoices||[]).entries())anchors.push({id:id.code+':unavailable-'+index,article:id.code,sample:id.sample,name:id.code,axes:Object.keys(d),defaults:{...d},choices:dimensionChoices(d),classes:{},geometry:null,unavailable3D:source.unavailable3DMessage,components:[],profiles:[]});
 const labels:Record<string,string>={GDWIDTH:'Plotis',GDDEPTH:'Gylis',FBASEFEET:'Pagrindas',FCASTORS:'Ratukai',FCABLECOVER:'Laidų uždanga',FHADJUSTMENTWAY:'Aukščio valdymas',FHORWIRETRUNKING:'Horizontalus laidų kanalas',FVERWIRETRUNKING:'Vertikalus laidų kanalas',FMEDIAPORTLEFT:'Kairysis įvadas',FMEDIAPORTMIDDLE:'Vidurinis įvadas',FMEDIAPORTRIGHT:'Dešinysis įvadas',FSOCKETSTANDARD:'Lizdo standartas'};
 Object.assign(labels,{GDTOPWIDTH:'Stalviršio plotis',GDTOPDEPTH:'Stalviršio gylis',DTOPWIDTH:'Stalviršio plotis',DTOPDEPTH:'Stalviršio gylis',DWIDTH:'Plotis',DDEPTH:'Gylis',DTOPTHICKNESS:'Stalviršio storis',FDESKTOPTYPE:'Stalviršio tipas',FPANEL:'Uždanga',FUPPERPANEL:'Viršutinė pertvara',FCOLUMNSHAPE:'Kolonos forma',FCOLUMN:'Kolona',FBASE:'Pagrindo tipas',FTOPSHAPE:'Stalviršio forma',FWIRETRUNKING:'Laidų kanalas',FMODESTYPANEL:'Priekinė uždanga',FSOCKETMEDIAPORTLEFT:'Kairiojo įvado lizdas'});
 Object.assign(labels,{FCONFIGURATIONMEDIARIGHT:'Dešiniojo įvado komplektacija',FSOCKETMEDIAPORTRIGHT:'Dešiniojo įvado lizdas',FSOCKETMEDIAPORT:'Elektros lizdo standartas',FPANELACCESSORIES:'Pertvaros priedai',FTOPACCESSORIES:'Stalviršio priedai',FPEDESTAL:'Stalčių blokas',FHEIGHTADJUSTMENT:'Aukščio reguliavimas'});
 Object.assign(labels,{GDTOPSWIDTH:'Stalviršių plotis',GDTOPSDEPTH:'Stalviršių gylis'});
 const dimensionLabels=Object.fromEntries(dimensions.flatMap(d=>Object.entries(d).map(([f,v])=>[f+'='+v,{text:v.slice(1)}])));
 return {family:{id:id.familyId,kind:'catalog',productId:id.productId,baseArticle:id.code,sample:id.sample,articles:[{code:id.code,sample:id.sample,name:id.code}],anchors,collectionMode:'desk-components'},palettes:{_fieldLabels:Object.fromEntries(Object.entries(labels).map(([k,text])=>[k,{text}])),_valueLabels:dimensionLabels}};
}
