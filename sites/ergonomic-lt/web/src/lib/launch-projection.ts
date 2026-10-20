import {cache} from 'react';
import type {Product,Seed} from './types';
import {document,bindSourceModels} from './publication-workflow';
import type {Workflow} from './publication-workflow';
import type {Drafts} from './publication-copy';
export const launchMode=()=>process.env.LAUNCH_SITE==='true';
const released=cache(async()=>{
 try{return (await document<Workflow>('workflow.json')).payload.released;}
 catch{return {} as Workflow['released'];} // Publication unavailable: fail closed.
});
export async function launchProjection(seed:Seed,drafts?:Drafts):Promise<Seed>{
 if(!launchMode())return seed;
 const active=await released();
 const current=new Map(bindSourceModels(seed.products,drafts).map(m=>[m.key,m]));
 const allowed=(productId:string,id:string)=>{const key=productId+':'+id,m=current.get(key);return !!m&&active[key]?.revisionHash===m.revisionHash;};
 const products=seed.products.flatMap(p=>{
  if(!p.configurations.length)return allowed(p.id,'product')?[p]:[];
  const configurations=p.configurations.filter(c=>allowed(p.id,c.id));
  const copies=(p as Product&{publicationCopy?:Record<string,unknown>}).publicationCopy;
  const publicationCopy=copies?Object.fromEntries(configurations.filter(c=>copies[c.id]).map(c=>[c.id,copies[c.id]])):undefined;
  return configurations.length?[{...p,configurations,publicationCopy,publicationOriginalCount:p.configurations.length,published:true,translationReviewed:true}]:[];
 });
 const ids=new Set(products.map(p=>p.id));
 return {...seed,products,lines:seed.lines.filter(l=>l.productIds.some(id=>ids.has(id))).map(l=>({...l,productIds:l.productIds.filter(id=>ids.has(id))}))};
}
