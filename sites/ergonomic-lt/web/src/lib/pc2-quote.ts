import {createHash} from 'node:crypto';
import chairs from '../../content/pc2-chair-review-candidates.json';
import desks from '../../content/pc2-desk-observed-candidates.json';
import supplierFields from '../../content/pc2-supplier-fields.json';
import {configuratorRuntimeAsset} from './configurator-runtime-assets';
import {chairReviewRoute,chairReviewVersion,validateChairConstructionBinding,type ChairReviewEntry,type ChairReviewSource} from './chair-review-routing';
import {chairObservedChoices,chairPreviewAssembly,type ChairPreview} from './chair-preview';
import {qualifiedGroupOptions,qualifiedWitnessMatches} from './chair-qualified-colors';
import {chairFinishIntent} from './chair-finish-intent';
import {chairFinishCollection,chairFinishRoles} from './chair-material-groups';
import {resolveSeglaVisual} from './segla-visual-routing';
import {observedDeskState,validateObservedDesk} from './observed-desk-review';
import {previewCollection,previewField,previewFinishField,previewModelLabel,previewValue} from './preview-option-presentation';
import {pc2QuoteEnabled,type Pc2ChairSelection,type Pc2Selection} from './pc2-quote-selection';
import type {QuoteEntry} from './quote-entry';
import type {Product} from './types';

const fieldGroups:Record<string,Record<string,string>>=supplierFields;
const unavailable=()=>Error('Pasirinktos 3D komplektacijos patikrinti nepavyko. Grįžkite į peržiūrą ir pasirinkite ją iš naujo.');
const hasValue=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&!['UNDEFINED','NOTDEFINED','N/A'].includes(value);
type Values=Record<string,string|undefined|null>;
type SelectionValues={values:Values;missing?:string[];note?:string};
const chairEntry=(code:string)=>(chairs.entries as ChairReviewEntry[]).find(entry=>entry.code===code);

