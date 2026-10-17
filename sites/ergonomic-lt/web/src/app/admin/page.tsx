import Link from 'next/link';
import {isAdmin} from '@/lib/auth';
import {catalogAsync as catalog,previewMode} from '@/lib/catalog';
import {dbOne} from '@/lib/db';
import {AdminLogin,AdminActions,ImportForm} from '@/components/admin';
export default async function AdminPage(){if(!await isAdmin())return <section className="container admin-shell"><h1>Administravimas</h1><AdminLogin/></section>;const products=(await catalog()).products;const counts=(await dbOne<{total:number;fresh:number}>("SELECT COUNT(*) total,SUM(status='new') fresh FROM quotes"))!;
  return <section className="container admin-shell"><div className="section-heading"><h1>Administravimas</h1><AdminActions/></div><p>{previewMode()?'Vietinėje peržiūroje rodomi visi importuoti modeliai. Produkcijoje bus rodomi tik paskelbti.':'Viešai rodomi tik paskelbti modeliai.'}</p><div className="admin-stats"><Link href="/admin/produktai/"><strong>{products.length}</strong>Modelių · {products.filter(p=>p.published).length} paskelbta</Link><Link href="/admin/uzklausos/"><strong>{counts.total}</strong>Užklausų · {counts.fresh||0} naujos</Link></div><h2>Atnaujinti tiekėjo katalogą</h2><p>Pasirinkite Python eksportuotą <code>nextjs_catalog.json</code>. Tie patys tiekėjo ID atnaujinami; jūsų tekstai, galerijos ir publikavimo sprendimai išlieka.</p><ImportForm/><p className="admin-note">Turinio failai ir užklausos saugomi šiame serveryje. Atsargines kopijas kurkite prieš kiekvieną importą.</p></section>;
}
