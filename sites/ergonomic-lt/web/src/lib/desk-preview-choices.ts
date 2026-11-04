import policy from '../../content/desk-preview-choice-policy.json';
import type {CatalogFamily} from './catalog-configurator';
import type {Asset} from './expanded-configurator';
import {deskColorPlan} from './desk-color-plan';
type Choices=Record<string,string[]>;
type Values=Record<string,string>;
export const lithuanianSocketStandards: Record<string,string> = {
 FSOCKETSTANDARD:'EU', FSOCKET:'EU',
 FSOCKETMEDIAPORT:'GE', FSOCKETMEDIAPORTLEFT:'GE', FSOCKETMEDIAPORTRIGHT:'GE',
};

export const hasDeskPreviewChoicePolicy=(family:CatalogFamily|undefined)=>!!family&&policy.codes.includes(family.baseArticle);

/** Exact active witnesses only; a fixed original finish is always preserved. */
export function availableDeskColorChoices(family:CatalogFamily,choices:Choices,values:Values,assets:Asset[]):Choices{
 const colors=family.deskColors;
 if(!colors||!hasDeskPreviewChoicePolicy(family))return choices;
 const result={...choices};
 for(const [field,finish]of Object.entries(colors.fields)){
  if(!result[field])continue;
  const blocked=policy.blockedColorFields.some(rule=>rule.code===family.baseArticle&&rule.field===field&&Object.entries(rule.when).every(([key,value])=>values[key]===value));
  result[field]=result[field].filter(value=>value===finish.default||!blocked&&!deskColorPlan(colors,{...values,[field]:value},assets).pending.includes(field));
 }
 return result;
}

/** Singleton finish values remain in the specification, without a selector. */
export function visibleDeskPreviewChoices(family:CatalogFamily|undefined,choices:Choices):Choices{
 if(family?.collectionMode==='desk-components'){
  choices=Object.fromEntries(Object.entries(choices).filter(([field,values])=>
   !(values.length===1&&values[0]===lithuanianSocketStandards[field])));
 }
 if(!family?.deskColors||!hasDeskPreviewChoicePolicy(family))return choices;
 return Object.fromEntries(Object.entries(choices).filter(([field,values])=>!family.deskColors!.fields[field]||values.length>1));
}
