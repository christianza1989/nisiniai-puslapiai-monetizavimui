
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {findProductAsync,productPath,catalogAsync,lineForAsync,visibleProductsAsync,visibleModelsAsync} from '@/lib/catalog';
import {productModels} from '@/lib/product-models';
import {pageMetadata} from '@/lib/metadata';
import {ProductDetail} from '@/components/product-detail';
import {ProductGallery} from '@/components/product-gallery';
import {ProductCard} from '@/components/product-card';
import {JsonLd} from '@/components/json-ld';
import {BreadcrumbTrail} from '@/components/breadcrumb-trail';
import {selections,matchesSelection} from '@/lib/seo-collections';
import {publicProductView} from '@/lib/public-product-copy';
import {modelSeo} from '@/lib/model-seo';
import {ProductArticleBody} from '@/components/product-article';
import {ProductStudioIntro} from '@/components/product-studio-intro';
import {loadCatalogRuntime} from '@/lib/catalog-runtime-loader';
import {createExpandedEngine,type ExpandedState} from '@/lib/expanded-configurator';
import {configurableArticle} from '@/lib/configuration-article';
import {productBreadcrumbs} from '@/lib/product-breadcrumbs';
import {productHeading} from '@/lib/product-presentation';
import {productSchemaImages} from '@/lib/product-schema-images';

type Props={params:Promise<{category:string;product:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({params,searchParams}:Props){const {category,product}=await params,query=await searchParams,p=await findProductAsync(category,product,query.pavyzdys);if(!p)return {title:copyText("ui.a97a3a9087707261ddaa","Prekė nerasta"),robots:{index:false,follow:false}};const seo=modelSeo(p);const metadata=pageMetadata(seo.title,productPath(p),seo.description,p.image);if(p.modelArticle)metadata.title={absolute:seo.title};return query.konfig||query.pavyzdys?{...metadata,robots:{index:false,follow:true}}:metadata;}
export default async function Page({params,searchParams}:Props){
 const {category,product}=await params,query=await searchParams,p=await findProductAsync(category,product,query.pavyzdys);if(!p)notFound();
 const c=(await catalogAsync()).categories.find(c=>c.id===p.categoryId)!,line=await lineForAsync(p),parents=await visibleProductsAsync(),parent=parents.find(x=>x.id===p.id)!;
 const models=productModels([parent]),isFamily=!p.modelConfigurationId&&p.configurations.length>1;
 const savedConfiguration=typeof (await searchParams).konfig==='string';
 const catalogRuntime=isFamily&&!savedConfiguration?undefined:await loadCatalogRuntime(p,(await searchParams).konfig);
 let initialConfiguration:ExpandedState|undefined,initialCustomized=false,configurationMessage:string|undefined;
 if(configurableArticle(p)){
  const engine=createExpandedEngine(catalogRuntime);initialConfiguration=engine.initialStateForProduct(p);
  const token=(await searchParams).konfig;
  if(typeof token==='string')try{initialConfiguration=engine.parseStateToken(p,token);initialCustomized=true;}catch{configurationMessage='Nuorodos komplektacija negalioja. Rodoma pradinė komplektacija.';}
 }
 const siblings=models.filter(x=>x.slug!==p.slug),related=(await visibleModelsAsync()).filter(x=>x.id!==p.id&&x.subcategoryId===p.subcategoryId).slice(0,4);
 const trail=productBreadcrumbs(p,parent,c);
 const breadcrumbs=<BreadcrumbTrail items={trail}/>;
 return <><section className="product-page container">{breadcrumbs}
 {isFamily&&!savedConfiguration?<><ProductStudioIntro product={publicProductView(p)}/><div className="product-family-studio"><div className="section-heading"><h2>Pasirinkite šios linijos modelį</h2><p>{models.length} {copyText("ui.98a9ba8c83e15c3611b9","gamintojo modeliai ir pavyzdinės komplektacijos. Pasirinkite konkretų modelį.")}</p></div><div id="konfiguratorius" className="product-grid four">{models.map(model=><ProductCard key={model.slug} product={model}/>)}</div></div></>:<ProductDetail product={publicProductView(p)} url={productPath(p)+(typeof query.pavyzdys==='string'&&query.pavyzdys===p.modelConfigurationId?'?pavyzdys='+encodeURIComponent(query.pavyzdys):'')} catalogRuntime={catalogRuntime} initialConfiguration={initialConfiguration} initialCustomized={initialCustomized} configurationMessage={configurationMessage}/>}
 {p.modelArticle&&!configurableArticle(p)&&<ProductArticleBody article={p.modelArticle} includeNarrative={false}/>}
 {isFamily&&!savedConfiguration&&p.gallery.length>0&&<section className="section family-gallery"><h2>{copyText("ui.ef180dfa17d2309d7d61","Gamintojo linijos galerija")}</h2><ProductGallery images={p.gallery} primary={p.image} name={p.name} backdrops={p.galleryBackdrops}/></section>}
 {line&&<p className="collection-link">{copyText("ui.77b8e5f971c31c0c81ba","Kolekcija: ")}<Link href={'/kolekcijos/'+line.slug+'/'}>{line.name}</Link></p>}
 <nav className="seo-actions" aria-label={copyText("ui.d6401517ee24ac3569b6","Produkto pasirinkimo patarimai")}>{selections.filter(s=>matchesSelection(p,s.id)).map(s=><Link key={s.id} href={s.path}>{s.name}{copyText("ui.819c19757320710c7c9e",": pasirinkimo patarimai")}</Link>)}</nav></section>
 {!isFamily&&siblings.length>0&&<section className="section container"><div className="section-heading"><h2>{copyText("ui.55b6a45948797ec72476","Kiti šios linijos modeliai")}</h2><Link className="text-link" href={productPath(parent)}>{copyText("ui.741009bb9c833ad57c3f","Visa modelių linija")}</Link></div><div className="product-grid four">{siblings.map(model=><ProductCard key={model.slug} product={model}/>)}</div></section>}
 {related.length>0&&<section className="section container"><div className="section-heading"><h2>{copyText("ui.a85bec920cea0a28ea31","Taip pat jūsų darbo erdvei")}</h2></div><div className="product-grid four">{related.map(model=><ProductCard key={model.slug} product={model}/>)}</div></section>}
 <JsonLd value={isFamily?{'@context':'https://schema.org','@type':'ItemList',name:p.name,numberOfItems:models.length,itemListElement:models.map((model,index)=>({'@type':'ListItem',position:index+1,name:model.name,url:'https://ergonomic.lt'+productPath(model)}))}:{'@context':'https://schema.org','@type':'Product',name:productHeading(p),description:p.description,...(productSchemaImages(p).length?{image:productSchemaImages(p)}:{}),sku:p.modelConfigurationId,url:'https://ergonomic.lt'+productPath(p)}}/></>;
}
