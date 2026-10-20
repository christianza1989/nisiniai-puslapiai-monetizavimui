import {modelCount} from '@/lib/model-count';
import {CatalogPagination} from './catalog-pagination';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {Search,ArrowRight,ArrowLeft,X} from 'lucide-react';
import {catalogAsync as catalog,visibleModelsAsync as visibleProducts} from '@/lib/catalog';
import {ProductCard} from './product-card';
import {notFound} from 'next/navigation';
import {BreadcrumbTrail} from './breadcrumb-trail';
import {selections,isSelection,matchesSelection,matchesSearch,typeMatches,searchSelection} from '@/lib/seo-collections';
type SearchParams=Record<string,string|string[]|undefined>;
export async function CatalogPage({categorySlug,query}:{categorySlug?:string;query:SearchParams}){
  const seed=(await catalog()),parent=categorySlug?seed.categories.find(c=>c.slug===categorySlug&&!c.parentId):null;if(categorySlug&&!parent)notFound();
  const get=(key:string)=>typeof query[key]==='string'?query[key] as string:'';
  const defaultSort=categorySlug?'a-z':'ergonomines-kedes';
  const search=get('paieska'),sub=get('tipas'),line=get('seima'),selection=get('atranka'),sort=get('rikiuoti')||defaultSort;
  if(selection&&!isSelection(selection))notFound();
  const rawPage=get('puslapis')||'1';if(!/^\d+$/.test(rawPage))notFound();const currentPage=Number(rawPage);if(currentPage<1)notFound();
  const all=(await visibleProducts());let result=all.filter(p=>(!parent||p.categoryId===parent.id)&&(!selection||matchesSelection(p,selection))&&(!search||matchesSearch(p,search,seed.categories.find(c=>c.id===p.subcategoryId)?.name))&&typeMatches(p,sub)&&(!line||p.lineId===line));
  result=result.sort((a,b)=>{
    if(sort==='ergonomines-kedes'){
      const priority=Number(matchesSelection(b,'ergonomines-kedes'))-Number(matchesSelection(a,'ergonomines-kedes'));
      if(priority)return priority;
    }
    return sort==='z-a'?b.name.localeCompare(a.name,'lt'):sort==='nauji'?Number(b.isNew)-Number(a.isNew)||a.name.localeCompare(b.name,'lt'):a.name.localeCompare(b.name,'lt');
  });
  const pageSize=20,pageCount=Math.max(1,Math.ceil(result.length/pageSize));if(currentPage>pageCount)notFound();const page=result.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const base=parent?'/produktai/'+parent.slug+'/':'/produktai/';
  const pageHref=(n:number)=>{const params=new URLSearchParams();for(const [key,value]of Object.entries(query))if(typeof value==='string'&&key!=='puslapis'&&key!=='zenklas'&&value)params.set(key,value);if(n>1)params.set('puslapis',String(n));return base+(params.size?'?'+params:'');};
  const subs=seed.categories.filter(c=>c.parentId&&(!parent||c.parentId===parent.id));
  const families=seed.lines.filter(l=>all.some(p=>p.lineId===l.id&&(!parent||p.categoryId===parent.id))).sort((a,b)=>a.name.localeCompare(b.name));
  const sidebarSelections=selections.filter(s=>s.id!=='biuro-kedes').sort((a,b)=>Number(b.id==='ergonomines-kedes')-Number(a.id==='ergonomines-kedes'));
  const ergonomicSelection=selections.find(s=>s.id==='ergonomines-kedes')!;
  const active=!!(search||sub||line||selection||sort!==defaultSort);
  const chosen=selections.find(s=>s.id===(selection||searchSelection(search))),title=chosen?.name||parent?.name||copyText("ui.1e54fd1867276164f3be","Baldų katalogas");
  return <section className="catalog-section container"><BreadcrumbTrail items={[{name:copyText("ui.719328db9e74695316ff","Pradžia"),path:"/"},{name:copyText("ui.1e54fd1867276164f3be","Baldų katalogas"),path:"/produktai/"},...(parent?[{name:parent.name,path:base}]:[])]}/><div className="catalog-heading"><h1>{title}</h1><p>{modelCount(result.length)}</p>{chosen&&<p>{chosen.description} <Link className="text-link" href={chosen.path}>{copyText("ui.4f30d7c792826d38cc99","Kaip išsirinkti?")}</Link></p>}</div><div className="catalog-layout"><aside className="catalog-categories"><h2>{copyText("ui.05be5556b2ef26acf680","Kategorijos")}</h2><nav className="catalog-selections" aria-label={copyText("ui.875fa70bcfdfde43390b","Teminės baldų kategorijos")}>{sidebarSelections.map(s=><Link key={s.id} href={s.path} className={selection===s.id?'active':''}>{s.name}<span>{all.filter(p=>matchesSelection(p,s.id)).length}</span></Link>)}</nav><h2>{copyText("ui.3df3c3c184c95e8eb876","Visas asortimentas")}</h2><nav aria-label={copyText("ui.f2ecd0a8319310faf5cc","Produktų kategorijos")}><Link href="/produktai/" className={!parent?'active':''}>{copyText("ui.963c336d28898a6cc06b","Visi produktai")}<span>{all.length}</span></Link>{seed.categories.filter(c=>!c.parentId).map(c=><Link key={c.id} href={'/produktai/'+c.slug+'/'} className={c.id===parent?.id?'active':''}>{c.name}<span>{all.filter(p=>p.categoryId===c.id).length}</span></Link>)}</nav></aside><div className="catalog-results"><form method="get" action={base} className="catalog-filters">{selection&&<input type="hidden" name="atranka" value={selection}/>}<label className="search-field"><span className="sr-only">{copyText("ui.868f5aae7d3424f0afe5","Prekės paieška")}</span><Search size={19}/><input name="paieska" placeholder={copyText("ui.f6faee8817a5ff3c12fc","Ieškoti modelio")} defaultValue={search}/></label><label className="field"><span className="sr-only">{copyText("ui.5aca2efe9462ccdf51ae","Baldų tipas")}</span><select name="tipas" defaultValue={sub}><option value="">{copyText("ui.9e218c0a3ffc5694080e","Visi tipai")}</option>{subs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{(!parent||parent.id==='www_desks')&&<><option value="elektriniai-stalai">{copyText("ui.396ab4d54417ecdfcd5c","Elektriniai stalai")}</option><option value="mechaniniai-stalai">{copyText("ui.605aa994ca6a6f1ee617","Rankiniu būdu reguliuojami stalai")}</option></>}</select></label><label className="field"><span className="sr-only">{copyText("ui.77c40f8eb20ca27a5377","Produktų šeima")}</span><select name="seima" defaultValue={line}><option value="">{copyText("ui.a1bcccfead1dd43b57fd","Visos šeimos")}</option>{families.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label className="field"><span className="sr-only">{copyText("ui.f05b18ed65561eef1137","Rikiavimas")}</span><select name="rikiuoti" defaultValue={sort}><option value="ergonomines-kedes">{ergonomicSelection.name}</option><option value="a-z">{copyText("ui.72036e90da191281ed6e","Pavadinimas A–Z")}</option><option value="z-a">{copyText("ui.24ede3f09e458639cfa2","Pavadinimas Z–A")}</option><option value="nauji">{copyText("ui.1b1db95d4c4bb02a6af7","Nauji pirmiausia")}</option></select></label><button className="button dark" type="submit">{copyText("ui.76cb7118fb635f8915ff","Rodyti")}<Search size={17}/></button></form>{active&&<div className="filter-summary"><p>{copyText("ui.94bf6f5621210ceaadce","Pagal pasirinktus filtrus: ")}{result.length}</p><Link href={base}><X size={15}/> {copyText("ui.a0323133fefe362e9358","Išvalyti filtrus")}</Link></div>}
    {page.length?<div className="product-grid">{page.map(p=><ProductCard key={p.slug} product={p}/>)}</div>:<div className="empty-state"><h2>{copyText("ui.52b2e8f54787c69ae31f","Modelių pagal šį pasirinkimą nerasta.")}</h2><p>{copyText("ui.f0704d9278057073e365","Pakeiskite filtrus arba parašykite, kokių baldų ieškote.")}</p><Link href="/uzklausa/" className="button outline">{copyText("ui.f9c495fe1eef348c6795","Pateikti užklausą")}<ArrowRight size={18}/></Link></div>}
    <CatalogPagination currentPage={currentPage} pageCount={pageCount} pageHref={pageHref}/></div></div></section>;
}
