import Link from 'next/link';
import {Suspense} from 'react';
import {customerConfiguration,customerContext} from '@/lib/customer-configuration-server';
import {customerKey} from '@/lib/customer-capability';
import {customerLabel} from '@/lib/customer-names';
import {customerProductCodes,customerProductPath} from '@/lib/customer-product-presentation';
import {customerProductImage} from '@/lib/customer-image-server';
export {customerProductImage} from '@/lib/customer-image-server';

import {productStudioPresentation} from '@/lib/product-studio';
import {publicProductView} from '@/lib/public-product-copy';
import {productModels} from '@/lib/product-models';
import {ProductCard} from './product-card';
import CustomerProductDetail from './customer-product-detail';
import {JsonLd} from './json-ld';
import type {Product} from '@/lib/types';
async function ConfiguredProduct({product,token,url,image,message:initialMessage}:{product:Product;token?:string;url:string;image:string|null;message:string}){
 let initial:Awaited<ReturnType<typeof customerConfiguration>>,message=initialMessage;
 try{initial=await customerConfiguration(product,token);}catch(error){if(!token)throw error;message='Nuorodos komplektacija nebegalioja. Rodoma pradinė komplektacija.';initial=await customerConfiguration(product);}
 return <>{message&&<p role="status">{message}</p>}<CustomerProductDetail initial={initial} url={url} image={image}/></>;
}
export default async function CustomerProductPage({product:p,parent,token,legacyToken}:{product:Product;parent:Product;token?:string;legacyToken?:string}){
 const codes=customerProductCodes(p),title=p.customerHeading||customerLabel(p.textReviewHeading||p.familyName||p.name,codes,'Biuro baldas'),family=!p.modelConfigurationId&&p.configurations.length>1,image=await customerProductImage(p),url=customerProductPath(p);
 const copy=productStudioPresentation(publicProductView(p),p.modelArticle?.configurable?.intro||p.modelArticle?.paragraphs),paragraphs=[...copy.descriptionParagraphs,...copy.overview].map(t=>customerLabel(t,codes,'')).filter(Boolean);
 let snapshot=token,message='';
 if(!family&&legacyToken&&!snapshot){try{const ctx=await customerContext(p),state=ctx.engine.parseStateToken(p,legacyToken);snapshot=customerKey().seal('configuration',{product:p.id,sample:p.modelConfigurationId||p.configurations[0]?.id||null,state,revision:ctx.revision});}catch{message='Nuorodos komplektacija nebegalioja. Rodoma pradinė komplektacija.';}}
 return <section className="product-page container"><nav aria-label="Puslapio vieta" className="breadcrumbs"><Link href="/produktai/">Baldų katalogas</Link> / <span>{title}</span></nav><section className="product-studio-intro" aria-labelledby="studio-product-title"><figure className="studio-intro-scene studio-intro-product">{image&&<img src={image} alt={title} fetchPriority="high" style={{width:'100%',height:'100%',objectFit:'contain'}}/>}</figure><div className="studio-intro-copy"><h1 id="studio-product-title">{title}</h1>{paragraphs.map((text,i)=><p key={i}>{text}</p>)}</div></section>
 {family?<section><h2>Pasirinkite šios linijos modelį</h2><div className="product-grid four">{productModels([parent]).map(model=><ProductCard key={model.slug} product={model}/>)}</div></section>:<Suspense fallback={<section className="product-configurator" id="konfiguratorius" aria-busy="true"><h2>Susikomplektuokite savo baldą</h2><p role="status">Įkeliama komplektacija…</p></section>}><ConfiguredProduct product={p} token={snapshot} url={url} image={image} message={message}/></Suspense>}
 <JsonLd value={{'@context':'https://schema.org','@type':'Product',name:title,description:paragraphs[0]||title,...(image?{image}:{}),url:'https://ergonomic.lt'+url}}/>
 </section>;
}
