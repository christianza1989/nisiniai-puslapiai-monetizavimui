
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {fieldLabels,choiceLabel as presentationChoiceLabel} from './choice-presentation';
import type {Product,Configuration} from './types';
import type {PilotVariant} from './configurator';
import {supplierOptions} from './configuration-labels';
import {createCatalogEngine,type CatalogRuntime,type CatalogFamily} from './catalog-engine';
import {articleChoiceLabel,articleFieldLabels,configurableArticle,resolveConfigurationArticle} from './configuration-article';

export type Asset={asset:string;assetSha256:string;bytes:number};
export type ExpandedState={family:string;anchor:string;values:Record<string,string>};
type Profile={defaults:Record<string,string>;choices:Record<string,string[]>};
export type Patch={remove:string[];addIds:string[];changes:Record<string,string>;choices:Record<string,string[]>;geometry:Asset|null;geometries?:Asset[]};
export type Anchor=Profile&{id:string;fields:string[];classes:Record<string,string>;geometry:Asset;roles:Record<string,string>;patches:Record<string,Patch>;conditionalPatches:Record<string,Patch>};
export type Family={id:string;kind?:'catalog';productId:string;baseArticle:string;sample:string;anchors:(Anchor&{profiles:Profile[]})[]};
export type PaletteItem={text:string;image?:string;color?:string};
export {fieldLabels};
export type ExpandedEngineSources={families:Family[];catalogFamilies:CatalogFamily[];palettes:Record<string,Record<string,PaletteItem>>};
export function createScopedExpandedEngine(runtime:CatalogRuntime|undefined,sources:ExpandedEngineSources){
const {families,palettes}=sources;
const choiceLabel=(field:string,value:string,localPalettes?:CatalogRuntime['palettes'],family?:string)=>presentationChoiceLabel(field,value,localPalettes,family,palettes);
const catalogEngine=createCatalogEngine(runtime?.family,sources.catalogFamilies);
const {catalogFamily,catalogForProduct,catalogInitial,catalogChoices,catalogChange,catalogValidate,catalogAssets,catalogSelection}=catalogEngine;
function expandedForProduct(p:Product){return catalogForProduct(p) as unknown as Family||families.find(f=>!f.kind&&f.productId===p.id&&(!p.modelConfigurationId||p.configurations.find(c=>c.id===p.modelConfigurationId)?.code===f.baseArticle)&&(p.configurations.some(c=>c.id===f.sample&&c.code===f.baseArticle)||(typeof (p as Product&{publicationOriginalCount?:number}).publicationOriginalCount==='number'&&p.configurations.some(c=>c.id===p.modelConfigurationId&&c.code===f.baseArticle))));}
function anchorFor(s:ExpandedState){return catalogEngine.catalogAnchor(s) as unknown as (Anchor&{profiles:Profile[]})||families.find(f=>f.id===s.family)?.anchors.find(a=>a.id===s.anchor);}
const isGroup=(k:string)=>k.endsWith('GROUP')&&k!=='CPRICEGROUP';
const sideSeat=(seat:string)=>['UPHCPLASTICSPROFILES','UPHSIDEPROFILESSP'].includes(seat);
function profilesFor(s:ExpandedState){const a=anchorFor(s)!;if(s.family!=='souly')return a.profiles;return a.profiles.filter(p=>sideSeat(s.values.CSEAT)?p.defaults.CSEAT===s.values.CSEAT:!sideSeat(p.defaults.CSEAT));}
function stateChoices(s:ExpandedState):Record<string,string[]>{
 if(catalogFamily(s))return catalogChoices(s);
 const a=anchorFor(s);if(!a)return {};const choices={...a.choices};
 for(const [k,v] of Object.entries(s.values))Object.assign(choices,a.patches[k+'='+v]?.choices||{});
 const profiles=profilesFor(s),price=profiles.find(p=>p.defaults.CPRICEGROUP===s.values.CPRICEGROUP);
 if(s.family==='souly'&&sideSeat(s.values.CSEAT))choices.CPRICEGROUP=[...new Set(profiles.map(p=>p.defaults.CPRICEGROUP))];
 if(price)for(const k of Object.keys(choices))if(k.includes('GROUP')||k.includes('COLOR')||k.endsWith('CHCOL')){
  // The source omits a choice list when the current group has one fixed value.
  // Use that captured value instead of retaining the previous group's list.
  if(price.choices[k])choices[k]=price.choices[k];
  else if(price.defaults[k])choices[k]=[price.defaults[k]];
 }
 for(const field of Object.keys(choices).filter(isGroup)){
  const p=profiles.find(p=>p.defaults.CPRICEGROUP===s.values.CPRICEGROUP&&p.defaults[field]===s.values[field]);
  if(p)for(const [k,v] of Object.entries(p.choices))if(k.includes('COLOR')||k.endsWith('CHCOL')){
   // Pick only colours belonging to this group's family. Other captured groups
   // in the same profile may have their own default selection.
   const groupForColor:Record<string,string>={CUPHBACKRESTCOLOR:'CBACKRESTUPHGROUP',CUPHSEATCOLOR:'CBACKRESTUPHGROUP',CSEBASIDEPROFILUPHCOLOR:'CSEBASIDEPROFILUPHGROUP',CHEADRESTUPHCHCOLOR:'CHEADRESTUPHCHGROUP',CHEADSIDEPROFUPHCHCOL:'CHEADSIDEPROFUPHCHGROUP',CUPHCOLOR:'CUPHGROUP',CUPHSIDECOLORSEAT:'CUPHGROUP',CMESHCOLOR:'CMESHGROUP'};
   if(groupForColor[k]===field)choices[k]=v;
  }
 }
 return choices;
}
function normalize(s:ExpandedState){
 const a=anchorFor(s);if(!a)throw Error(copyText("ui.bce39388837b87564703","Komplektacija nerasta."));let values={...s.values};
 for(let pass=0;pass<5;pass++){const choices=stateChoices({...s,values});for(const [k,list] of Object.entries(choices))if(!list.includes(values[k]))values[k]=list.includes(a.defaults[k])?a.defaults[k]:list[0];
  for(const k of Object.keys(values))if(!choices[k])delete values[k];}
 return {...s,values:Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b)))};
}
function initialState(f:Family):ExpandedState{
 if(f.kind==='catalog')return catalogInitial(f as unknown as import('./catalog-configurator').CatalogFamily);
 const a=f.anchors.find(a=>a.id.startsWith(f.id==='xilium'?'WHITEEDITION-HR':'BLACKEDITION-NONE'))||f.anchors[0];
 const reference:Record<string,string>=f.id==='xilium'?{CMECHANISM:'ERST',CBACKRESTMOVEMECH:'XV',CBACKRESTCONNECTOR:'WHITEPLASTIC',CARMRESTS:'R55POLWBPU',CBASE:'TS30W',CCASTORS:'ESH60',CPRICEGROUP:'_2',CBACKRESTUPHGROUP:'VL',CSEBASIDEPROFILUPHGROUP:'VL',CHEADRESTUPHCHGROUP:'VL',CHEADSIDEPROFUPHCHGROUP:'VL',CUPHBACKRESTCOLOR:'VL0034',CUPHSEATCOLOR:'VL0034',CSEBASIDEPROFILUPHCOLOR:'VL4041',CHEADRESTUPHCHCOLOR:'VL0034',CHEADSIDEPROFUPHCHCOL:'VL4041'}:{CARMRESTS:'R71BBBPU',CLUMBARSUPPORT:'LUH2MANUAL'};
 return normalize({family:f.id,anchor:a.id,values:{...a.defaults,...reference}});
}
function initialStateForProduct(p:Product):ExpandedState{
 const f=expandedForProduct(p)!;let state=initialState(f);
 // A measured desk overlay chooses the captured initial context with the best
 // working color coverage. A catalog example must not silently overwrite that
 // choice. Explicit state tokens still restore their original configuration.
 if(catalogFamily(state)?.deskColors)return validateState(p,state);
 const c=p.configurations.find(c=>c.id===p.modelConfigurationId);if(!c)return state;
 const wanted=Object.fromEntries(supplierOptions(c).map(option=>{const [key,original]=option.split('='),field=key.split('.').at(-1)!;
  const value=runtime?.palettes._sourceValueAliases?.[c.id+'/'+field+'='+original]?.text||original;
  return [field,key.endsWith('.CPRICEGROUP')&&/^\d+$/.test(value)?'_'+value:value];}));
 // Structural controls precede fabric groups and colours, whose choices depend
 // on the selected construction. Only source-captured choices are accepted.
 const keys=Object.keys(wanted).sort((a,b)=>Number(/GROUP/.test(a))+Number(/COLOR|CHCOL/.test(a)&&!a.startsWith('CPLASTIC'))*2-Number(/GROUP/.test(b))-Number(/COLOR|CHCOL/.test(b)&&!b.startsWith('CPLASTIC'))*2);
 for(let pass=0;pass<3;pass++)for(const k of keys)if(state.values[k]!==wanted[k]&&stateChoices(state)[k]?.includes(wanted[k]))try{state=changeField(state,k,wanted[k]);}catch{/* Some supplier examples contain options outside the captured 3D scope. */}
 return validateState(p,state);
}
function changeField(s:ExpandedState,field:string,value:string){
 if(catalogFamily(s))return catalogChange(s,field,value);
 if(!stateChoices(s)[field]?.includes(value))throw Error(copyText("ui.a45a85b5ad299eb715f4","Šis pasirinkimas negalimas."));const a=anchorFor(s)!;let next={...s,values:{...s.values,[field]:value}};
 if(field==='CHEADREST'||field.startsWith('CPLASTICCOLORVERSION')){
  const f=families.find(f=>f.id===s.family)!,plastic=field.startsWith('CPLASTIC')?value:s.values[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION'];
  const head=field==='CHEADREST'?value:s.values.CHEADREST,anchor=f.anchors.find(a=>a.id===plastic+'-'+head);if(!anchor)throw Error(copyText("ui.990865ffe3b8ee6c3adc","Ši konstrukcija dar nepateikta."));
  next={...next,anchor:anchor.id,values:{...anchor.defaults,...next.values}};
 }else Object.assign(next.values,a.patches[field+'='+value]?.changes||{});
 if(field==='CPRICEGROUP'||isGroup(field)){
  const profile=profilesFor(next).find(p=>p.defaults.CPRICEGROUP===next.values.CPRICEGROUP&&(!isGroup(field)||p.defaults[field]===value));
  if(profile)for(const [k,v] of Object.entries(profile.defaults))if(k===field||field==='CPRICEGROUP'&&(k.includes('GROUP')||k.includes('COLOR')||k.endsWith('CHCOL'))||isGroup(field)&&/COLOR|CHCOL/.test(k)&&profile.choices[k]?.some(v=>v.startsWith(value)))next.values[k]=v;
 }
 return normalize(next);
}
function validateState(product:Product,input:unknown):ExpandedState{
 if(catalogForProduct(product))return catalogValidate(product,input);
 const f=expandedForProduct(product);if(!f||!input||typeof input!=='object')throw Error(copyText("ui.59a1cd4cfa64392134f2","Neleistina komplektacija."));const s=input as ExpandedState;
 if(s.family!==f.id||typeof s.anchor!=='string'||!s.values||typeof s.values!=='object'||Array.isArray(s.values)||Object.keys(s.values).length>35||Object.values(s.values).some(v=>typeof v!=='string'||v.length>100))throw Error(copyText("ui.b12113f7560a1720ce23","Neleistini pasirinkimai."));
 const canonical=normalize(s);if(JSON.stringify(canonical.values)!==JSON.stringify(Object.fromEntries(Object.entries(s.values).sort(([a],[b])=>a.localeCompare(b)))))throw Error(copyText("ui.2ca5de226990278480c1","Pasirinkimai tarpusavyje nesuderinami."));
 const a=anchorFor(s)!;const plastic=s.values[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION'];if(a.id!==plastic+'-'+s.values.CHEADREST)throw Error(copyText("ui.c927305948bb709d4b2c","Konstrukcija neatitinka pasirinktų detalių."));return canonical;
}
function stateToken(s:ExpandedState){return JSON.stringify([s.family,s.anchor,Object.entries(s.values).sort(([a],[b])=>a.localeCompare(b))]);}
function parseStateToken(p:Product,token:string){if(token.length>5000)throw Error(copyText("ui.e1ba214296fcef9d4334","Per ilgas kodas."));const [family,anchor,entries]=JSON.parse(token);return validateState(p,{family,anchor,values:Object.fromEntries(entries)});}
function assembledAssets(s:ExpandedState){if(catalogFamily(s))return catalogAssets(s);const a=anchorFor(s)!;const entries=Object.entries(s.values).sort(([k],[l])=>(k==='CMECHANISM'?-1:k==='CARMRESTS'?1:0)-(l==='CMECHANISM'?-1:l==='CARMRESTS'?1:0));
 return {base:a.geometry,patches:entries.map(([k,v])=>k==='CARMRESTS'&&a.conditionalPatches?.[s.values.CMECHANISM+'|'+v]||a.patches[k+'='+v]).filter((p):p is Patch=>!!p)};}
function stateDetails(s:ExpandedState,product?:Product){return Object.entries(stateChoices(s)).map(([k])=>({label:(product&&articleFieldLabels(product)[k])||(['CARMRESTS','CBASE','CCASTORS'].includes(k)?fieldLabels[k]:runtime?.palettes._fieldLabels?.[k]?.text)||fieldLabels[k]||k,value:(product&&articleChoiceLabel(product,k,s.values[k]))||choiceLabel(k,s.values[k],runtime?.palettes,s.family)}));}
function expandedSelection(product:Product,input:unknown){
 if(catalogForProduct(product)){
  const selected=catalogSelection(product,input,s=>stateDetails(s,product));
  const model=configurableArticle(product)&&product.configurations.find(c=>c.id===product.modelConfigurationId&&c.code===selected.configuration.code);
   return model?{...selected,configuration:{...selected.configuration,id:model.id,image:'/media/configurator/'+model.id+'.jpg',description:product.name},variant:{...selected.variant,image:'/media/configurator/'+model.id+'.jpg',label:product.name}}:selected;
 }
 const state=validateState(product,input),f=expandedForProduct(product)!,a=anchorFor(state)!;
 const values={...a.defaults,...state.values};if(values.CBACKRESTUPHGROUP)values.CSEATUPHGROUP=values.CBACKRESTUPHGROUP;
 const specKeys=new Set(Object.keys(state.values));if(values.CASSEMBLY)specKeys.add('CASSEMBLY');if(values.CBACKRESTUPHGROUP&&values.CSEATUPHGROUP)specKeys.add('CSEATUPHGROUP');
 for(const key of specKeys)if(!a.classes[key])throw Error(copyText("ui.c557d5e4cad349878adc","Nerastas pasirinkimo gamintojo kodas: ")+key);
 const options=Object.entries(values).filter(([k])=>specKeys.has(k)&&a.classes[k]).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>a.classes[k]+'.'+k+'='+(k==='CPRICEGROUP'?v.replace(/^_/,''):v));
 const label=(f.id==='xilium'?'Duo-Back':'Tinklinis')+' · '+choiceLabel('CPLASTICCOLORVERSION',state.values[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION']).toLowerCase()+' · '+(state.values.CHEADREST==='NONE'?'be galvos atramos':'su galvos atrama');
 const modelSample=product.modelConfigurationId&&product.configurations.find(c=>c.id===product.modelConfigurationId&&c.code===f.baseArticle);
 if(product.modelConfigurationId&&!modelSample)throw Error('Expanded model identity mismatch');
 const sample=modelSample?modelSample.id:f.sample;
 const configuration:Configuration={id:sample,name:copyText("ui.20ce263b92f0b663a1ae","Individuali komplektacija"),description:label,image:'/media/configurator/'+sample+'.jpg',code:f.baseArticle,configurator:null,supplierOptions:options,details:stateDetails(state,product)};
 let checksum=2166136261;for(const char of stateToken(state))checksum=Math.imul(checksum^char.charCodeAt(0),16777619)>>>0;
 const variant={id:'EG-'+checksum.toString(16).padStart(8,'0').toUpperCase(),label,image:configuration.image!,supplierCode:f.baseArticle,supplierOptions:options,visualizationNote:copyText("ui.1fc6412c0c4af8ac1518","Individuali komplektacija. Apdailų spalvos ekrane orientacinės.")} as PilotVariant;
 return {state,configuration,variant,assets:assembledAssets(state)};
}
function selectionArticle(product:Product,input:unknown){
 const state=validateState(product,input),labels={...fieldLabels,...Object.fromEntries(Object.entries(runtime?.palettes._fieldLabels||{}).map(([k,v])=>[k,v.text])),...articleFieldLabels(product)};
 return resolveConfigurationArticle(product,state,stateChoices(state),(k,v)=>articleChoiceLabel(product,k,v)||choiceLabel(k,v,runtime?.palettes,state.family),labels);
}
return {expandedForProduct,anchorFor,stateChoices,initialState,initialStateForProduct,changeField,validateState,stateToken,parseStateToken,assembledAssets,stateDetails,expandedSelection,selectionArticle,choiceLabel,catalog:catalogEngine};
}
