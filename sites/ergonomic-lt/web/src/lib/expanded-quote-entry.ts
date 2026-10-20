import type {Product,Configuration} from './types';
import type {ExpandedState} from './expanded-configurator';
import type {QuoteEntry} from './quote-entry';

/** The cart must retain the displayed source state even before the first edit.
 * A published sample can contain retired supplier option codes; its identity is
 * preserved, while the server resolves the actual current 3D configuration.
 */
export function expandedQuoteEntry(product:Product,configuration:Configuration,state:ExpandedState,options:{url:string;model?:Configuration|null;customized:boolean;quantity:number;choiceLabel:(field:string,value:string)=>string}):QuoteEntry{
 const {model,customized,quantity,url,choiceLabel}=options;
 return {productId:product.id,name:product.name,brand:product.brand,url,
  image:product.modelConfigurationId?product.image:configuration.image,
  configurationId:model&&!customized?model.id:configuration.id,
  configurationState:state,configurationDetails:configuration.details,
  configurationLabel:[configuration.description,state.values.CARMRESTS&&choiceLabel('CARMRESTS',state.values.CARMRESTS),(state.values.CUPHCOLOR||state.values.CUPHSEATCOLOR)&&choiceLabel('CUPHCOLOR',state.values.CUPHCOLOR||state.values.CUPHSEATCOLOR)].filter(Boolean).join(' · '),
  quantity,note:''};
}
