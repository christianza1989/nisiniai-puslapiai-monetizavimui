import {createHash} from 'node:crypto';
import data from '../../content/chair-structure-candidates.json';
import {catalogModelVisible} from './catalog-consolidation';
import type {Product} from './types';
import type {CatalogRuntime} from './catalog-configurator';

export type ChairCandidate={key:string;productId:string;sample:string;code:string;familyId:string;collectionMode:'structure-only';acceptance:'DRAFT_READY';optionsRequired:boolean;runtime:{asset:string;sha256:string};proofs:{sourceGeometryRuntime:string;optionsGemini:string;generalGemini:string;factualReview:string;desktop:string;mobile:string}};
export type ChairCandidates={schemaVersion:1;models:Record<string,ChairCandidate>};
export const chairCandidates=data as ChairCandidates;
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
export function candidateForModel(product:Product,entries=chairCandidates):ChairCandidate|undefined{
 if(product.categorySlug!=='kedes'||product.id.toLowerCase().includes('xilium')||!product.modelConfigurationId)return;
 const c=product.configurations.find(c=>c.id===product.modelConfigurationId);
 const entry=entries.models[product.id+':'+product.modelConfigurationId];if(!entry)return;
 if(!c||!catalogModelVisible(product.id,c)||entry.key!==product.id+':'+c.id||entry.productId!==product.id||entry.sample!==c.id||entry.code!==c.code)throw Error('Chair candidate identity mismatch');
 if(entry.collectionMode!=='structure-only'||entry.acceptance!=='DRAFT_READY'||typeof entry.optionsRequired!=='boolean'||!/^cfg-[a-f0-9]{12}$/.test(entry.familyId)||!/^K[A-Z0-9]+$/.test(entry.code)||!entry.proofs||Object.keys(entry.proofs).sort().join(',')!=='desktop,factualReview,generalGemini,mobile,optionsGemini,sourceGeometryRuntime'||Object.values(entry.proofs).some(v=>!v||!/^[a-f0-9]{64}$/.test(v)))throw Error('Chair candidate acceptance missing');
 if(entry.runtime.asset!=='/models/configurator/structure/'+entry.code+'-'+entry.runtime.sha256.slice(0,20)+'.json'||!/^[a-f0-9]{64}$/.test(entry.runtime.sha256))throw Error('Chair candidate asset binding mismatch');
 return entry;
}
export function candidateRevision(product:Product){const c=candidateForModel(product);return c?digest(JSON.stringify(c)):undefined;}

/** No incomplete manifest entries, external URLs or cross-model token adoption. */
export function createChairCandidateLoader(entries:ChairCandidates,readAsset:(asset:string)=>Promise<Uint8Array>){
 return async (product:Product,input?:unknown):Promise<CatalogRuntime|undefined>=>{
  let token=input;
  if(typeof token==='string'){if(token.length>5000)return;try{token=JSON.parse(token);}catch{return;}}
  const family=Array.isArray(token)?token[0]:token&&typeof token==='object'&&'family' in token?token.family:undefined;
  const anchor=Array.isArray(token)?token[1]:token&&typeof token==='object'&&'anchor' in token?token.anchor:undefined;
  // Quotes/PDF may resolve the parent product. Only the manifest's own exact
  // family ID selects its original sample; customer sample IDs never rebind it.
  const sample=product.modelConfigurationId||Object.values(entries.models).find(c=>c.productId===product.id&&c.familyId===family)?.sample;
  if(!sample)return;
  const entry=candidateForModel({...product,modelConfigurationId:sample},entries);
  if(!entry||family&&family!==entry.familyId)return;
  // An older saved token may share the family identity but use the previous
  // factorized anchors. Let the immutable legacy loader resolve that token.
  if(typeof anchor==='string'&&!new RegExp('^'+entry.code+':structure-[a-f0-9]{64}$').test(anchor))return;
  const bytes=await readAsset(entry.runtime.asset);
  if(bytes.byteLength>8_000_000||digest(bytes)!==entry.runtime.sha256)throw Error('Chair candidate runtime changed');
  const runtime=JSON.parse(Buffer.from(bytes).toString('utf8')) as CatalogRuntime;
  const f=runtime.family;
  if(f.id!==entry.familyId||f.productId!==entry.productId||f.baseArticle!==entry.code||f.sample!==entry.sample||f.collectionMode!=='structure-only'||f.articles.length!==1||f.articles[0].code!==entry.code||f.articles[0].sample!==entry.sample||!f.anchors.length)throw Error('Chair candidate runtime identity mismatch');
  if(entry.optionsRequired!==f.anchors.some(a=>Object.keys(a.choices).length>0))throw Error('Chair candidate options copy scope mismatch');
  for(const a of f.anchors){
   if(a.article!==entry.code||a.sample!==entry.sample||a.components.length||a.profiles.length||a.axes.some(k=>!a.classes[k]?.endsWith('_OPTIONS')&&!a.classes[k]?.endsWith('_DIMENSIONS'))||Object.keys(a.choices).some(k=>!a.axes.includes(k)))throw Error('Chair candidate contains unmeasured or finish controls');
   if(a.geometry.asset!=='/models/configurator/structure/'+entry.code+'-'+a.geometry.assetSha256.slice(0,20)+'.glb'||!/^[a-f0-9]{64}$/.test(a.geometry.assetSha256))throw Error('Chair candidate geometry binding mismatch');
  }
  return runtime;
 };
}
