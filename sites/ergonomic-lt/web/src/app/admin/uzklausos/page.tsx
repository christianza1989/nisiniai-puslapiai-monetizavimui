import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {dbAll} from '@/lib/db';
import {QuoteAdmin} from '@/components/admin';
import {catalogAsync} from '@/lib/catalog';
import {withSupplierReferences} from '@/lib/supplier-reference';
import type {QuoteRecord} from '@/lib/quotes';
export default async function AdminQuotes(){if(!await isAdmin())redirect('/admin/');const records=await dbAll<QuoteRecord>('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 200'),products=(await catalogAsync()).products;return <section className="container admin-shell"><Link href="/admin/" className="text-link">Administravimas</Link><h1>Klientų užklausos</h1><p>Rodomos 200 naujausių užklausų. Gavėjas: {process.env.QUOTE_TO||'info@ergonomic.lt'}.</p>{records.length?records.map(r=><QuoteAdmin key={r.id} record={withSupplierReferences(r,products)}/>):<div className="empty-state"><h2>Užklausų dar nėra.</h2><p>Gautos užklausos bus išsaugotos čia.</p></div>}</section>;}
