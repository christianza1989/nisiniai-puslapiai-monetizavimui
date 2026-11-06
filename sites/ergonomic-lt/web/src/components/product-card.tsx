import {customerProductImage} from '@/lib/customer-image-server';
import {customerColourLabel} from '@/lib/customer-names';
import {originalSelectedColourCaption} from '@/lib/original-colour-names';
import {supplierOptions} from '@/lib/configuration-labels';
import {customerProductCodes} from '@/lib/customer-product-presentation';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {ProductImage as Image} from './product-image';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {productKind,productHeading,displayModelName,capitalize} from '@/lib/product-presentation';
import {selectedModelConfiguration} from '@/lib/product-models';
import type {Product} from '@/lib/types';
import {productPath,categoryForAsync as categoryFor} from '@/lib/catalog';
export async function ProductCard({product:p}:{product:Product}){const model=selectedModelConfiguration(p),kind=productKind(p),heading=productHeading(p),photo=p.customerHeading?await customerProductImage(p):p.image;const colour=model?.details?.find(d=>d.label.includes('Plastiko spalvos')),selected=Object.fromEntries((model?supplierOptions(model):[]).flatMap(option=>{const i=option.indexOf('=');return i<0?[]:[[option.slice(0,i).split('.').at(-1)!,option.slice(i+1)]];})),colourName=colour&&model?.code?originalSelectedColourCaption(model.code,selected,colour.label)||colour.value:colour?.value;return <article className="product-card"><Link href={productPath(p)} className="product-card-image">{photo?p.customerHeading?<img src={photo} alt={heading} loading="lazy" decoding="async" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}}/>:<Image src={photo} alt={heading} fill sizes="(max-width: 650px) 46vw, (max-width: 1000px) 30vw, (max-width: 1199px) 23vw, 18vw"/>:<span>{copyText("ui.ddf0276f6a4d93b9f213","Nuotrauka ruošiama")}</span>}{p.isNew&&<span className="new-label">{copyText("ui.504c4d646abfb0d2f03b","Nauja")}</span>}</Link><div className="product-card-info"><h3><Link href={productPath(p)}>{p.customerHeading||p.textReviewHeading||displayModelName(p)}<ArrowUpRight size={19}/></Link></h3><p className="product-card-type">{kind?<Link href={kind.path}>{capitalize(kind.label)}</Link>:(await categoryFor(p)).name}</p>{!p.customerHeading&&model?.code&&<p className="product-card-code">{model.code}</p>}{model?.details?.find(d=>d.label.includes('Plastiko spalvos'))&&<p>{p.customerHeading?customerColourLabel(colourName,customerProductCodes(p),''):colourName}</p>}<p>{copyText("ui.78d2499daa5e8623867e","Kaina pagal užklausą")}</p></div></article>;}
