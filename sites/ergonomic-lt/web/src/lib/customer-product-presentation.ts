import {customerKey} from './customer-capability';
import {customerLabel} from './customer-names';
import inventory from '../../content/text-review-inventory.json';
import type {Product,Seed} from './types';
import {supplierOptions} from './configuration-labels';
import {modelName} from './product-models';
export function customerProductCodes(p:Product){
 const codes=new Set<string>();
 for(const c of p.configurations){if(c.code)codes.add(c.code);for(const option of supplierOptions(c)){const [key,value]=option.split('=');for(const part of key.split('.'))codes.add(part);if(value)codes.add(value);}const bindings=(inventory.models as Record<string,{bindings:Record<string,string>}>)[c.code||'']?.bindings;for(const key of Object.keys(bindings||{}))if(key.startsWith('name:'))codes.add(key.slice(5));}
 return codes;
}
export function customerProductPath(p:Product){
 const safe=customerLabel(p.familyName||p.name,customerProductCodes(p),'biuro-baldas'),slug=safe.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'biuro-baldas';
 if(!p.modelConfigurationId&&((p as Product&{publicationOriginalCount?:number}).publicationOriginalCount??p.configurations.length)>1)return '/produktai/'+p.categorySlug+'/'+slug+'-linija-v-'+customerKey().id('line',p.id)+'/';
 const scope={product:p.id,sample:p.modelConfigurationId||p.configurations[0]?.id||null};
 return '/produktai/'+p.categorySlug+'/'+slug+'-modelis-v-'+customerKey().id('product',scope)+'/';
}
export function customerCatalogPresentation(seed:Seed):Seed{
 return {...seed,products:seed.products.map(p=>{
  const codes=customerProductCodes(p),line=customerLabel(p.name,codes,'Biuro baldas'),names:Record<string,string>={};
  for(const c of p.configurations)names[c.id]=customerLabel(p.textReviewNames?.[c.id]||modelName(p,c),codes,line);
  return {...p,customerHeading:customerLabel(p.textReviewHeading||line,codes,line),customerModelNames:names};
 })};
}
