import {createHash} from 'node:crypto';
import entries from '../../content/desk-component-candidates.json';
import {catalogModelVisible} from './catalog-consolidation';
import {adaptDeskComponents,validateDeskComponents} from './desk-components';
import type {Product} from './types';
import type {CatalogRuntime} from './catalog-configurator';
import {RUNTIME_TRANSPORT_MAX_BYTES} from './runtime-transport-limits.mjs';

export type DeskCandidate={key:string;productId:string;sample:string;code:string;familyId:string;collectionMode:'desk-components';acceptance:'TECHNICAL_DRAFT';optionsRequired:true;runtime:{asset:string;sha256:string};proofs:{sourceGeometryRuntime:string}};
export type DeskCandidates={schemaVersion:1;models:Record<string,DeskCandidate>};
export const deskComponentCandidates=entries as DeskCandidates;
const hash=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
export function deskCandidateForModel(product:Product,data=deskComponentCandidates){
 if(product.categorySlug!=='rasomieji-stalai-ir-darbo-vietos'||!product.modelConfigurationId)return;
 const sample=product.configurations.find(c=>c.id===product.modelConfigurationId),key=product.id+':'+product.modelConfigurationId,entry=data.models[key];if(!entry)return;
 if(data.schemaVersion!==1||!sample||!catalogModelVisible(product.id,sample)||entry.key!==key||entry.productId!==product.id||entry.sample!==sample.id||entry.code!==sample.code||!/^K[A-Z0-9]+$/.test(entry.code)||!/^cfg-[a-f0-9]{12}$/.test(entry.familyId)||entry.collectionMode!=='desk-components'||entry.acceptance!=='TECHNICAL_DRAFT'||entry.optionsRequired!==true||Object.keys(entry.proofs||{}).join(',')!=='sourceGeometryRuntime'||!/^[a-f0-9]{64}$/.test(entry.proofs.sourceGeometryRuntime)||!/^[a-f0-9]{64}$/.test(entry.runtime.sha256)||entry.runtime.asset!=='/models/configurator/components/'+entry.code+'-'+entry.runtime.sha256.slice(0,20)+'.json')throw Error('Invalid desk component candidate binding');
 if(process.env.LAUNCH_SITE==='true')return;
 return entry;
}
export function deskCandidateRevision(product:Product){const entry=deskCandidateForModel(product);return entry?hash(JSON.stringify(entry)):undefined;}
export function createDeskComponentLoader(data:DeskCandidates,readAsset:(asset:string)=>Promise<Uint8Array>){
 return async(product:Product,input?:unknown):Promise<CatalogRuntime|undefined>=>{
  let token=input;if(typeof token==='string'){if(token.length>5000)return;try{token=JSON.parse(token);}catch{return;}}
  const family=Array.isArray(token)?token[0]:token&&typeof token==='object'&&'family' in token?token.family:undefined;
  const sample=product.modelConfigurationId||Object.values(data.models).find(e=>e.productId===product.id&&e.familyId===family)?.sample;if(!sample)return;
  const entry=deskCandidateForModel({...product,modelConfigurationId:sample},data);if(!entry||family&&family!==entry.familyId)return;
  const bytes=await readAsset(entry.runtime.asset);if(bytes.byteLength>RUNTIME_TRANSPORT_MAX_BYTES||hash(bytes)!==entry.runtime.sha256)throw Error('Desk component source changed');
  const source:unknown=JSON.parse(Buffer.from(bytes).toString('utf-8'));validateDeskComponents(source,entry.code);
  return adaptDeskComponents(source,entry);
 };
}
