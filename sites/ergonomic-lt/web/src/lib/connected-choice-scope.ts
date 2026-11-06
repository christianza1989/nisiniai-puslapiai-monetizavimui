import scope from '../../content/text-review-connected-choices.json';
import type {Product} from './types';
export function connectedChoiceModel(product:Product,kind:'legacy'|'prepared'){
 if(process.env.PUBLIC_ORIGIN!=='https://ergonomic-text-review.pinet-azprekyba.workers.dev'||process.env.TEXT_REVIEW_PROPOSALS!=='true')return;
 const sample=product.configurations.find(c=>c.id===product.modelConfigurationId);
 return scope[kind].find(r=>r.productId===product.id&&r.sample===sample?.id&&r.code===sample?.code);
}
