import type {Product} from './types';
import type {QuoteRecord} from './quotes';

export function supplierSourceUrl(value:unknown):string|undefined{
 if(typeof value!=='string')return;
 try{const u=new URL(value);if(u.protocol==='https:'&&u.hostname==='www.nowystyl.com'&&!u.username&&!u.password)return u.href;}catch{}
}
export function supplierReference(product:Product){
 return {brand:product.brand,supplierProductId:product.id,sourceUrl:supplierSourceUrl(product.sourceUrl)};
}
// Old requests retain their saved snapshot; missing reference fields are filled
// for the authenticated administrator without rewriting stored customer records.
export function withSupplierReferences(record:QuoteRecord,products:Product[]):QuoteRecord{
 const payload=JSON.parse(record.payload);
 const items=payload.items.map((item:any)=>{
  const product=products.find(p=>p.id===item.productId);if(!product)return item;
  return {...item,brand:item.brand||product.brand,supplierProductId:item.supplierProductId||product.id,
   sourceUrl:supplierSourceUrl(item.sourceUrl)||supplierSourceUrl(product.sourceUrl)};
 });
 return {...record,payload:JSON.stringify({...payload,items})};
}
export function quoteOrderText(i:any){
 return `${i.quantity} vnt. ${i.productName} (${i.brand})${i.configurationName?' / '+i.configurationName:''}`+
  `\nTiekėjo produkto ID: ${i.supplierProductId||i.productId}`+
  (i.configurationId?'\nKomplektacijos ID: '+i.configurationId:'')+
  (supplierSourceUrl(i.sourceUrl)?'\nOriginali prekė: '+supplierSourceUrl(i.sourceUrl):'')+
  (i.baseArticle?'\nGamintojo bazinis kodas: '+i.baseArticle:'')+
  (i.configurationDetails?.length?'\n'+i.configurationDetails.map((d:any)=>d.label+': '+d.value).join('\n'):'')+
  (i.supplierOptions?.length?'\nGamintojo pasirinkimų kodai: '+i.supplierOptions.join(';'):'')+
  (i.note?'\nPastaba: '+i.note:'');
}
