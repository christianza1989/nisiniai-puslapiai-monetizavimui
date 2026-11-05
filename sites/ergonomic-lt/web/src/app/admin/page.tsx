import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {AdminLogin} from '@/components/admin-login';

export default async function AdminPage({searchParams}:{searchParams:Promise<{produktas?:string}>}){
 if(await isAdmin()){
  const {produktas}=await searchParams;
  redirect(typeof produktas==='string'&&/^\/produktai\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(produktas)?produktas+'?redaguoti=1':'/admin/tekstai/');
 }
 return <section className="container admin-shell"><h1>Administravimas</h1><AdminLogin/></section>;
}
