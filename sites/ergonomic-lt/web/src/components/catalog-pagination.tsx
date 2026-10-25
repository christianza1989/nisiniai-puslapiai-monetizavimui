import Link from 'next/link';
import {copyText} from '@/lib/editorial-copy';
export function CatalogPagination({currentPage,pageCount,pageHref}:{currentPage:number;pageCount:number;pageHref:(page:number)=>string}){
 if(pageCount<=1)return null;
 const label=copyText('ui.c312b239ff004364037d','Katalogo puslapiai');
 const numbers=<div className="pagination seo-pagination">{Array.from({length:pageCount},(_,i)=>i+1).map(n=><Link key={n} href={pageHref(n)} aria-current={currentPage===n?'page':undefined} aria-label={label+': '+n}>{n}</Link>)}</div>;
 return <nav className="catalog-pagination" aria-label={label}>{pageCount<=12?numbers:<><div className="pagination-overview">{currentPage>1?<Link href={pageHref(currentPage-1)}>{copyText('ui.d8193347b4936b9333a4','Ankstesnis')}</Link>:<span/>}<span>{currentPage} / {pageCount}</span>{currentPage<pageCount?<Link href={pageHref(currentPage+1)}>{copyText('ui.c08c2f026f70893138ff','Kitas')}</Link>:<span/>}</div><details><summary>{label}</summary>{numbers}</details></>}</nav>;
}
