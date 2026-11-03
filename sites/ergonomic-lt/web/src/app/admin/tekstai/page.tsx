import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {catalogAsync} from '@/lib/catalog';
import {productModels} from '@/lib/product-models';
import {allTextEdits,buildReviewScope} from '@/lib/text-review-server';
export const dynamic='force-dynamic';
export default async function TextReviewDashboard({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(!await isAdmin())redirect('/admin/');
 const query=await searchParams,search=(query.paieska||'').trim().toLocaleLowerCase('lt'),filter=query.busena||'all';
 const products=productModels((await catalogAsync()).products),edits=await allTextEdits();
 const rows=[];
 for(const p of products){
  if(search&&!((p.publicHeading||p.name)+' '+p.configurations.find(c=>c.id===p.modelConfigurationId)?.code).toLocaleLowerCase('lt').includes(search))continue;
  const s=await buildReviewScope(p,edits);
  if(filter==='open'&&!s.remaining||filter==='publish'&&!s.pendingPublish||filter==='reviewed'&&s.remaining)continue;
  rows.push({scope:s.publicScope.scope,title:s.title,path:s.path,done:s.done,total:s.total,remaining:s.remaining,pending:s.pendingPublish,model:s.model,complete:s.complete});
 }
 const page=Math.max(1,Math.min(Math.ceil(rows.length/40)||1,Number(query.puslapis)||1)),shown=rows.slice((page-1)*40,page*40);
 const params=new URLSearchParams(Object.entries(query).filter((e):e is [string,string]=>e[1]!==undefined));
 const pageLink=(n:number)=>{const p=new URLSearchParams(params);p.set('puslapis',String(n));return '/admin/tekstai/?'+p;};
 return <section className="container admin-shell review-dashboard"><Link href="/admin/">Administravimas</Link><h1>Produktų tekstai</h1><p>Bendro termino patvirtinimas atnaujina visų susietų produktų pažangą. Skaitiklis apima dabar surinktus tekstus; naujos opcijos bus pridėtos atskirai.</p>
 <form className="inline-form"><label className="field"><span>Produktas arba modelio kodas</span><input name="paieska" defaultValue={query.paieska}/></label><label className="field"><span>Rodyti</span><select name="busena" defaultValue={filter}><option value="all">Visus produktus</option><option value="open">Turinčius nepatikrintų tekstų</option><option value="publish">Laukiančius paskelbimo</option><option value="reviewed">Visi surinkti tekstai patikrinti</option></select></label><button className="button dark">Rodyti</button></form>
 <p>{rows.length} produktų pagal pasirinktą filtrą</p><div className="table-scroll"><table><thead><tr><th>Produktas</th><th>Patikrinta</th><th>Liko</th><th>Publikavimas</th><th>Inventorius</th><th>Veiksmas</th></tr></thead><tbody>{shown.map(r=><tr key={r.scope}><td>{r.title}<div className="review-model-note">{r.model}</div></td><td className="review-dashboard-progress">{r.done} / {r.total}</td><td>{r.remaining}</td><td>{r.pending?r.pending+' patvirtinti tekstai laukia paskelbimo':'Nėra laukiančių pakeitimų'}</td><td>{r.complete?'Baigtas':'Dar pildomas'}</td><td><Link href={r.path+'?redaguoti=1'}>Tikrinti puslapyje</Link></td></tr>)}</tbody></table></div>
 {!rows.length&&<p>Pagal šį filtrą produktų nerasta.</p>}<nav aria-label="Tekstų sąrašo puslapiai">{page>1&&<Link className="button outline" href={pageLink(page-1)}>Ankstesnis</Link>}<span> {page} / {Math.ceil(rows.length/40)||1} </span>{page*40<rows.length&&<Link className="button outline" href={pageLink(page+1)}>Kitas</Link>}</nav></section>;
}
