
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import membershipData from '../../content/product-taxonomy.json';
import type {Product} from './types';
import {catalogModelAliases} from './catalog-consolidation';
export type SelectionId='ergonominiai-stalai'|'ergonomines-kedes'|'balansines-kedes'|'priedai'|'biuro-kedes';
export const selections=[
 {id:'ergonominiai-stalai',name:copyText("ui.3dd3ef0abc8031398875","Ergonominiai stalai"),path:'/ergonominiai-stalai/',catalog:'/produktai/rasomieji-stalai-ir-darbo-vietos/?atranka=ergonominiai-stalai',description:copyText("ui.7759a2e0c97ab802f3cf","Reguliuojamo aukščio darbo stalai: elektrinės, rankinės ir pneumatinės komplektacijos.")},
 {id:'ergonomines-kedes',name:copyText("ui.7d4ea45051b9b7ee93fb","Ergonominės kėdės"),path:'/ergonomines-kedes/',catalog:'/produktai/kedes/?atranka=ergonomines-kedes',description:copyText("ui.1df4483627ab725135b6","Darbo kėdės, pritaikomos pagal gamintojo nurodytas reguliavimo funkcijas.")},
 {id:'balansines-kedes',name:copyText("ui.2f9be6b828d7ed22ff1e","Balansinės kėdės"),path:'/shop/balansines-kedes/',catalog:'/produktai/kedes/?atranka=balansines-kedes',description:copyText("ui.badff7b2af88504a20c6","Aktyviam sėdėjimui skirti modeliai iš dabartinio katalogo.")},
 {id:'priedai',name:copyText("ui.76d2374fe6a40119e102","Priedai darbo vietai"),path:'/shop/priedai/',catalog:'/produktai/?atranka=priedai',description:copyText("ui.be0b8b53552cb760718a","Darbo vietos panelės ir kiti patvirtinti katalogo priedai.")},
 {id:'biuro-kedes',name:copyText("ui.8d3911b916fd1c8627b3","Biuro kėdės"),path:'/biuro-kedes/',catalog:'/produktai/kedes/',description:copyText("ui.527addfded31f92bb6e4","Kėdės darbui, susitikimams ir lankytojams.")}
] as const;
type Membership={productId:string;configurationId:string|null;tags:string[]};
const memberships=membershipData as Membership[];
const index=new Map(memberships.map(row=>[row.productId+':'+(row.configurationId||''),row.tags]));
export const adjustableTypeId='293c566e-be4e-4866-aece-e52d047e9f1c';
export function modelTags(p:Product){
 if(p.modelConfigurationId)return index.get(p.id+':'+p.modelConfigurationId)||[];
 return [...new Set([...(index.get(p.id+':')||[]),...p.configurations.flatMap(c=>index.get(p.id+':'+c.id)||[])])];
}
export function matchesSelection(p:Product,id:string){
 if(id==='biuro-kedes')return p.categoryId==='www_chairs';
 return modelTags(p).includes(id);
}
export function selectionForPath(path:string){return selections.find(s=>s.path===path);}
export function isSelection(id:string){return selections.some(s=>s.id===id);}
export function normalizeSearch(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function searchSelection(query:string):string|undefined{
 const q=normalizeSearch(query);
 if(/^(?:ergonominiai baldai|ergonominis baldas)$/.test(q))return 'ergonominiai-baldai';
 if(/^(?:biuro baldai|modernus biuro baldai)$/.test(q))return 'biuro-baldai';
 if(/^(ergonomin(?:es|e|iu|ems)?(?: biuro)? k(?:edes|ede)|ergonomines kedes)$/.test(q))return 'ergonomines-kedes';
 if(/^(?:balansines kedes|balansine kede|aktyvus sedejimas)$/.test(q))return 'balansines-kedes';
 if(/^(?:biuro kedes|biuro kede)$/.test(q))return 'biuro-kedes';
 if(/^(?:elektriniai stalai|elektrinis stalas)$/.test(q))return 'electric';
 if(/^(?:ergonominiai(?: biuro)? stalai|ergonominis stalas|reguliuojami stalai|pakeliami stalai|pakeliamas stalas|reguliuojamo aukscio stal(?:ai|as))$/.test(q))return 'ergonominiai-stalai';
 if(/^(?:priedai|priedai darbo vietai)$/.test(q))return 'priedai';
}
export function matchesSearch(p:Product,query:string,categoryName=''){
 const selection=searchSelection(query);if(selection==='biuro-baldai')return true;if(selection==='ergonominiai-baldai')return matchesSelection(p,'ergonominiai-stalai')||matchesSelection(p,'ergonomines-kedes');if(selection==='electric')return modelTags(p).includes('electric');if(selection)return matchesSelection(p,selection);
 const haystack=normalizeSearch([p.name,p.description,p.modelConfigurationId||'',...catalogModelAliases(p.id,p.modelConfigurationId),...p.configurations.filter(c=>c.id===p.modelConfigurationId).map(c=>c.code||''),categoryName].join(' '));
 return normalizeSearch(query).split(' ').every(word=>haystack.includes(word));
}
export function curatedModels(models:Product[],id:string,limit=8){
 const selected=models.filter(p=>matchesSelection(p,id));const seen=new Set<string>();
 return selected.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).slice(0,limit);
}
export function typeMatches(p:Product,type:string){return !type||type===adjustableTypeId?(!type||matchesSelection(p,'ergonominiai-stalai')):type==='elektriniai-stalai'?modelTags(p).includes('electric'):type==='mechaniniai-stalai'?modelTags(p).includes('manual'):type==='pneumatiniai-stalai'?modelTags(p).includes('pneumatic'):p.subcategoryId===type;}
