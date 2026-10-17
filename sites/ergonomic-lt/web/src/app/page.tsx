import ApprovedHome,{generateMetadata as draftMetadata} from '@/components/approved-home-page';
import {visibleModelsAsync} from '@/lib/catalog';
import {ProductCard} from '@/components/product-card';
export async function generateMetadata(){return process.env.LAUNCH_SITE==='true'?{title:'Biuro baldai jūsų darbo erdvei | Ergonomic.lt',description:'Atrinkti biuro baldai ir kėdės. Pasirinkite modelį ir jo komplektaciją, pateikite užklausą.',robots:{index:false,follow:false}}:draftMetadata();}
export default async function Page(){
 if(process.env.LAUNCH_SITE!=='true')return <ApprovedHome/>;
 const models=await visibleModelsAsync();
 return <section className="section container"><div className="page-heading"><p>Ergonomic.lt · biuro baldai</p><h1>Baldai patogiai darbo erdvei</h1><p>Pasirinkite modelį, susipažinkite su jo galimybėmis ir pateikite užklausą dėl jūsų darbo vietai tinkamos komplektacijos.</p></div>{models.length?<div className="product-grid">{models.map(p=><ProductCard key={p.modelConfigurationId||p.id} product={p}/>)}</div>:<div className="contact-card"><h2>Katalogą ruošiame</h2><p>Modelius įtraukiame po individualios peržiūros. Dėl baldų darbo erdvei susisiekite su mumis.</p><a className="button dark" href="/kontaktai/">Susisiekti →</a></div>}</section>;
}
