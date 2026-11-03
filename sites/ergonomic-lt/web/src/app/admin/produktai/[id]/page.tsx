import {modelProduct} from '@/lib/product-models';
import {customerContext} from '@/lib/customer-configuration-server';
import {supplierOptions} from '@/lib/configuration-labels';
import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {catalogAsync as catalog,productPath} from '@/lib/catalog';
import {ProductEditor} from '@/components/admin';
export default async function EditPage({params}:{params:Promise<{id:string}>}){if(!await isAdmin())redirect('/admin/');const {id}=await params,p=(await catalog()).products.find(p=>p.id===id);if(!p)notFound();const rows=await Promise.all(p.configurations.map(async c=>{let options=supplierOptions(c);if(c.code&&!options.length){try{const model=modelProduct(p,c),{engine,family}=await customerContext(model);if(family)options=engine.expandedSelection(model,engine.initialStateForProduct(model)).configuration.supplierOptions||[];}catch{/* The source is unavailable; never substitute codes. */}}return {c,options};}));return <section className="container admin-shell"><Link href="/admin/produktai/" className="text-link">Visos prekės</Link><h1>{p.name}</h1><p><Link href={productPath(p)}>Peržiūrėti kataloge</Link> · <a href={p.sourceUrl} target="_blank" rel="noreferrer">Tiekėjo šaltinis</a></p><section><h2>Gamintojo kodai</h2>{rows.map(({c,options})=><details key={c.id}><summary>{c.name} · {c.code||"Prekės kodo nėra"}</summary>{options.length?<ul>{options.map((option,i)=><li key={i}><code>{option}</code></li>)}</ul>:<p>Šiam pavyzdžiui nėra patikrinto opcijų kodų sąrašo.</p>}</details>)}</section><ProductEditor product={p}/></section>;}
