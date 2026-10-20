import type {ReactNode} from 'react';
import type {ResolvedConfigurationArticle} from '@/lib/configuration-article';
import {ConfigurationArticle} from './configuration-article';

/** Uses the same resolved selection as the builder, quote and PDF. */
export function DuoProductReading({name,article,overviewAside,includeOverview=true}:{name:string;article:ResolvedConfigurationArticle;overviewAside?:ReactNode;includeOverview?:boolean}){
 return <section id="duo-product-description" className="duo-product-reading" aria-labelledby="duo-description-heading">
  {includeOverview&&<div className={'duo-model-overview'+(overviewAside?' studio-reading-overview':'')}>
   <h2 id="duo-description-heading" tabIndex={-1}>{overviewAside?'Aprašymas ir techniniai duomenys':name.includes('kėdė')?name+': aprašymas':'Apie '+name}</h2>
   <div className="duo-overview-prose">{article.intro.map((text,index)=><p key={index}>{text}</p>)}</div>{overviewAside}
  </div>}
  <div className="duo-selected-description">
   <h2 id={includeOverview?undefined:"duo-description-heading"} tabIndex={includeOverview?undefined:-1}>Pasirinktos komplektacijos aprašymas ir techniniai duomenys</h2>
   <p className="duo-selection-scope">{article.scopeNote}</p>
   <details className="duo-reading-toc"><summary>Aprašo skyriai</summary>
    <nav className="duo-spec-nav" aria-label="Techninių duomenų skyriai">{article.sections.map(section=><a key={section.id} href={'#configuration-'+section.id}>{section.heading}</a>)}</nav>
   </details>
   <ConfigurationArticle article={article} readOnly includeIntro={false}/>
  </div>
 </section>;
}
