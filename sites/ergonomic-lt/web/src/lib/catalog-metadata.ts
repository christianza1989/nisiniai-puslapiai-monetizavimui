import {selections} from './seo-collections';
export function catalogSeoQuery(base:string,query:Record<string,string|undefined>){
 const active=Object.entries(query).some(([key,value])=>key!=='puslapis'&&!!value);
 const page=/^[1-9]\d*$/.test(query.puslapis||'')?Number(query.puslapis):1;
 const candidate=selections.find(s=>s.id===query.atranka);
 const selection=candidate&&(base==='/produktai/'||candidate.catalog.split('?')[0]===base)?candidate:undefined;
 const route=selection?.path||base,params=new URLSearchParams();
 // The complete equivalent selection has an existing owner URL. More specific
 // search/type/line subsets keep their identity, while remaining noindex.
 for(const key of ['paieska','tipas','seima'])if(query[key])params.set(key,query[key]!);
 if(query.atranka&&!selection)params.set('atranka',query.atranka);
 if(page>1)params.set('puslapis',String(page));
 return {canonical:route+(params.size?'?'+params:''),noindex:active};
}
