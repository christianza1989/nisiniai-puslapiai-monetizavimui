import type {Product} from './types';
import {configurableArticle} from './configuration-article';
import {loadCatalogRuntime} from './catalog-runtime-loader';
/** Each reviewed model gets its own immutable runtime; no global engine mutation. */
export async function productReadingRuntimes(products:Product[]){
 return Object.fromEntries(await Promise.all(products.filter(p=>configurableArticle(p)).map(async p=>[p.id+':'+p.modelConfigurationId,await loadCatalogRuntime(p)] as const)));
}
