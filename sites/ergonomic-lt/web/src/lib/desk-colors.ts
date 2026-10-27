import type {Asset} from './expanded-configurator';
import {createCatalogEngine,type CatalogRuntime} from './catalog-configurator';

type Values=Record<string,string>;
export type DeskColorTarget={node:number;primitive:number;selectors:{field:string;selectorId:string}[]};
export type DeskColorValue={mode:'material'|'partSwap'|'pending';assignments:{selectorId:string;materialId:string}[];automatic:Values;removeSelectors?:string[];assets?:Asset[];baseSizeOnly?:boolean};
export type DeskColorField={label:string;default:string;owners:string[];selectors:string[];choices:{value:string;text:string;image?:string;color?:string}[];values:Record<string,DeskColorValue>};
export type DeskColors={schema:'desk-color-overlay-v1';code:string;componentRuntimeSha256:string;sourceColorsSha256:string;baseDimensions:Values;fields:Record<string,DeskColorField>;bindings:Record<string,DeskColorTarget[]>;materialIds:string[];materialDocument:Record<string,unknown>};
export type DeskColorPlan={materials:Record<string,string>;hidden:string[];assets:Asset[];pending:string[]};
export const DESK_COLOR_PENDING='Šiai komplektacijai pasirinkta spalva 3D nerodoma';
const hash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const plain=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const field=(x:string)=>/^[A-Z][A-Z0-9_]{0,79}$/.test(x);
const asset=(x:Asset)=>x&&hash(x.assetSha256)&&x.asset==='/models/configurator/components/'+x.asset.split('/').at(-1)&&/^K[A-Z0-9]+-[a-f0-9]{20}\.glb$/.test(x.asset.split('/').at(-1)!)&&x.asset.includes('-'+x.assetSha256.slice(0,20)+'.glb')&&Number.isSafeInteger(x.bytes)&&x.bytes!>0&&x.bytes!<=25*1024*1024;

