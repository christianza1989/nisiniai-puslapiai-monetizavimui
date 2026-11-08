import type {PilotVariant} from './configurator';

export type ObservedDeskState={id:string;label:string;values:Record<string,string>;details:{field:string;label:string;text:string}[];asset:string;assetSha256:string;bytes:number};
export type ObservedDeskReview={schema:'observed-desk-review-v1';code:string;name:string;states:ObservedDeskState[];sourceRuntimeSha256:string;fullPaletteQualified:false;fullGraphClosed:false};
export type ObservedDeskEntry={code:string;name:string;asset:string;sha256:string;bytes:number;states:number};
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Whole states only. A caller cannot turn an observed tuple into independent choices. */
export function observedDeskState(data:ObservedDeskReview,id:string,values?:Record<string,string>){
 const state=data.states.find(s=>s.id===id);
 if(!state||values&&(Object.keys(values).length!==Object.keys(state.values).length||Object.entries(state.values).some(([k,v])=>values[k]!==v)))return;
 return state;
}
export function validateObservedDesk(value:unknown,code:string):ObservedDeskReview{
 const d=value as ObservedDeskReview;
 if(!d||d.schema!=='observed-desk-review-v1'||d.code!==code||!hash(d.sourceRuntimeSha256)||d.fullGraphClosed!==false||d.fullPaletteQualified!==false||!Array.isArray(d.states)||!d.states.length)throw Error('Neatpažinti stalo duomenys.');
 const ids=new Set<string>();
 for(const s of d.states){
  if(!hash(s.id)||ids.has(s.id)||!hash(s.assetSha256)||!s.asset.startsWith('/models/configurator/observed-desks/'+code+'/')||s.asset!==`/models/configurator/observed-desks/${code}/${s.assetSha256}.glb`||!Number.isSafeInteger(s.bytes)||s.bytes<=0||s.bytes>25*1024*1024||!s.values||!Array.isArray(s.details)||!s.label)throw Error('Neatpažinta surinkta komplektacija.');
  for(const[k,v]of Object.entries(s.values))if(!/^(DIMENSIONS|OPTIONS|FINISHES)\.[A-Z0-9_]+$/.test(k)||typeof v!=='string')throw Error('Neatpažinta komplektacijos reikšmė.');
  for(const p of s.details)if(!(p.field in s.values)||typeof p.text!=='string'||typeof p.label!=='string')throw Error('Neatpažinti komplektacijos duomenys.');
  ids.add(s.id);
 }
 return d;
}
export function observedDeskVariant(code:string,s:ObservedDeskState):PilotVariant{
 return{id:s.id,label:s.label,backrest:'uph',asset:s.asset,assetSha256:s.assetSha256,bytes:s.bytes,image:'',sourceCadUrl:'',sourceCadSha256:'',supplierCode:code,supplierOptions:[],materialCodes:{},samples:{},visualizationNote:'Tik ši surinkta pilna komplektacija.'};
}
