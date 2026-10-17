import type {Product} from './types';
import {modelTags} from './seo-collections';
import {copyText} from './editorial-copy';

/** Display taxonomy never changes supplier identity, options or stable URLs. */
export function productKind(p:Product):{label:string;path:string}|undefined{
 const tags=!p.modelConfigurationId&&p.configurations.length>1?p.configurations.map(c=>modelTags({...p,modelConfigurationId:c.id})).reduce((common,next)=>common.filter(tag=>next.includes(tag))):modelTags(p);
 if(tags.includes('electric'))return {label:copyText('ui.fdc62ced062cb73e29cd','elektra reguliuojamo aukščio stalas'),path:'/ergonominiai-stalai/'};
 if(tags.includes('manual'))return {label:copyText('ui.6e89699ff50363f39a69','rankiniu būdu reguliuojamo aukščio stalas'),path:'/ergonominiai-stalai/'};
 if(tags.includes('pneumatic'))return {label:copyText('ui.2359357337df122799e2','pneumatiniu būdu reguliuojamo aukščio stalas'),path:'/ergonominiai-stalai/'};
 if(tags.includes('ergonomines-kedes'))return {label:copyText('ui.c7f1a0509244cbaeed87','ergonominė darbo kėdė'),path:'/ergonomines-kedes/'};
 if(tags.includes('balansines-kedes'))return {label:copyText('ui.b40808f3fa1df90e37db','aktyvaus sėdėjimo kėdė'),path:'/shop/balansines-kedes/'};
 if(tags.includes('priedai'))return {label:copyText('ui.76d2374fe6a40119e102','Priedai darbo vietai'),path:'/shop/priedai/'};
}
export function displayModelName(p:Product){
 // Generic import scaffolding is not part of a model code. Names such as
 // Play&Work, DUO-BACK, MESH and the supplier's construction codes survive.
 return p.name.replace(/[, ]*(?:\bwith )?\b(?:(?:electric|manual|pneumatic) )?height adjustment(?: by crank|\s*[–-]\s*ratchet type)?\b/gi,'')
  .replace(/\b(?:swivel|office|meeting|conference|visitor|workbench)\b/gi,'')
  .replace(/\bir(?=\s+(?:MESH|UPH|DUO-BACK)\b)/g,'')
  .replace(/\s+/g,' ').replace(/[, ]+$/,'').trim()||p.name;
}
export function productHeading(p:Product){
 const name=displayModelName(p),kind=productKind(p);
 return kind?capitalize(kind.label)+' '+name:name;
}
export function capitalize(value:string){return value.charAt(0).toLocaleUpperCase('lt')+value.slice(1);}
