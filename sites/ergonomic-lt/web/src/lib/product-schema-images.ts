import type {Product} from './types';
import {preparedImageSource} from './product-image-sources';

/** Schema uses the same prepared photographs as the gallery, without supplier URLs. */
export function productSchemaImages(product:Pick<Product,'image'|'gallery'>,origin='https://ergonomic.lt'){
 return [...new Set([product.image,...product.gallery].filter((src):src is string=>!!src).map(preparedImageSource)
  .filter(src=>src.startsWith('/media/')&&!src.includes('..')).map(src=>new URL(src,origin).href))].slice(0,5);
}
