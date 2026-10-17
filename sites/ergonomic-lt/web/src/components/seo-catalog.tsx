import {modelCount} from '@/lib/model-count';
import {CatalogPagination} from './catalog-pagination';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {visibleModelsAsync} from '@/lib/catalog';
import {selectionForPath,modelTags} from '@/lib/seo-collections';
import {selectedCatalog,catalogPageSlice,catalogPageHref,queryValue,type CatalogQuery} from '@/lib/catalog-selection';
import {copyText} from '@/lib/editorial-copy';
import {ProductCard} from './product-card';
import {JsonLd} from './json-ld';
import {productPath} from '@/lib/catalog';
import {productHeading} from '@/lib/product-presentation';

export const fullSelectionPaths=['/ergonomines-kedes/','/ergonominiai-stalai/','/shop/balansines-kedes/','/shop/priedai/'];
export async function SeoCatalog({path,query}:{path:string;query:CatalogQuery}){
 const selection=selectionForPath(path);if(!selection)return null;
 const all=(await visibleModelsAsync()).filter(p=>modelTags(p).includes(selection.id));
 const result=selectedCatalog(all,query),page=catalogPageSlice(result,query);if(!page)notFound();
 const get=(key:string)=>queryValue(query,key);
 const desk=selection.id==='ergonominiai-stalai';
 return <section id="modeliai" className="section container seo-full-catalog" aria-labelledby="seo-catalog-heading">
  <div className="section-heading"><h2 id="seo-catalog-heading">{selection.name}</h2><p>{modelCount(result.length)}</p></div>
  {desk&&<nav className="seo-desk-types" aria-label={copyText('ui.2c3ce76515690a8b2e42','Stalų reguliavimo tipai')}>
   <Link href={path+'#modeliai'} aria-current={!get('tipas')?'page':undefined}>{copyText('ui.9e218c0a3ffc5694080e','Visi tipai')} ({all.length})</Link>
   {[['elektriniai-stalai','electric','ui.396ab4d54417ecdfcd5c','Elektriniai stalai'],['mechaniniai-stalai','manual','ui.605aa994ca6a6f1ee617','Rankiniu būdu reguliuojami stalai'],['pneumatiniai-stalai','pneumatic','ui.55cfd171ef135996ac37','Pneumatinis reguliavimas']].map(([type,tag,id,label])=><Link key={type} href={path+'?tipas='+type+'#modeliai'} aria-current={get('tipas')===type?'page':undefined}>{copyText(id,label)} ({all.filter(p=>modelTags(p).includes(tag)).length})</Link>)}
  </nav>}
  <form action={path+'#modeliai'} method="get" className="catalog-filters seo-catalog-filters">
   {get('tipas')&&<input type="hidden" name="tipas" value={get('tipas')}/>}
   <label className="field"><span>{copyText('ui.868f5aae7d3424f0afe5','Prekės paieška')}</span><input name="paieska" defaultValue={get('paieska')} maxLength={200} placeholder={copyText('ui.f6faee8817a5ff3c12fc','Ieškoti modelio')}/></label>
   <label className="field"><span>{copyText('ui.f05b18ed65561eef1137','Rikiavimas')}</span><select name="rikiuoti" defaultValue={get('rikiuoti')||'a-z'}><option value="a-z">{copyText('ui.72036e90da191281ed6e','Pavadinimas A–Z')}</option><option value="z-a">{copyText('ui.24ede3f09e458639cfa2','Pavadinimas Z–A')}</option><option value="nauji">{copyText('ui.1b1db95d4c4bb02a6af7','Nauji pirmiausia')}</option></select></label>
   <button type="submit" className="button dark">{copyText('ui.76cb7118fb635f8915ff','Rodyti')}</button>
   {(get('paieska')||get('tipas')||get('rikiuoti'))&&<Link href={path+'#modeliai'} className="text-link">{copyText('ui.a0323133fefe362e9358','Išvalyti filtrus')}</Link>}
  </form>
  {page.models.length?<div className="product-grid">{page.models.map(p=><ProductCard key={p.slug} product={p}/>)}</div>:<div className="empty-state"><p>{copyText('ui.52b2e8f54787c69ae31f','Modelių pagal šį pasirinkimą nerasta.')}</p><Link href={path+'#modeliai'}>{copyText('ui.a0323133fefe362e9358','Išvalyti filtrus')}</Link></div>}
  <CatalogPagination currentPage={page.currentPage} pageCount={page.pageCount} pageHref={n=>catalogPageHref(path,query,n)+'#modeliai'}/>
  <JsonLd value={{'@context':'https://schema.org','@type':'ItemList',name:selection.name,numberOfItems:result.length,itemListElement:page.models.map((p,i)=>({'@type':'ListItem',position:(page.currentPage-1)*20+i+1,name:productHeading(p),url:'https://ergonomic.lt'+productPath(p)}))}}/>
 </section>;
}
