import type {TechnicalRow} from '@/lib/types';
import {productSpecificationSections} from '@/lib/product-specifications';
export function ProductSelectedReading({rows,scope,configured=true}:{rows:TechnicalRow[];scope?:string;configured?:boolean}){
 if(!rows.length&&!scope)return null;
 const sections=productSpecificationSections(rows);
 return <section id="duo-product-description" className="duo-product-reading product-selected-reading" aria-labelledby="duo-description-heading">
  <div className="duo-selected-description">
   <h2 id="duo-description-heading" tabIndex={-1}>{configured?'Pasirinktos komplektacijos techniniai duomenys':'Produkto techniniai duomenys'}</h2>
   {scope&&<p className="duo-selection-scope">{scope}</p>}
   {sections.length>1&&<details className="duo-reading-toc"><summary>Duomenų skyriai</summary><nav className="duo-spec-nav" aria-label="Techninių duomenų skyriai">{sections.map(s=><a key={s.id} href={'#configuration-'+s.id}>{s.heading}</a>)}</nav></details>}
   <div className="configuration-article-sections">{sections.map(s=><section className="configuration-article-section studio-specification-section" key={s.id} aria-labelledby={'configuration-'+s.id}>
    <h3 id={'configuration-'+s.id}>{s.heading}</h3>
    <div className="configuration-technical"><dl>{s.rows.map((r,i)=><div key={i}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl></div>
   </section>)}</div>
  </div>
 </section>;
}
