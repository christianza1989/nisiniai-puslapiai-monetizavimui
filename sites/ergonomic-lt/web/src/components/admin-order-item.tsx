import {supplierSourceUrl} from '@/lib/supplier-reference';
import {correctedItemPresentation} from '@/lib/quote-presentation';
import {ArrowUpRight} from 'lucide-react';

export function AdminOrderItem({item}:{item:any}){
 const i=correctedItemPresentation(item);
 const source=supplierSourceUrl(i.sourceUrl);
 return <li className="admin-order-item"><p><strong>{i.quantity} vnt. {i.productName}</strong>{i.configurationName?' · '+i.configurationName:''}{i.note?' · '+i.note:''}</p>
  <dl className="admin-order-identity"><div><dt>Gamintojas</dt><dd>{i.brand||'Nenurodytas'}</dd></div>
   <div><dt>Tiekėjo produkto ID</dt><dd>{i.supplierProductId||i.productId}</dd></div>
   {i.baseArticle&&<div><dt>Prekės kodas</dt><dd>{i.baseArticle}</dd></div>}
   {i.configurationId&&<div><dt>Komplektacijos ID</dt><dd>{i.configurationId}</dd></div>}
  </dl>{source&&<a className="text-link" href={source} target="_blank" rel="noopener noreferrer">Originali gamintojo prekė<ArrowUpRight size={16}/></a>}
  {!!i.configurationDetails?.length&&<details className="detail-disclosure"><summary>Komplektacijos pasirinkimai</summary><dl className="configuration-summary">{i.configurationDetails.map((d:any,n:number)=><div key={n}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl></details>}
  {!!i.supplierOptions?.length&&<details className="detail-disclosure"><summary>Visi pasirinkimų kodai</summary><p className="preserve-lines">{i.supplierOptions.join('\n')}</p></details>}
 </li>;
}
