import type {Product} from './types';
import {matchesSelection,matchesSearch,typeMatches} from './seo-collections';
export type CatalogQuery=Record<string,string|string[]|undefined>;
export const queryValue=(query:CatalogQuery,key:string)=>typeof query[key]==='string'?query[key] as string:'';
export function selectedCatalog(models:Product[],query:CatalogQuery,selection?:string){
 const search=queryValue(query,'paieska'),type=queryValue(query,'tipas'),line=queryValue(query,'seima'),sort=queryValue(query,'rikiuoti')||'a-z';
 return models.filter(p=>(!selection||matchesSelection(p,selection))&&(!search||matchesSearch(p,search))&&typeMatches(p,type)&&(!line||p.lineId===line)).sort((a,b)=>{
  if(sort==='ergonomines-kedes'){const priority=Number(matchesSelection(b,'ergonomines-kedes'))-Number(matchesSelection(a,'ergonomines-kedes'));if(priority)return priority;}
  return sort==='z-a'?b.name.localeCompare(a.name,'lt'):sort==='nauji'?Number(b.isNew)-Number(a.isNew)||a.name.localeCompare(b.name,'lt'):a.name.localeCompare(b.name,'lt');
 });
}
export function catalogPageSlice(models:Product[],query:CatalogQuery){
 const raw=queryValue(query,'puslapis')||'1',currentPage=Number(raw),pageCount=Math.max(1,Math.ceil(models.length/20));
 if(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(currentPage)||currentPage>pageCount)return undefined;
 return {currentPage,pageCount,models:models.slice((currentPage-1)*20,currentPage*20)};
}
export function catalogPageHref(base:string,query:CatalogQuery,page:number){
 const params=new URLSearchParams();
 for(const key of ['paieska','tipas','seima','atranka','rikiuoti']){const v=queryValue(query,key);if(v)params.set(key,v);}
 if(page>1)params.set('puslapis',String(page));
 return base+(params.size?'?'+params:'');
}
