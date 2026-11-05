import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/auth';
import {catalogOptionExplanations} from '@/lib/option-explanations';
import {allTextEdits} from '@/lib/text-review-server';
import {displayedReviewText} from '@/lib/text-review-state';
export const dynamic='force-dynamic';
export default async function Explanations({searchParams}:{searchParams:Promise<{q?:string;group?:string}>}){
 if(!await isAdmin())redirect('/admin/');
 const params=await searchParams,q=(params.q||'').toLocaleLowerCase('lt'),edits=await allTextEdits(),all=catalogOptionExplanations();
 const rows=all.filter(r=>(!params.group||r.group===params.group)&&(!q||(r.definition.context+' '+r.definition.english+' '+r.definition.suggested+' '+r.models.map(m=>m.name+' '+m.code).join(' ')).toLocaleLowerCase('lt').includes(q)));
 return <main className="container admin-page"><p><Link href="/admin/tekstai/">← Grįžti į produktų sąrašą</Link></p><h1>Pasirinkimų paaiškinimai</h1><p>{all.length} paaiškinimų. Jie rodomi bandomojoje svetainėje po pasirinktu variantu. Taisyti galima produkto puslapyje paspaudus paaiškinimą.</p>
 <form className="admin-filters"><label className="field">Rasti paaiškinimą<input name="q" defaultValue={params.q} placeholder="Pavadinimas, kodas arba produkto linija"/></label><label className="field">Produktai<select name="group" defaultValue={params.group||''}><option value="">Kėdės ir stalai</option><option value="chairs">Kėdės</option><option value="desks">Stalai</option></select></label><button className="button dark">Rasti</button></form><p>Rodoma: {rows.length}.</p>
 <div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>Pasirinkimas</th><th>Paaiškinimas lietuviškai</th><th>Produktai</th><th>Gamintojo šaltinis</th></tr></thead><tbody>{rows.map(({definition:d,models,group})=><tr key={d.id}><td>{group==='desks'?'Stalai':'Kėdės'}<br/><strong>{d.sourceCode}</strong><br/><span lang="en">{d.english}</span></td><td>{displayedReviewText(d,edits.get(d.id),d.suggested)}</td><td><Link href={models[0].path+'?redaguoti=1'}>{models[0].name}</Link><br/>{models.length} modelių</td><td><a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">Gamintojo duomenys</a></td></tr>)}</tbody></table></div></main>;
}