/** A separately sealed overlay cannot change the original component table. */
export function validateDeskColors(input:unknown,code:string,runtimeSha:string):asserts input is DeskColors{
 function fail():never{throw Error('Invalid prepared desk color overlay');}
 if(!plain(input)||input.schema!=='desk-color-overlay-v1'||input.code!==code||input.componentRuntimeSha256!==runtimeSha||!hash(input.sourceColorsSha256)||!plain(input.baseDimensions)||!Object.entries(input.baseDimensions).length||!Object.entries(input.baseDimensions).every(([k,v])=>field(k)&&typeof v==='string'&&/^_\d+(?:X\d+)*$/.test(v))||!plain(input.fields)||!plain(input.bindings)||!Array.isArray(input.materialIds)||input.materialIds.length>1000||!input.materialIds.every(hash)||new Set(input.materialIds).size!==input.materialIds.length||!plain(input.materialDocument))fail();
 const doc=input.materialDocument;if(doc.asset?.version!=='2.0'||!Array.isArray(doc.materials)||doc.materials.length!==input.materialIds.length||!Array.isArray(doc.images)||doc.images.some((im:any)=>!plain(im)||!/^\/models\/configurator\/desk-colors\/[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(im.uri)||Object.keys(im).some(k=>k!=='uri'))||doc.buffers||doc.bufferViews||doc.nodes||doc.meshes)fail();
 const ids=new Set(input.materialIds),selectors=new Set<string>();
 if(Object.keys(input.fields).length>30)fail();
 for(const [key,f]of Object.entries(input.fields)as[string,DeskColorField][]){
  if(!field(key)||!plain(f)||typeof f.label!=='string'||f.label.length>120||!Array.isArray(f.owners)||!f.owners.every(field)||!Array.isArray(f.selectors)||!f.selectors.every(hash)||new Set(f.selectors).size!==f.selectors.length||!Array.isArray(f.choices)||!f.choices.length||f.choices.length>316||!plain(f.values)||!f.choices.some(c=>c.value===f.default)||new Set(f.choices.map(c=>c.value)).size!==f.choices.length)fail();
  for(const c of f.choices){const v=f.values[c.value];if(typeof c.value!=='string'||!c.value.length||c.value.length>100||typeof c.text!=='string'||c.text.length>160||c.image&&!/^\/models\/configurator\/desk-colors\/[a-f0-9]{64}\.(jpg|png|webp)$/.test(c.image)||c.color&&!/^#[a-f0-9]{6}$/i.test(c.color)||!plain(v)||!['material','partSwap','pending'].includes(v.mode)||!Array.isArray(v.assignments)||!plain(v.automatic)||!Object.entries(v.automatic).every(([k,x])=>field(k)&&/COLOR|COL$/.test(k)&&typeof x==='string'&&x.length<=100))fail();
   for(const a of v.assignments){if(!hash(a.selectorId)||!ids.has(a.materialId))fail();selectors.add(a.selectorId);}
   if(v.mode==='partSwap'&&(v.baseSizeOnly!==true||!Array.isArray(v.removeSelectors)||!v.removeSelectors.length||!v.removeSelectors.every(hash)||!Array.isArray(v.assets)||!v.assets.length||!v.assets.every(asset)))fail();
   for(const id of v.removeSelectors||[])selectors.add(id);
  }
 }
 for(const [sha,targets]of Object.entries(input.bindings)as[string,DeskColorTarget[]][]){if(!hash(sha)||!Array.isArray(targets)||targets.length>20000)fail();for(const t of targets){if(!Number.isSafeInteger(t.node)||t.node<0||!Number.isSafeInteger(t.primitive)||t.primitive<0||!Array.isArray(t.selectors)||!t.selectors.length||!t.selectors.every(s=>input.fields[s.field]&&selectors.has(s.selectorId)))fail();}}
}

export function withDeskColors(runtime:CatalogRuntime,colors:DeskColors):CatalogRuntime{
 if(runtime.family.collectionMode!=='desk-components'||runtime.family.baseArticle!==colors.code)throw Error('Desk colors require their original component runtime');
 return attachDeskColors(runtime,colors);
}

export const legacyDeskColorIdentity={code:'KERG020WW001',productId:'product_erange-desks_e908d3d0',sample:'25302337',familyId:'cfg-63314676e693',runtimeSha256:'9d672f0bf162fe4b4e012af6ab031512b427e39b31c470800aa2e2c753290718'}as const;
/** This measured legacy desk keeps its original structure graph and SOAP classes. */
export function withLegacyDeskColors(runtime:CatalogRuntime,colors:DeskColors):CatalogRuntime{
 const f=runtime.family,id=legacyDeskColorIdentity;
 if(f.collectionMode!=='structure-only'||f.baseArticle!==id.code||f.id!==id.familyId||f.productId!==id.productId||f.sample!==id.sample||colors.code!==id.code||colors.componentRuntimeSha256!==id.runtimeSha256||Object.keys(colors.fields).sort().join(',')!=='FINSIDEDESKTOPBOARDCOL,FOUTSIDEDESKTOPBOARDCOL'||f.anchors.some(a=>(a.defaults.GDWIDTH==='_2000'&&a.defaults.GDDEPTH!=='_1000')||Object.entries(colors.fields).some(([key,value])=>a.defaults[key]!==value.default)))throw Error('Legacy desk colors require the exact original eRange runtime');
 return attachDeskColors(runtime,colors);
}

function attachDeskColors(runtime:CatalogRuntime,colors:DeskColors):CatalogRuntime{
 // The supplier finish witness can include a fixed dimension that is absent
 // from every construction context. It must not become an invented control
 // or prevent an exact primitive/material/matrix match at the captured axes.
 const axes=new Set(runtime.family.anchors.flatMap(a=>a.axes));
 const baseDimensions=Object.fromEntries(Object.entries(colors.baseDimensions).filter(([key])=>axes.has(key)));
 const hasCapturedDefaultGeometry=(anchor:CatalogRuntime['family']['anchors'][number])=>{
  const family={...runtime.family,anchors:[anchor,...runtime.family.anchors.filter(a=>a!==anchor)]};
  const engine=createCatalogEngine(family),state=engine.catalogInitial(family,anchor.article),assembly=engine.catalogAssets(state);
  return !!assembly.base||assembly.patches.some(p=>p.geometry||p.geometries?.length);
 };
 if(!Object.keys(baseDimensions).length||!runtime.family.anchors.some(a=>Object.entries(baseDimensions).every(([k,v])=>a.defaults[k]===v)&&hasCapturedDefaultGeometry(a)))throw Error('Desk color witness has no captured component context');
 colors={...colors,baseDimensions};
 if(runtime.family.anchors.some(a=>Object.keys(colors.fields).some(key=>a.axes.includes(key)||a.components.some(c=>c.fields.includes(key)))))throw Error('Desk color field collides with construction');
 const palettes:CatalogRuntime['palettes']={...runtime.palettes,_fieldLabels:{...runtime.palettes._fieldLabels}};
 for(const [key,f]of Object.entries(colors.fields)){palettes._fieldLabels[key]={text:f.label};palettes[key]=Object.fromEntries(f.choices.map(c=>[c.value,{text:c.text,image:c.image,color:c.color}]));}
 const anchors=runtime.family.anchors.map(a=>({...a,defaults:{...a.defaults,...Object.fromEntries(Object.entries(colors.fields).map(([k,f])=>[k,f.default]))},choices:{...a.choices,...Object.fromEntries(Object.entries(colors.fields).map(([k,f])=>[k,f.choices.map(c=>c.value)]))}}));
 // Compare real captured default assemblies, never a Cartesian combination of
 // dimensions/options. Count fields with an applicable alternative, not merely
 // a palette entry. Stable ties prefer the original finish witness context.
 const family={...runtime.family,anchors,deskColors:colors},engine=createCatalogEngine(family);
 const coverage=anchors.map((anchor,index)=>{
  const state=engine.catalogInitial({...family,anchors:[anchor,...anchors.filter(a=>a!==anchor)]},anchor.article);
  const values=engine.catalogValues(state),assembly=engine.catalogAssets(state);
  const assets=[...(assembly.base?[assembly.base]:[]),...assembly.patches.flatMap(p=>p.geometries||(p.geometry?[p.geometry]:[]))];
  const choices=engine.catalogChoices(state);
  const fields=Object.entries(colors.fields).filter(([key,f])=>choices[key]&&f.choices.some(c=>{
   if(c.value===f.default||!choices[key].includes(c.value))return false;
   const plan=deskColorPlan(colors,{...values,[key]:c.value},assets);
   return !plan.pending.includes(key)&&(Object.keys(plan.materials).length>0||plan.assets.length>0);
  })).length;
  return {index,fields,witness:Number(Object.entries(colors.baseDimensions).every(([k,v])=>values[k]===v))};
 });
 coverage.sort((a,b)=>b.fields-a.fields||b.witness-a.witness||a.index-b.index);
 const preferred=coverage[0]?.index||0;if(preferred>0)anchors.unshift(...anchors.splice(preferred,1));
 return {family,palettes};
}

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
