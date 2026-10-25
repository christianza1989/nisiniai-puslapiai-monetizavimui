
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import data from '../../content/configurator-catalog.json';
import type {Product,Configuration} from './types';
import type {ExpandedState,Asset,Patch} from './expanded-configurator';
import type {PilotVariant} from './configurator';
import type {SourceFinishMaterial} from './render-materials';
import type {DeskColors} from './desk-colors';
type Values=Record<string,string>;
type Choices=Record<string,string[]>;
type Variant={key:string;values:Values;defaults:Values;choices:Choices;dependentChoices?:Record<string,string[]|null>;destinationAnchor?:string;transitions:Values;patch:Patch};
type Rule={when:Values;defaults:Values;choices:Choices;hidden:string[];mirrors?:Values;choiceLinks?:Record<string,{source:string;fixed:string[];hideSingle?:boolean}>};
export type CatalogAnchor={id:string;article:string;sample:string;name:string;axes:string[];axisTransitions?:Values;axisValueChanges?:Record<string,Values>;defaults:Values;choices:Choices;classes:Values;geometry:Asset|null;unavailable3D?:string;components:{fields:string[];nativeMeasuredAxes?:string[];variants:Variant[]}[];profiles:Rule[];materials?:Record<string,Record<string,SourceFinishMaterial>>};
export type CatalogFamily={id:string;kind:'catalog';productId:string;baseArticle:string;sample:string;articles:{code:string;sample:string;name:string}[];anchors:CatalogAnchor[];collectionMode?:'structure-only'|'desk-components';deskColors?:DeskColors};
export const catalogFamilies=data.families as unknown as CatalogFamily[];
export const catalogPalettes=data.palettes as Record<string,Record<string,{text:string;image?:string;color?:string}>>;
export type CatalogRuntime={family:CatalogFamily;palettes:typeof catalogPalettes};
// Additional models are supplied per request, never registered into shared
// server state or bundled as the entire catalog in every product page.
export function createCatalogEngine(scoped?:CatalogFamily){
const candidates=()=>scoped?[scoped,...catalogFamilies]:catalogFamilies;
const catalogFamily=(s:ExpandedState)=>candidates().find(f=>f.id===s.family);
const catalogAnchor=(s:ExpandedState)=>catalogFamily(s)?.anchors.find(a=>a.id===s.anchor);
function catalogForProduct(p:Product){
 if(typeof (p as Product&{publicationOriginalCount?:number}).publicationOriginalCount==='number'&&p.modelConfigurationId){
  const selected=p.configurations.find(c=>c.id===p.modelConfigurationId);
  const f=candidates().find(f=>f.productId===p.id&&f.articles.some(a=>a.code===selected?.code));
  if(!f||!selected)return;
  return {...f,sample:selected.id,articles:f.articles.filter(a=>a.code===selected.code).map(a=>({...a,sample:selected.id})),anchors:f.anchors.filter(a=>a.article===selected.code)};
 }
 const f=candidates().find(f=>f.productId===p.id&&f.articles.every(a=>p.configurations.some(c=>c.id===a.sample&&c.code===a.code)));
 if(!f||!p.modelConfigurationId)return f;
 const code=p.configurations.find(c=>c.id===p.modelConfigurationId)?.code;
 const articles=f.articles.filter(a=>a.code===code);if(!articles.length)return;
 return {...f,articles,anchors:f.anchors.filter(a=>a.article===code)};
}
const finish=(k:string)=>k==='CPRICEGROUP'||k.endsWith('GROUP')||(/COLOR|CHCOL/.test(k)&&!/PLASTIC|FRAME/.test(k));
const equal=(a:Values,b:Values)=>Object.entries(a).every(([k,v])=>b[k]===v);
function variants(s:ExpandedState){const a=catalogAnchor(s);if(!a)throw Error(copyText("ui.da26ad2590d9067fe995","Konstrukcija nerasta."));return a.components.map(c=>c.variants.find(v=>equal(v.values,s.values)));}
function rules(a:CatalogAnchor,values:Values){return a.profiles.filter(r=>Object.keys(r.when).length<=1&&equal(r.when,values)).concat(a.profiles.filter(r=>Object.keys(r.when).length>1&&equal(r.when,values)));}
function catalogChoices(s:ExpandedState):Choices{
 const a=catalogAnchor(s);if(!a)return {};const lists={...a.choices},effective={...a.defaults,...s.values};
 for(const [i,v] of variants(s).entries())if(v){
  Object.assign(effective,v.defaults,s.values);
  for(const k of a.components[i].fields){if(v.choices[k])lists[k]=v.choices[k];else delete lists[k];}
  // New source captures explicitly retain finish-list changes outside the
  // geometry component. Older compact runtimes omitted unrelated lists and
  // must not have that omission interpreted as a measured deletion.
  for(const [field,domain] of Object.entries(v.dependentChoices||{})){
   if(domain)lists[field]=domain;else delete lists[field];
  }
 }
 for(const rule of rules(a,effective)){for(const k of rule.hidden)delete lists[k];Object.assign(lists,rule.choices);Object.assign(effective,rule.defaults,s.values);
  // Native finish lists can contain the current body colour plus fixed
  // alternatives. A measured singleton can become read-only again.
  for(const [target,link] of Object.entries(rule.choiceLinks||{})){
   const domain=[...new Set([effective[link.source],...link.fixed].filter(Boolean))];
   if(link.hideSingle&&domain.length<=1)delete lists[target];else lists[target]=domain;
  }
 }
 const deskColors=catalogFamily(s)?.deskColors;
 if(deskColors)for(const [key,f]of Object.entries(deskColors.fields))if(f.owners.some(owner=>effective[owner]==='NONE'))delete lists[key];
 return lists;
}
function normalize(s:ExpandedState,hops=0):ExpandedState{
 const redirects=[...new Set(variants(s).map(v=>v?.destinationAnchor).filter((id):id is string=>!!id))];
 if(redirects.length){
  if(redirects.length!==1||hops>=8)throw Error('Conflicting native constructor destinations');
  const source=catalogAnchor(s)!,destination=catalogFamily(s)!.anchors.find(a=>a.article===source.article&&a.id===redirects[0]);
  if(!destination)throw Error('Missing native constructor destination');
  const wanted=catalogValues(s),values={...destination.defaults};
  // Retain independent effective choices, including values that were hidden.
  // The forced constructor itself comes only from a measured source state.
  for(const component of destination.components){const exact=component.variants.find(v=>equal(v.values,wanted));if(exact)Object.assign(values,exact.values);}
  for(const [key,value] of Object.entries(s.values))if(finish(key)&&!destination.axes.includes(key))values[key]=value;
  return normalize({family:s.family,anchor:destination.id,values},hops+1);
 }

 const a=catalogAnchor(s);if(!a)throw Error(copyText("ui.da26ad2590d9067fe995","Konstrukcija nerasta."));let values={...a.defaults,...s.values};
 for(let pass=0;pass<12;pass++){
  const before=JSON.stringify(values);
  for(const component of a.components){const v=component.variants.find(v=>equal(v.values,values));if(!v)throw Error(copyText("ui.34a6b0a8577d3c718c56","Konstrukcijos pasirinkimai nesuderinami."));}
  const current={...s,values},lists=catalogChoices(current);
  const effective={...a.defaults,...values};for(const v of variants(current))if(v)Object.assign(effective,v.defaults,values);
  for(const rule of rules(a,effective)){for(const [k,v] of Object.entries(rule.defaults))if(!lists[k]?.includes(values[k]))values[k]=v;}
  for(const [k,vs] of Object.entries(lists))if(!vs.includes(values[k]))values[k]=vs.includes(a.defaults[k])?a.defaults[k]:vs[0];
  // A measured component can remove a property entirely (e.g. floor fixing
  // on a freestanding stool). Retain fixed values only when that variant
  // actually contains them, rather than reviving an absent anchor default.
  const selected=variants(current);
  const structural=new Set([...a.axes,...a.components.flatMap((c,i)=>c.fields.filter(k=>Object.hasOwn(selected[i]!.values,k)))]);
  for(const k of Object.keys(values))if(!lists[k]&&!structural.has(k))delete values[k];
  // Fixed component values are omitted from the public state but remain in
  // source defaults. All actual component controls have captured choices.
  if(JSON.stringify(values)===before)break;
 }
 return {...s,values:Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b)))};
}
function catalogInitial(f:CatalogFamily,article=f.articles[0].code){const a=f.anchors.find(a=>a.article===article);if(!a)throw Error(copyText("ui.4becef09722c42f96a00","Modelis nerastas."));return normalize({family:f.id,anchor:a.id,values:{...a.defaults}});}
function catalogChange(s:ExpandedState,field:string,value:string){
 const a=catalogAnchor(s)!,f=catalogFamily(s)!;if(!catalogChoices(s)[field]?.includes(value))throw Error(copyText("ui.084f7b5a393f6ad65200","Neleistinas pasirinkimas."));
 if(s.values[field]===value)return normalize(s);
 let next={...s,values:{...s.values,[field]:value}};
 if(a.axes.includes(field)){
  // A measured source transition can also change another dependent axis.
  // Older catalogs keep their original independent-axis resolution.
  const targetId=a.axisTransitions?.[field+'='+value];
  const target=a.axisTransitions?f.anchors.find(b=>b.article===a.article&&b.id===targetId):f.anchors.find(b=>b.article===a.article&&b.axes.every(k=>b.defaults[k]===next.values[k]));if(!target)throw Error(copyText("ui.14de7e451b0ae0007698","Ši konstrukcija negalima."));
  next={family:f.id,anchor:target.id,values:{...target.defaults}};
  // Retain independent selections that are valid under the new construction.
  // A fixed or hidden source option can become editable after changing
  // construction. Retain its effective native value when the target accepts
  // it, rather than replacing it solely because the old UI had no selector.
  const measured=a.axisValueChanges?.[field+'='+value];
  const previousValues={...catalogValues(s),...measured};
  for(const c of target.components){const exact=c.variants.find(v=>equal(v.values,previousValues));if(exact)Object.assign(next.values,exact.values);}
  // Text-only desk selections (such as the socket standard) remain valid
  // across captured dimension contexts without changing their geometry.
  if(f.collectionMode==='desk-components')for(const [key,domain] of Object.entries(target.choices)){
   if(!target.axes.includes(key)&&!target.components.some(c=>c.fields.includes(key))&&domain.includes(previousValues[key]))next.values[key]=previousValues[key];
  }
  for(const k of Object.keys(s.values).filter(k=>finish(k)&&!target.axes.includes(k)))next.values[k]=s.values[k];
  // Apply only changes measured by the native setter in this source context.
  if(measured)Object.assign(next.values,measured);
 }else{
  const component=a.components.find(c=>c.fields.includes(field));
  if(component){const current=component.variants.find(v=>equal(v.values,s.values))!;
   const key=current.transitions[field+'='+value];
   const target=key?component.variants.find(v=>v.key===key):component.variants.find(v=>v.values[field]===value&&component.fields.every(k=>k===field||v.values[k]===s.values[k]));
   if(!target)throw Error(copyText("ui.b569051e38c4a98dfa29","Šis derinys negalimas."));Object.assign(next.values,target.values);
  }
  if(finish(field)){
   const effective={...a.defaults,...next.values};const rule=a.profiles.find(r=>r.when.CPRICEGROUP===effective.CPRICEGROUP&&(field==='CPRICEGROUP'?Object.keys(r.when).length<=1:r.when[field]===value));
   if(rule)Object.assign(next.values,rule.defaults,{[field]:value});
  }
 }
 // Only measured linked finish controls opt into this preservation. A
 // fixed native colour may become selectable after changing the body colour.
 const linked=[...new Set(catalogAnchor(next)!.profiles.flatMap(r=>Object.keys(r.choiceLinks||{})))];
 if(linked.length){const previousValues=catalogValues(s),nextChoices=catalogChoices(next);
  for(const target of linked){const domain=nextChoices[target];if(!domain)continue;
   const selected=next.values[target]??previousValues[target];next.values[target]=domain.includes(selected)?selected:domain[0];
  }
 }
 return normalize(next);
}
function catalogValidate(product:Product,input:unknown){
 const f=catalogForProduct(product),s=input as ExpandedState;
 if(!f||!s||s.family!==f.id||typeof s.anchor!=='string'||!s.values||typeof s.values!=='object'||Array.isArray(s.values)||Object.keys(s.values).length>35||Object.values(s.values).some(v=>typeof v!=='string'||v.length>100))throw Error(copyText("ui.59a1cd4cfa64392134f2","Neleistina komplektacija."));
 const a=f.anchors.find(a=>a.id===s.anchor);if(!a||!a.axes.every(k=>a.defaults[k]===s.values[k]||a.components.some(c=>c.nativeMeasuredAxes?.includes(k)&&c.variants.some(v=>equal(v.values,s.values)&&v.values[k]===s.values[k]))))throw Error(copyText("ui.8c490538d7167bace3b2","Konstrukcijos kodas nesutampa."));
 const canonical=normalize(s);if(JSON.stringify(canonical.values)!==JSON.stringify(Object.fromEntries(Object.entries(s.values).sort(([a],[b])=>a.localeCompare(b)))))throw Error(copyText("ui.5a1ac764faa5724a6955","Pasirinkimai nesuderinami."));return canonical;
}
function catalogAssets(s:ExpandedState){const a=catalogAnchor(s)!;return {base:a.geometry,patches:variants(s).map(v=>v?.patch).filter((p):p is Patch=>!!p)};}
function catalogValues(state:ExpandedState){
 const a=catalogAnchor(state)!,values={...a.defaults,...state.values};
 for(const [index,v] of variants(state).entries())if(v){
  Object.assign(values,v.defaults,state.values);
  for(const field of a.components[index].fields)if(!Object.hasOwn(v.values,field))delete values[field];
 }
 for(const r of rules(a,values))Object.assign(values,r.defaults,state.values);
 const lists=catalogChoices(state);
 for(const r of rules(a,values))for(const [target,control] of Object.entries(r.mirrors||{}))if(!lists[target])values[target]=values[control];
 const colors=catalogFamily(state)?.deskColors;
 if(colors)for(const [field,finish]of Object.entries(colors.fields)){
  if(finish.owners.some(owner=>values[owner]==='NONE')){delete values[field];continue;}
  if(values[field]!==finish.default){
  // Preserve measured dependent finish codes without inventing controls or
  // changing any construction tuple. Explicit finish selections take priority.
  for(const [key,value]of Object.entries(finish.values[values[field]]?.automatic||{}))if(!colors.fields[key])values[key]=value;
  }
 }
 return values;
}
function catalogSelection(product:Product,input:unknown,details:(s:ExpandedState)=>{label:string;value:string}[]){
 const state=catalogValidate(product,input),a=catalogAnchor(state)!,values=catalogValues(state);
 // The prepared desk table supplies literal field/value pairs, not SOAP
 // class ownership. Preserve those codes without inventing a class prefix.
 const options=catalogFamily(state)!.collectionMode==='desk-components'
  ?Object.entries(values).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v)
  :Object.entries(a.classes).sort(([a],[b])=>a.localeCompare(b)).map(([k,cls])=>cls+'.'+k+'='+(k==='CPRICEGROUP'?values[k]?.replace(/^_/,''):values[k])).filter(v=>!v.endsWith('=undefined'));
 const image='/media/configurator/'+a.sample+'.jpg',configuration:Configuration={id:a.sample,name:copyText("ui.20ce263b92f0b663a1ae","Individuali komplektacija"),description:a.name,image,code:a.article,configurator:null,supplierOptions:options,details:details(state)};
 let checksum=2166136261;for(const ch of JSON.stringify([state.family,state.anchor,Object.entries(state.values)]))checksum=Math.imul(checksum^ch.charCodeAt(0),16777619)>>>0;
 const variant={id:'EG-'+checksum.toString(16).padStart(8,'0').toUpperCase(),label:a.name,image,supplierCode:a.article,supplierOptions:options,visualizationNote:copyText("ui.1fc6412c0c4af8ac1518","Individuali komplektacija. Apdailų spalvos ekrane orientacinės.")} as PilotVariant;
 return {state,configuration,variant,assets:catalogAssets(state)};
}
return {catalogFamily,catalogAnchor,catalogForProduct,catalogChoices,catalogInitial,catalogChange,catalogValidate,catalogAssets,catalogValues,catalogSelection};
}
export const {catalogFamily,catalogAnchor,catalogForProduct,catalogChoices,catalogInitial,catalogChange,catalogValidate,catalogAssets,catalogValues,catalogSelection}=createCatalogEngine();
