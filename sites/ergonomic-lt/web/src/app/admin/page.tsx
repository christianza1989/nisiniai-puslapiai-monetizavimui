import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {AdminLogin} from '@/components/admin-login';

export default async function AdminPage(){
 if(await isAdmin())redirect('/admin/tekstai/');
 return <section className="container admin-shell"><h1>Administravimas</h1><AdminLogin/></section>;
}
