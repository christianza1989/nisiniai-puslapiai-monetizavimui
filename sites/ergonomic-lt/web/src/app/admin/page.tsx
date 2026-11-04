import Link from 'next/link';
import {isAdmin} from '@/lib/auth';
import {catalogAsync as catalog} from '@/lib/catalog';
import {dbOne} from '@/lib/db';
import {AdminLogin} from '@/components/admin-login';
import {AdminActions} from '@/components/admin';
export default async function AdminPage(){if(!await isAdmin())return <section className="container admin-shell"><h1>Administravimas</h1><AdminLogin/></section>;const products=(await catalog()).products;const counts=(await dbOne<{total:number;fresh:number}>("SELECT COUNT(*) total,SUM(status='new') fresh FROM quotes"))!;
  return <section className="container admin-shell"><div className="section-heading"><h1>Administravimas</h1><AdminActions/></div><p><Link className="button dark" href="/admin/tekstai/">Tikrinti tekstus puslapiuose</Link></p><div className="admin-stats"><Link href="/admin/produktai/"><strong>{products.length}</strong>Modelių · {products.filter(p=>p.published).length} paskelbta</Link><Link href="/admin/uzklausos/"><strong>{counts.total}</strong>Klientų užklausos · {counts.fresh||0} naujos</Link></div></section>;
}
