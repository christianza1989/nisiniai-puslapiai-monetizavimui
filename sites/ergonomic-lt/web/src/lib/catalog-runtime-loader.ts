import {createHash} from 'node:crypto';
import indexData from '../../content/configurator-additional-index.json';
import {configuratorRuntimeAsset} from './configurator-runtime-assets';
import type {CatalogRuntime,CatalogAnchor} from './catalog-configurator';
import type {Product} from './types';
import {shareCatalogRuntimeData} from './catalog-runtime-sharing';
import {chairCandidates,createChairCandidateLoader} from './chair-structure-candidates';

export type CatalogRuntimeIndex={schemaVersion:number;articles:Record<string,{asset:string;sha256:string}>;products:Record<string,{id:string;articles:{code:string;sample:string;name:string;id?:string}[]}>};
type Shard={article:{code:string;sample:string;name:string};anchors:CatalogAnchor[];palettes:CatalogRuntime['palettes']};
function requestedIdentity(input:unknown){
 if(typeof input==='string'){
  if(input.length>5000)return;
  try{input=JSON.parse(input);}catch{return;}
 }
 const anchor=Array.isArray(input)?input[1]:input&&typeof input==='object'?'anchor' in input?input.anchor:undefined:undefined;
 const family=Array.isArray(input)?input[0]:input&&typeof input==='object'?'family' in input?input.family:undefined:undefined;
 return {article:typeof anchor==='string'?anchor.match(/^(K[A-Z0-9]+):/)?.[1]:undefined,family:typeof family==='string'?family:undefined};
}
// Data is loaded only from the immutable release index and our own asset
// binding. Neither an arbitrary customer URL nor customer geometry is trusted.
export function createCatalogRuntimeLoader(index:CatalogRuntimeIndex,readAsset:(asset:string)=>Promise<Uint8Array>){
return async function loadCatalogRuntime(product:Product,input?:unknown):Promise<CatalogRuntime|undefined>{
 const binding=index.products[product.id];if(!binding)return;
 const model=product.configurations.find(c=>c.id===product.modelConfigurationId);
 const identity=requestedIdentity(input),code=model?.code||identity?.article||binding.articles[0]?.code;
 const article=binding.articles.find(a=>a.code===code&&(!model||a.sample===model.id)&&(!identity?.family||(a.id||binding.id)===identity.family)&&product.configurations.some(c=>c.id===a.sample&&c.code===a.code));
 const receipt=code?index.articles[code]:undefined;if(!article||!receipt)return;
 const familyId=article.id||binding.id;
 if(!/^\/models\/configurator\/runtime\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(receipt.asset)||!/^cfg-[a-f0-9]{12}$/.test(familyId))throw Error('Invalid configurator release binding');
 const bytes=await readAsset(receipt.asset);
 if(bytes.byteLength>8_000_000||createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw Error('Configurator runtime source mismatch');
 const shard=JSON.parse(Buffer.from(bytes).toString('utf8')) as Shard;
 if(shard.article.code!==code||!shard.anchors.length||shard.anchors.some(a=>a.article!==code))throw Error('Configurator article mismatch');
 const sample=model?.id||article.sample;
 return shareCatalogRuntimeData<CatalogRuntime>({family:{id:familyId,kind:'catalog',productId:product.id,baseArticle:code!,sample,articles:[{...article,sample}],anchors:shard.anchors.map(a=>({...a,sample}))},palettes:shard.palettes});
};
}
const loadLegacyRuntime=createCatalogRuntimeLoader(indexData as CatalogRuntimeIndex,configuratorRuntimeAsset);
const loadChairRuntime=createChairCandidateLoader(chairCandidates,configuratorRuntimeAsset);
export async function loadCatalogRuntime(product:Product,input?:unknown){
 return await loadChairRuntime(product,input)||await loadLegacyRuntime(product,input);
}
