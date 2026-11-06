import {studioBuilderSteps} from './product-studio';
import type {Product} from './types';
import type {CustomerBuilderStep} from './customer-configuration';

/** Classify on the server; only opaque control IDs enter the public builder. */
export function customerBuilderSteps(product:Product,choices:Record<string,string[]>,fieldId:(field:string)=>string,finishFields:string[]=[]):CustomerBuilderStep[]{
 return studioBuilderSteps(product,choices,false,finishFields).map(step=>({id:step.id,label:step.label,controls:step.fields.map(fieldId)}));
}
