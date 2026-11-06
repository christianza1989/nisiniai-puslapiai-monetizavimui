import type {Product} from './types';
/** The customer snapshot reads one model's text, never the CMS counters and
 * labels for every other model in the same product line. Keep matching examples
 * and all product metadata; construction and quote engines retain the full product. */
export function customerReviewProduct(product:Product,code:string):Product{
 const configurations=product.configurations.filter(c=>c.code===code);
 return code&&configurations.length?{...product,configurations}:product;
}
