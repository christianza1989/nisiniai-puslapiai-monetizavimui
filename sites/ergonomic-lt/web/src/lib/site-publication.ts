import type {Product} from './types';
/** Preview visibility is separate from eligibility on the real domain. */
export function productIsVisible(product:Product,preview:boolean){return preview||product.published&&product.translationReviewed;}
