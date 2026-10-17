import {notFound} from 'next/navigation';
import {localChairQA} from '@/lib/chair-local-qa';
import {baseSeed} from '@/lib/catalog';
import {modelProduct} from '@/lib/product-models';
import {publicProductView} from '@/lib/public-product-copy';
import ExpandedProductDetail from '@/components/expanded-product-detail';
export const metadata={title:'Vietinė techninė patikra',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const models=await localChairQA();if(!models)notFound();
 const {model}=await searchParams,entry=models[model||'fixed'];if(!entry)notFound();
 const f=entry.runtime.family,parent=baseSeed().products.find(p=>p.id===f.productId),sample=parent?.configurations.find(c=>c.id===f.sample);if(!parent||!sample)notFound();
 const product=publicProductView(modelProduct(parent,sample));
 return <section className="section container product-page"><p>Vietinė techninė patikra · tekstai dar nepriimti</p><ExpandedProductDetail product={product} url="/local-chair-qa/" presets={null} catalogRuntime={entry.runtime}/></section>;
}
