import {copyText} from './editorial-copy';
/** Inflect the existing controlled Lithuanian noun; catalogue counts stay data. */
export function modelCount(count:number){
 const noun=copyText('ui.2002dc0e70776591a5f4','modelių');
 const rule=new Intl.PluralRules('lt').select(count);
 const form=noun==='modelių'?rule==='one'?noun.replace(/ių$/,'is'):rule==='few'?noun.replace(/ių$/,'iai'):noun:noun;
 return count+' '+form;
}
