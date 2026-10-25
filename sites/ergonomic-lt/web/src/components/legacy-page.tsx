
// editorial-copy-wired
import {copyText,copyValue} from '@/lib/editorial-copy';
import Link from 'next/link';
import type {LegacyPage as Legacy} from '@/lib/types';
import {legacyArticle,articlePresentation} from '@/lib/legacy-article';
import {JsonLd} from './json-ld';
import {SeoSelection,SeoLinks} from './seo-selection';
import {SeoBreadcrumbs} from './seo-breadcrumbs';
import {SeoFaq} from './seo-faq';
import {SeoCatalog,fullSelectionPaths} from './seo-catalog';
import type {CatalogQuery} from '@/lib/catalog-selection';
import {catalogSeoQuery} from '@/lib/catalog-metadata';
export async function LegacyPage({page,query={}}:{page:Legacy;query?:CatalogQuery}){
 const article=legacyArticle(page),presentation=articlePresentation[page.path];
 if(!presentation)return null;
 const fullCatalog=fullSelectionPaths.includes(page.path);
 const canonical=fullCatalog?catalogSeoQuery(page.path,Object.fromEntries(Object.entries(query).map(([key,value])=>[key,typeof value==='string'?value:undefined]))).canonical:page.path;
 const image={...presentation.hero,alt:copyValue(presentation.hero.alt)};
 return <div className="seo-article-page">
  <div className="container"><nav className="breadcrumbs" aria-label={copyText("ui.2a2b84d0d47890c0a040","Puslapio vieta")}><Link href="/">{copyText("ui.719328db9e74695316ff","Pradžia")}</Link><span aria-hidden="true">/</span><span>{page.h1}</span></nav></div>
  <section className="article-hero container" aria-labelledby="article-title">
   <div className="article-hero-copy"><h1 id="article-title">{page.h1}</h1><p>{presentation.intro}</p><div className="seo-actions"><Link className="button dark" href={fullCatalog?"#modeliai":presentation.catalog}>{presentation.cta}</Link><Link className="text-link" href="#straipsnis">{copyText("ui.05869922db72b7701d8e","Skaityti straipsnį")}</Link></div></div>
   <figure className="article-hero-photo"><img src={image.src} srcSet={image.srcSet} sizes="(max-width:800px) 92vw, 56vw" width={image.width} height={image.height} alt={image.alt} loading="eager" decoding="async" fetchPriority="high"/>{image.caption&&<figcaption>{image.caption}</figcaption>}</figure>
  </section>
  {fullCatalog&&<SeoCatalog path={page.path} query={query}/>}
  <div id="straipsnis" className="article-reading container">
   {article.toc.length>0&&<aside className="article-navigation"><h2>{copyText("ui.a16d40f6badd04de58b3","Šiame straipsnyje")}</h2><nav aria-label={copyText("ui.e7a655ab9550de156d2c","Straipsnio turinys")}>{article.toc.map(h=><a key={h.id} className={h.level===3?'article-subtopic':undefined} href={'#'+h.id}>{h.text}</a>)}<a href="#modeliai">{copyText("ui.19cf94221d4b2d311265","Susiję modeliai")}</a></nav><Link className="text-link" href="/uzklausa/">{copyText("ui.120bcaef264281cdc285","Padėsime pasirinkti")}</Link></aside>}
   <article className="editorial article-body" aria-label={page.h1}>
    {['/shop/priedai/','/shop/balansines-kedes/'].includes(page.path)&&<><h2>{page.path==='/shop/priedai/'?copyText("ui.399f6d2e3df6ada534b3","Priedai apgalvotai darbo vietai"):copyText("ui.4a6a81a1771bfc0c1d21","Aktyvesnė darbo diena")}</h2><p>{page.path==='/shop/priedai/'?copyText("ui.e964e3347dd04be0b365","Kataloge rasite atskirus darbo vietos panelių modelius. Laidų kanalai, ekranai ir kitos komplektavimo parinktys tikrinamos konkretaus stalo puslapyje. Renkantis priedus svarbu jų paskirtis ir suderinamumas su turimu ar pasirinktu stalu."):copyText("ui.35635ad7c3bdc36133cf","Balansinės kėdės papildo darbo vietą aktyvaus sėdėjimo galimybe. Modelių judėjimas, aukščio reguliavimas, pagrindas ir apdaila skiriasi – palyginkite konkrečias komplektacijas ir pasirinkite pagal savo darbo vietą.")}</p></>}
    {article.html.trim()&&<div dangerouslySetInnerHTML={{__html:article.html}}/>}
   </article>
  </div>
  {page.path==='/mokykliniai-baldai/'&&<section className="article-school-offer container"><div><h2>{copyText("ui.5199167379fd7c00243f","Jūsų erdvei sukurti baldai")}</h2><p>{copyText("ui.f1494388f9f102ef9c7b","Pagal užsakymą gaminame kietuosius baldus: STEAM stalus, spintas ir kitus mokymo erdvei reikalingus baldus. Matmenys ir paskirtis aptariami individualiai.")}</p></div><div className="seo-actions"><Link className="button dark" href="/steam-baldai/">{copyText("ui.b590deaa13522891e6f3","STEAM baldai pagal užsakymą")}</Link><Link className="text-link" href="/uzklausa/?tema=Mokyklai">{copyText("ui.1e30ebabed55307f688c","Aptarti mokymo erdvę")}</Link></div></section>}
  {!fullCatalog&&<div id="modeliai" className="article-products"><SeoSelection path={page.path}/></div>}
  <div className="article-tail"><SeoFaq path={page.path}/><SeoLinks path={page.path}/></div>
  <section className="inquiry-band"><div className="container"><h2>{copyText("ui.089f9ec982965bd29b03","Pasikalbėkime apie jūsų darbo vietą.")}</h2><Link className="button light" href="/uzklausa/">{copyText("ui.bf376830ccbc217da39d","Gauti pasiūlymą")}</Link></div></section>
  <JsonLd value={{'@context':'https://schema.org','@type':'WebPage',name:page.title,url:'https://ergonomic.lt'+canonical,inLanguage:'lt-LT'}}/>
  <SeoBreadcrumbs items={[{name:copyText("ui.719328db9e74695316ff","Pradžia"),path:'/'},{name:page.h1,path:page.path}]}/>
 </div>;
}
