import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {catalogAsync as catalog,productPath} from '@/lib/catalog';
import {ProductEditor} from '@/components/admin';
export default async function EditPage({params}:{params:Promise<{id:string}>}){if(!await isAdmin())redirect('/admin/');const {id}=await params,p=(await catalog()).products.find(p=>p.id===id);if(!p)notFound();return <section className="container admin-shell"><Link href="/admin/produktai/" className="text-link">Visos prekės</Link><h1>{p.name}</h1><p><Link href={productPath(p)}>Peržiūrėti kataloge</Link> · <a href={p.sourceUrl} target="_blank" rel="noreferrer">Tiekėjo šaltinis</a></p><ProductEditor product={p}/></section>;}
