import type {Product,Category} from './types';
import {copyText} from './editorial-copy';
import {productKind,productHeading,capitalize} from './product-presentation';
import {selectionForPath} from './seo-collections';
const path=(p:Product)=>`/produktai/${p.categorySlug}/${p.slug}/`;
/** One ordered authority for both the visible trail and BreadcrumbList. */
export function productBreadcrumbs(p:Product,parent:Product,category:Category){
 const kind=productKind(p);
 return [{name:copyText('ui.719328db9e74695316ff','Pradžia'),path:'/'},
  {name:copyText('ui.1e54fd1867276164f3be','Baldų katalogas'),path:'/produktai/'},
  kind?{name:selectionForPath(kind.path)?.name||capitalize(kind.label),path:kind.path}:{name:category.name,path:'/produktai/'+p.categorySlug+'/'},
  ...(p.modelConfigurationId&&parent.configurations.length>1?[{name:parent.name,path:path(parent)}]:[]),
  {name:productHeading(p),path:path(p)}];
}
