import reviewedChairs from '../../../../content/reviewed-chair-preview.json';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {catalogAsync} from '@/lib/catalog';
import {dbOne} from '@/lib/db';
import {AdminActions} from '@/components/admin';
import {productModels} from '@/lib/product-models';
import {allTextEdits,buildReviewScope,inventoryModels} from '@/lib/text-review-server';
export const dynamic='force-dynamic';
const checkedChairCodes=new Set(reviewedChairs.codes);
export default async function TextReviewDashboard({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(!await isAdmin())redirect('/admin/');
 const query=await searchParams,search=(query.paieska||'').trim().toLocaleLowerCase('lt'),filter=query.busena||'all',readiness=query.paruosimas||'all',chairsOnly=query.kategorija==='kedes';
 const [{products:catalogProducts},edits,counts]=await Promise.all([
  catalogAsync(),allTextEdits(),
  dbOne<{total:number;fresh:number|null}>("SELECT COUNT(*) total,SUM(status='new') fresh FROM quotes"),
 ]);
 const inventory=inventoryModels();
 const products=productModels(chairsOnly?catalogProducts.filter(p=>p.categorySlug==='kedes'):catalogProducts).map(p=>{
  const sample=p.configurations.find(c=>c.id===p.modelConfigurationId);
  const model=sample?.code?inventory[sample.code]:undefined;
  const ready=model?.inventoryComplete===true&&model.configuratorComplete===true&&model.productId===p.id&&model.sample===sample?.id;
  const checked3D=p.categorySlug==='kedes'&&!!sample?.code&&checkedChairCodes.has(sample.code);
  return {p,ready,checked3D};
 });
 const rows=[];
 for(const {p,ready,checked3D} of products){
  if(readiness==='ready'&&!ready||readiness==='checked-3d'&&!checked3D||readiness==='preparing'&&(ready||checked3D))continue;
  if(search&&!((p.publicHeading||p.name)+' '+p.configurations.find(c=>c.id===p.modelConfigurationId)?.code).toLocaleLowerCase('lt').includes(search))continue;
  const s=await buildReviewScope(p,edits);
  if(filter==='open'&&!s.remaining||filter==='publish'&&!s.pendingPublish||filter==='reviewed'&&s.remaining)continue;
  rows.push({scope:s.publicScope.scope,title:s.title,path:s.path,done:s.done,total:s.total,remaining:s.remaining,pending:s.pendingPublish,model:s.model,ready,checked3D});
 }
 rows.sort((a,b)=>Number(b.ready)-Number(a.ready)||Number(b.checked3D)-Number(a.checked3D));
 const page=Math.max(1,Math.min(Math.ceil(rows.length/40)||1,Number(query.puslapis)||1)),shown=rows.slice((page-1)*40,page*40);
 const params=new URLSearchParams(Object.entries(query).filter((e):e is [string,string]=>e[1]!==undefined));
 const pageLink=(n:number)=>{const p=new URLSearchParams(params);p.set('puslapis',String(n));return '/admin/tekstai/?'+p;};
 return <section className="container admin-shell review-dashboard"><div className="section-heading"><h1>{chairsOnly?'Kėdžių tekstai':'Produktų tekstai'}</h1><AdminActions/></div>
 <div className="admin-stats"><Link href="/admin/produktai/"><strong>{catalogProducts.length}</strong>Modelių · {catalogProducts.filter(p=>p.published).length} paskelbta</Link><Link href="/admin/uzklausos/"><strong>{counts?.total??0}</strong>Klientų užklausos · {counts?.fresh??0} naujos</Link></div>
 <p>Tai reiškia, kad patvirtinus, pavyzdžiui, ratukų pavadinimą kelioms kėdėms, jis visose tose kėdėse bus pažymėtas kaip patikrintas. Skaitiklis rodo, kiek dabar esančių tekstų jau patikrinta. Kai atsiras naujų pasirinkimų, jų tekstai irgi bus įtraukti į skaitiklį.</p>

 <form className="inline-form">{chairsOnly&&<input type="hidden" name="kategorija" value="kedes"/>}<label className="field"><span>Paruošimas</span><select name="paruosimas" defaultValue={readiness}><option value="all">Visi modeliai</option><option value="ready">Visiškai paruošti</option><option value="checked-3d">3D patikrintos kėdės</option><option value="preparing">Dar ruošiami</option></select></label><label className="field"><span>Produktas arba modelio kodas</span><input name="paieska" defaultValue={query.paieska}/></label><label className="field"><span>Rodyti</span><select name="busena" defaultValue={filter}><option value="all">Visos tekstų būsenos</option><option value="open">Turinčius nepatikrintų tekstų</option><option value="publish">Laukiančius paskelbimo</option><option value="reviewed">Visi surinkti tekstai patikrinti</option></select></label><button className="button dark">Rodyti</button></form>
 <p>Prie 3D patikrintų kėdžių jau galima taisyti turimus tekstus. Kai bus patvirtintos visos spalvos ir pasirinkimai, būsena bus „Visiškai paruoštas“.</p>
 <p>{rows.length} produktų pagal pasirinktą filtrą</p><div className="table-scroll"><table><thead><tr><th>Produktas</th><th>Paruošimas</th><th>Patikrinta</th><th>Liko</th><th>Laukia paskelbimo</th><th>Modelio puslapis</th></tr></thead><tbody>{shown.map(r=><tr key={r.scope}><td>{r.title}<div className="review-model-note">{r.model}</div></td><td>{r.ready?'Visiškai paruoštas':r.checked3D?'3D patikrintas':'Dar ruošiamas'}</td><td className="review-dashboard-progress">{r.done} / {r.total}</td><td>{r.remaining}</td><td>{r.pending?r.pending+' paruošta paskelbti':'Nėra ką paskelbti'}</td><td><Link href={(r.ready||r.checked3D)?r.path+'?redaguoti=1':r.path}>{(r.ready||r.checked3D)?'Taisyti tekstus':'Peržiūrėti modelį'}</Link></td></tr>)}</tbody></table></div>
 {!rows.length&&<p>{readiness==='ready'&&!products.some(p=>p.ready)?'Dar nėra visiškai paruoštų modelių.':'Pagal šį filtrą modelių nerasta.'}</p>}<nav aria-label="Tekstų sąrašo puslapiai">{page>1&&<Link className="button outline" href={pageLink(page-1)}>Ankstesnis</Link>}<span> {page} / {Math.ceil(rows.length/40)||1} </span>{page*40<rows.length&&<Link className="button outline" href={pageLink(page+1)}>Kitas</Link>}</nav></section>;
}