async function verifiedPackage(source:ChairReviewSource,sha:string){
 if(source.sha256!==sha||source.bytes>15_000_000)throw unavailable();
 const data=await configuratorRuntimeAsset(source.asset);
 if(data.byteLength!==source.bytes||createHash('sha256').update(data).digest('hex')!==sha)throw unavailable();
 return JSON.parse(new TextDecoder().decode(data));
}
async function chairPackage(entry:ChairReviewEntry,selection:Pick<Pc2ChairSelection,'constructionId'|'finishId'|'packageSha'>){
 const {construction,source}=chairReviewRoute(entry,selection.constructionId,selection.finishId);
 const data=await verifiedPackage(source,selection.packageSha) as ChairPreview;
 if(data.schema!=='pc2-chair-review-111-v1'||data.code!==entry.code)throw unavailable();
 if(construction.construction)validateChairConstructionBinding(data,{...construction.construction,runtimeSha256:source.runtimeSha256||construction.construction.runtimeSha256});
 return data;
}
function sameScope(a:Values,b:Values){
 return Object.entries(a).every(([key,value])=>b[key]===value);
}
function originalFinish(data:ChairPreview,context:number,structural:Values):Values{
 if(data.originalFinishByContext?.[String(context)])return data.originalFinishByContext[String(context)];
 if(data.palette.schema==='chair-base-observed-colours-v1'){
  // For multi-context reviews only explicit context data can identify the original finish.
  return data.runtime.contexts.length===1?Object.fromEntries(Object.entries(data.palette.baselineObservedFinish).map(([field,record])=>[field,record.value])):{};
 }
 if(data.palette.schema==='chair-colors-observed-partial-344-v1'){
  const candidates=data.palette.observedPairs.filter(p=>sameScope(structural,p.constructionScope));
  const first=candidates[0]?.finishBaseScope??{};
  return Object.fromEntries(Object.entries(first).filter(([field,value])=>candidates.every(p=>p.finishBaseScope[field]===value)));
 }
 return {};
}
async function chairValues(s:Pc2ChairSelection):Promise<SelectionValues>{
 const base=chairEntry(s.code);if(!base)throw unavailable();
 const entry=chairReviewVersion(base,s.versionId);
 const visual=s.visual&&entry.visualSupplement?resolveSeglaVisual(entry.visualSupplement,s.code,s.visual.visualId,s.visual.mappingId):undefined;
 if(s.visual&&!visual)throw unavailable();
 if(visual&&!visual.exactRoute){
  if(s.packageSha!==entry.visualSupplement?.mapSha256||s.observed!=='original'||s.qualified||s.pending||s.context||s.variants.length||s.functionalIndex)throw unavailable();
  return {values:{...visual.representative.defaultFinish,...visual.mapping.dimensions,...visual.mapping.options},
   note:visual.mode==='NEAREST_VISUAL_MODEL_DIRECT_ROKO'?'3D rodo artimiausią modelį. Užklausoje įrašyta pasirinkta funkcinė komplektacija.':undefined};
 }
 if(visual?.exactRoute&&(visual.exactRoute.constructionId!==s.constructionId||visual.exactRoute.finishId!==s.finishId||visual.exactRoute.source.sha256!==s.packageSha))throw unavailable();
 const data=await chairPackage(entry,s);
 const current=data.runtime.contexts[s.context];
 if(!current||s.variants.length!==current.groups.length||current.groups.some((g,i)=>!g.variants[s.variants[i]]))throw unavailable();
 const mappings=data.visualFunctionalMappings?.[String(s.context)],functional=mappings?.[s.functionalIndex];
 if(s.functionalIndex&&!functional)throw unavailable();
 const metadata=data.visualMetadataByContext?.[String(s.context)]??data.visualMetadata;
 const structural={...current.dimensions,...Object.fromEntries(current.groups.flatMap((g,i)=>Object.entries(g.variants[s.variants[i]].values)))};
 const choices=chairObservedChoices(data),baseline=chairPreviewAssembly(data,s.context,s.variants,choices[0]);
 const active=[baseline.base,...baseline.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256);
 const witnesses=(s.functionalIndex?[]:data.qualified?.witnesses||[]).filter(w=>qualifiedWitnessMatches(data,w,s.context,s.variants,active));
 const fixed=witnesses.find(w=>w.fixed)?.fixed;
 let finishes:Values={},note:string|undefined;
 if(s.qualified){
  const q=s.qualified,w=witnesses.find(w=>w.id===q.witness);
  if(!w||s.observed!==(q.kind==='single'?'__qs:'+q.witness+':'+q.single:'__qg:'+q.witness)||s.pending)throw unavailable();
  const branch=w.branches.find(b=>b.id===q.branch);
  if(q.kind==='single'){
   const picked=w.singles.find(o=>o.id===q.single);
   if(!picked)throw unavailable();
   finishes=picked.values;
  }else{
   if(w.branches.length&&!branch)throw unavailable();
   finishes={...branch?.values};
   for(const group of [...w.groups,...branch?.groups||[]]){
    const picked=qualifiedGroupOptions(w,q,group).find(o=>o.id===(q.groups[group.id]??group.base));
    if(!picked)throw unavailable();
    Object.assign(finishes,picked.values);
   }
  }
  if(chairPreviewAssembly(data,s.context,s.variants,choices[0],q).chairColors.plan.status==='unavailable')throw unavailable();
  finishes={...w.fixed,...finishes};
 }else if(s.pending){
  if(s.observed!=='__pending')throw unavailable();
  const previous=await chairPackage(chairReviewVersion(base,s.pending.versionId),s.pending);
  const intent=chairFinishIntent(previous,{kind:'single',witness:s.pending.witness,single:s.pending.single,groups:{}});
  if(!intent)throw unavailable();
  finishes=intent.values;
  note='Pasirinkta apdaila šiai konstrukcijai 3D nerodoma. Patikrinkite apdailos suderinamumą.';
 }else{
  const choice=choices.find(c=>c.id===s.observed);
  if(!choice)throw unavailable();
  if(choice.selection.kind!=='original'){
   const plan=chairPreviewAssembly(data,s.context,s.variants,choice).chairColors.plan;
   if(plan.status==='unavailable')note='Pasirinkta apdaila šiai konstrukcijai 3D nerodoma. Patikrinkite apdailos suderinamumą.';
   // Selection links can also carry construction constraints from another context.
   finishes=Object.fromEntries(Object.entries(choice.values).filter(([field])=>fieldGroups[s.code]?.[field]==='FINISHES'||previewFinishField(field)));
  }else if(data.palette.schema==='chair-colors-full-state-329-v1'){
   const candidates=choices.filter(c=>c.selection.kind==='full-state'&&data.palette.schema==='chair-colors-full-state-329-v1'&&data.palette.selectionLinks[c.selection.link]?.field==='__CONTEXT_DEFAULT__'&&chairPreviewAssembly(data,s.context,s.variants,c).chairColors.plan.status==='original');
   if(candidates.length===1)finishes=candidates[0].values;
  }
 }
 if(functional?.approximation)note=[note,'3D rodo artimiausią modelį. Užklausoje įrašyta pasirinkta funkcinė komplektacija.'].filter(Boolean).join(' ');
 const values={...current.default3DValues,...originalFinish(data,s.context,structural),...fixed,...finishes,...structural,...(functional?.values??metadata?.values)};
 return {values,note};
}
export async function resolvePc2Quote(selection:Pc2Selection,products:Product[]){
 if(!pc2QuoteEnabled())throw unavailable();
 const product=products.find(p=>p.configurations.some(c=>c.code===selection.code));
 if(!product)throw unavailable();
 const config=product.configurations.find(c=>c.code===selection.code)!;
 const code=selection.code,missing=new Set<string>(),supplierOptions:string[]=[];
 const details:{label:string;value:string}[]=[];
 let name:string,note:string|undefined;
 if(selection.kind==='desk'){
  const entry=desks.entries.find(e=>e.code===code);
  if(!entry)throw unavailable();
  const data=validateObservedDesk(await verifiedPackage(entry,selection.packageSha),code),state=observedDeskState(data,selection.stateId);
  if(!state||data.states.length!==entry.states)throw unavailable();
  name=entry.name;
  for(const [key,value] of Object.entries(state.values)){
   const field=key.split('.')[1];
   if(hasValue(value))supplierOptions.push(code+'_'+key+'='+value);
   else missing.add(previewField(field));
   if(hasValue(value)){
    const group=chairFinishCollection(field,Object.fromEntries(Object.entries(state.values).map(([k,v])=>[k.split('.')[1],v])));
    details.push({label:previewField(field),value:previewValue(code,field,value,group?previewCollection(group):undefined)});
   }
  }
 }else{
  const snapshot=await chairValues(selection);
  name=chairEntry(code)!.name;note=snapshot.note;
  const values=Object.fromEntries(Object.entries(snapshot.values).filter((entry):entry is [string,string]=>hasValue(entry[1])));
  for(const [field,value] of Object.entries(snapshot.values)){
   const label=previewField(field),group=fieldGroups[code]?.[field];
   if(hasValue(value)){
    const collection=chairFinishRoles[field]&&chairFinishCollection(field,values);
    details.push({label,value:previewValue(code,field,value,collection?previewCollection(collection):undefined)});
    if(group)supplierOptions.push(code+'_'+group+'.'+field+'='+value);
   }
   if(!group||!hasValue(value))missing.add(label==='Papildoma parinktis'?label+' ('+field+')':label);
  }
  if(!Object.keys(values).some(field=>previewFinishField(field)&&!/GROUP|PRICE/.test(field)))missing.add('Originalios apdailos spalva');
 }
 const configurationDetails=details.filter((row,index)=>details.findIndex(other=>row.label===other.label&&row.value===other.value)===index);
 const item:QuoteEntry={productId:product.id,configurationId:config.id,pc2Selection:selection,
  name:previewModelLabel(code,name),brand:product.brand,url:selection.kind==='chair'?'/3d-perziura-pc2/?chair='+code:'/3d-perziura-pc2-stalai/?desk='+code,
  image:null,configurationLabel:'',configurationDetails,quantity:1,note:''};
 return {product,item,supplierOptions,missingSupplierCodes:[...missing],pc2OrderNote:note};
}
