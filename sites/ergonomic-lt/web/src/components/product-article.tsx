import type {ProductArticle} from '@/lib/types';
export function ProductArticleBody({article,includeNarrative=true}:{article:ProductArticle;includeNarrative?:boolean}){
 return <article className="product-article" aria-label="Aprašymas ir techniniai duomenys">
  {includeNarrative&&<div className="product-article-narrative">{article.paragraphs.map((text,index)=><p key={index}>{text}</p>)}</div>}
  {article.scopeNote&&<p className="product-article-scope">{article.scopeNote}</p>}
  <section aria-labelledby="techniniai-duomenys"><h2 id="techniniai-duomenys">Techniniai duomenys</h2>
   <div className="product-technical-sections">{article.technicalSections.map(section=><section className="product-technical-section" key={section.heading}><h3>{section.heading}</h3><dl>{section.rows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></section>)}</div>
  </section>
 </article>;
}
