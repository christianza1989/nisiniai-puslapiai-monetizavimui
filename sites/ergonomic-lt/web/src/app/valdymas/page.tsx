import {isAdmin} from '@/lib/auth';
import {AdminLogin} from '@/components/admin';
import PublicationDashboard from '@/components/publication-dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'Modelių parengimas | Ergonomic.lt',robots:{index:false,follow:false}};
export default async function Page(){
 if(process.env.LAUNCH_SITE==='true')return <section className="container"><h1>Puslapis nepasiekiamas</h1></section>;
 if(!await isAdmin())return <section className="container admin-shell"><p>Ergonomic.lt · privati darbo vieta</p><h1>Modelių parengimas</h1><p>Prisijunkite esama Ergonomic.lt administratoriaus paskyra.</p><AdminLogin/></section>;
 return <PublicationDashboard/>;
}
