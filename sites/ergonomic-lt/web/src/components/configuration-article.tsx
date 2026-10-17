import type {ReactNode} from 'react';
import type {ResolvedConfigurationArticle} from '@/lib/configuration-article';
export function ConfigurationArticle({article,control,readOnly=false,includeIntro=true}:{article:ResolvedConfigurationArticle;control?:(field:string)=>ReactNode;readOnly?:boolean;includeIntro?:boolean}){
 return <article className="configuration-article" aria-label="Kėdės aprašymas ir komplektacija">
  {includeIntro&&<div className="configuration-article-intro">{!readOnly&&<h2>Kėdės aprašymas ir komplektacija</h2>}{article.intro.map((p,i)=><p key={i}>{p}</p>)}</div>}
  <div className="configuration-article-sections">{article.sections.map(section=><section className="configuration-article-section" key={section.id} data-section={section.id} aria-labelledby={'configuration-'+section.id}>
   <h3 id={'configuration-'+section.id}>{section.heading}</h3>
   {section.fields.length>0&&control&&<div className="configuration-grid">{section.fields.map(control)}</div>}
   <div className="configuration-article-copy">{section.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div>
   {section.rows.length>0&&(readOnly?<div className="configuration-technical"><dl>{section.rows.map((r,i)=><div key={i}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl></div>:<details className="configuration-technical"><summary>Techniniai duomenys</summary><dl>{section.rows.map((r,i)=><div key={i}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl></details>)}
  </section>)}</div>
 </article>;
}
