import type {Product} from './types';

/** A card for an expanded 3D item describes the displayed state, including an
 * untouched default, rather than an older pre-rendered preset of that sample.
 */
export function expandedProductCardPath(product:Pick<Product,'id'|'modelConfigurationId'>,token:string,reviewedArticle:boolean){
 return '/api/produkto-kortele/?produktas='+encodeURIComponent(product.id)+'&konfig='+encodeURIComponent(token)+(reviewedArticle?'&modelis='+encodeURIComponent(product.modelConfigurationId!):'');
}
