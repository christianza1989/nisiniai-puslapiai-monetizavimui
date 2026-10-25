import type {ExpandedState} from './expanded-configurator';
export type QuoteEntry={productId:string;name:string;brand:string;url:string;image:string|null;configurationId:string|null;configurationState?:ExpandedState;configurationDetails?:{label:string;value:string}[];configurationLabel:string;quantity:number;note:string};
export function validQuoteEntry(x:unknown):x is QuoteEntry{if(!x||typeof x!=='object')return false;const p=x as QuoteEntry;
  const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
  const image=p.image===null||(typeof p.image==='string'&&(/^\/media\/[a-zA-Z0-9._%\-/]+$/.test(p.image)||/^https:\/\/www\.nowystyl\.com\/getmedia\/[a-zA-Z0-9._%?=&\-/]+$/.test(p.image))&&!p.image.includes('..'));
  const state=p.configurationState;const stateValid=state===undefined||state&&typeof state.family==='string'&&state.family.length<30&&typeof state.anchor==='string'&&state.anchor.length<100&&state.values&&typeof state.values==='object'&&!Array.isArray(state.values)&&Object.keys(state.values).length<=35&&Object.entries(state.values).every(([k,v])=>/^[A-Z0-9]+$/.test(k)&&typeof v==='string'&&v.length<=100);
  if(p.configurationDetails!==undefined&&(!Array.isArray(p.configurationDetails)||p.configurationDetails.length>35||p.configurationDetails.some(d=>!d||!text(d.label,160)||!text(d.value,500))))return false;
  return !!stateValid&&text(p.productId,200)&&p.productId.startsWith('product_')&&text(p.name,500)&&(typeof p.brand==='string'&&p.brand.length<=500)&&text(p.url,1000)&&/^\/produktai\/[a-z0-9\-]+\/[a-z0-9\-]+\/$/.test(p.url)&&image&&(p.configurationId===null||text(p.configurationId,100))&&text(p.configurationLabel,2000)&&Number.isInteger(p.quantity)&&p.quantity>0&&p.quantity<=1000&&text(p.note,500);
}
