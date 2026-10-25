import type {Product} from '@/lib/types';
import {ProductImage} from './product-image';
import {productStudioPresentation} from '@/lib/product-studio';

type StudioProduct=Product & {publicHeading?:string};
/** Every product uses its assigned photograph; the approved Xilium room is explicitly labelled. */
export function ProductStudioIntro({product,paragraphs=product.modelArticle?.paragraphs||[]}:{product:StudioProduct;paragraphs?:string[]}){
 const {illustrated,image,heading,overview,descriptionParagraphs}=productStudioPresentation(product,paragraphs);
 const extended=descriptionParagraphs.length>1&&!overview.length;
 return <section className={'product-studio-intro'+(!overview.length?' product-studio-intro-compact':'')+(extended?' studio-intro-extended':'')} aria-labelledby="studio-product-title">
  <figure className={'studio-intro-scene'+(!illustrated?' studio-intro-product':'')}>
   {image?<ProductImage src={image} alt={illustrated?'Xilium DUO-BACK kėdė šviesiame biure – interjero vizualizacija':product.name} fill priority sizes="(max-width:800px) 100vw, 46vw"/>:<div className="studio-image-empty">Produkto nuotrauka ruošiama</div>}
   {illustrated&&<figcaption>Interjero vizualizacija</figcaption>}
  </figure>
  <div className="studio-intro-copy"><div className="studio-intro-description">
   <h1 id="studio-product-title">{heading}</h1>
   {descriptionParagraphs.slice(0,extended?1:descriptionParagraphs.length).map((text,index)=><p key={index} className={index===0?'studio-intro-lead':undefined}>{text}{descriptionParagraphs.length>1?' ':''}</p>)}
   {overview.length>0&&<div className="studio-intro-overview"><h2>{product.categorySlug==='kedes'?'Apie kėdę':'Apie produktą'}</h2>{overview.map((text,index)=><p key={index}>{text}</p>)}</div>}
  </div></div>
  {extended&&<div className="studio-intro-extended-copy">{descriptionParagraphs.slice(1).map((text,index)=><p key={index}>{text}{' '}</p>)}</div>}
 </section>;
}
