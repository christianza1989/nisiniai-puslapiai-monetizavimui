
// editorial-copy-wired
import {copyText,copyValue} from '@/lib/editorial-copy';
import {ProductImage as Image} from './product-image';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {productKind,productHeading,displayModelName,capitalize} from '@/lib/product-presentation';
import {selectedModelConfiguration} from '@/lib/product-models';
import type {Product} from '@/lib/types';
import {productPath,categoryForAsync as categoryFor} from '@/lib/catalog';
export async function ProductCard({product:p}:{product:Product}){const model=selectedModelConfiguration(p),kind=productKind(p),heading=productHeading(p);return <article className="product-card"><Link href={productPath(p)} className="product-card-image">{p.image?<Image src={p.image} alt={heading} fill sizes="(max-width: 650px) 46vw, (max-width: 1000px) 30vw, (max-width: 1199px) 23vw, 18vw"/>:<span>{copyText("ui.ddf0276f6a4d93b9f213","Nuotrauka ruošiama")}</span>}{p.isNew&&<span className="new-label">{copyText("ui.504c4d646abfb0d2f03b","Nauja")}</span>}</Link><div className="product-card-info"><h3><Link href={productPath(p)}>{displayModelName(p)}<ArrowUpRight size={19}/></Link></h3><p className="product-card-type">{kind?<Link href={kind.path}>{capitalize(kind.label)}</Link>:(await categoryFor(p)).name}</p>{model?.code&&<p className="product-card-code">{model.code}</p>}{model?.details?.find(d=>d.label.includes('Plastiko spalvos'))&&<p>{copyValue(model.details.find(d=>d.label.includes('Plastiko spalvos'))!.value)}</p>}<p>{copyText("ui.78d2499daa5e8623867e","Kaina pagal užklausą")}</p></div></article>;}
