
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {ProductImage as Image} from '@/components/product-image';
import Link from 'next/link';
import {catalogAsync as catalog,visibleProductsAsync as visibleProducts} from '@/lib/catalog';
import {pageMetadata} from '@/lib/metadata';
export const metadata=pageMetadata(copyText("ui.4c0f1fbe3ba0895c5a4a","Produktų kolekcijos"),'/kolekcijos/',copyText("ui.a7c01366fe6083d16945","Atraskite baldų kolekcijas ir jų modelius darbo erdvėms."));
export default async function Page(){const seed=(await catalog()),products=(await visibleProducts());return <section className="section container"><div className="page-heading"><h1>{copyText("ui.4c0f1fbe3ba0895c5a4a","Produktų kolekcijos")}</h1><p>{copyText("ui.a0a58c3b7f12b0f7633d","Viena dizaino kalba. Skirtingi jūsų erdvės poreikiai.")}</p></div><div className="collection-grid">{seed.lines.filter(l=>products.some(p=>p.lineId===l.id)).map(l=><Link href={'/kolekcijos/'+l.slug+'/'} key={l.id} className="collection-card"><div>{l.image&&<Image src={l.image} alt={l.name} fill sizes="(max-width:650px) 46vw, (max-width:1000px) 30vw, (max-width:1199px) 23vw, 18vw"/>}</div><h2>{l.name}</h2></Link>)}</div></section>;}
