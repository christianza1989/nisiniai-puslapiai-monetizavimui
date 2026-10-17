
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {notFound} from 'next/navigation';
import {catalogAsync as catalog,visibleModelsAsync as visibleProducts} from '@/lib/catalog';
import {pageMetadata} from '@/lib/metadata';
import {ProductCard} from '@/components/product-card';
type Props={params:Promise<{line:string}>};
export async function generateMetadata({params}:Props){const slug=(await params).line,line=(await catalog()).lines.find(l=>l.slug===slug);return pageMetadata(line?.name||'Kolekcija','/kolekcijos/'+slug+'/');}
export default async function Page({params}:Props){const slug=(await params).line,line=(await catalog()).lines.find(l=>l.slug===slug);if(!line)notFound();const products=(await visibleProducts()).filter(p=>p.lineId===line.id);if(!products.length)notFound();return <section className="section container"><div className="page-heading"><h1>{line.name}</h1><p>{copyText("ui.ca9fc28b417ae6b4b8a2","Kolekcijos modeliai jūsų darbo erdvei.")}</p></div><div className="product-grid four">{products.map(p=><ProductCard product={p} key={p.slug}/>)}</div></section>;}
