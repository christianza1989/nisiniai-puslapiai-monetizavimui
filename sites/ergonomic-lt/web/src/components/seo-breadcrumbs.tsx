import {JsonLd} from './json-ld';
export function SeoBreadcrumbs({items}:{items:{name:string;path:string}[]}){
 return <JsonLd value={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:'https://ergonomic.lt'+item.path}))}}/>;
}
