import prepared from '../../content/prepared-3d-catalog.json';
import {catalogModelVisible} from './catalog-consolidation';
import type {Product,Seed} from './types';
export const allCatalogPrefix='/su-pasleptais-produktais';
const codes=new Set(prepared.codes);
/** A reversible presentation only: no supplier records or configurations are saved. */
export function preparedCatalog(seed:Seed,all=false):Seed{
 if(process.env.PREPARED_3D_CATALOG_ONLY!=='true')return seed;
 if(all)return {...seed,products:seed.products.map(p=>({...p,reviewCatalogPrefix:allCatalogPrefix}))};
 const products=seed.products.flatMap(p=>{
  if(!['kedes','rasomieji-stalai-ir-darbo-vietos'].includes(p.categorySlug))return [];
  const configurations=p.configurations.filter(c=>!!c.code&&codes.has(c.code)&&catalogModelVisible(p.id,c));
  return configurations.length?[{...p,configurations,publicationOriginalCount:p.configurations.length}]:[];
 });
 const ids=new Set(products.map(p=>p.id));
 return {...seed,products,lines:seed.lines.filter(l=>l.productIds.some(id=>ids.has(id))).map(l=>({...l,productIds:l.productIds.filter(id=>ids.has(id))}))};
}
