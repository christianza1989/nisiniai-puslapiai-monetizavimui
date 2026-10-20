import {choiceLabel,fieldLabels} from './expanded-configurator';
import type {ExpandedState} from './expanded-configurator';
type Item={configurationState?:ExpandedState;configurationDetails?:{label:string;value:string}[];configurationLabel?:string;supplierOptions?:string[]};
const fields:Record<string,string>={Armrests:'CARMRESTS',Porankiai:'CARMRESTS',Base:'CBASE',Pagrindas:'CBASE',Castors:'CCASTORS',Ratukai:'CCASTORS'};
/** Correct a display projection only. Supplier IDs, choices and saved snapshots survive. */
export function correctedItemPresentation<T extends Item>(item:T):T{
 const state=item.configurationState;
 const values=state?.values||Object.fromEntries((item.supplierOptions||[]).map(option=>{const i=option.indexOf('=');return [option.slice(0,i).split('.').at(-1)!,option.slice(i+1)];}));
 const details=item.configurationDetails?.map(row=>{
  const field=fields[row.label],value=field&&values[field];if(!value)return row;
  // Reviewed prose is not rewritten; only the old generic code-based labels.
  if(!row.value.startsWith(value)&&!row.value.includes(' · reguliuojami'))return row;
  return {label:fieldLabels[field],value:choiceLabel(field,value,undefined,state?.family)};
 });
 let label=item.configurationLabel;
 if(label&&values.CARMRESTS){const value=values.CARMRESTS,model=value.match(/^R\d+/)?.[0]||value;
  // Exact historical fallback format, used solely to remove the false claim.
  const old=model+' · reguliuojami'+(value.includes('POL')?' · poliruotas aliuminis':'');
  label=label.replace(old,choiceLabel('CARMRESTS',value,undefined,state?.family));
 }
 return {...item,...(details?{configurationDetails:details}:{}),...(label!==undefined?{configurationLabel:label}:{})};
}
