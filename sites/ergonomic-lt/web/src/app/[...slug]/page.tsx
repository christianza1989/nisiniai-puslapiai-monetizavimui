
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {notFound} from 'next/navigation';
import {findLegacy} from '@/lib/catalog';
import {legacyMetadata} from '@/lib/metadata';
import {fullSelectionPaths} from '@/components/seo-catalog';
import {catalogSeoQuery} from '@/lib/catalog-metadata';
import type {CatalogQuery} from '@/lib/catalog-selection';
import {LegacyPage} from '@/components/legacy-page';
type Props={params:Promise<{slug:string[]}>;searchParams:Promise<CatalogQuery>};
export async function generateMetadata({params,searchParams}:Props){
 const path='/'+(await params).slug.join('/')+'/',page=findLegacy(path);
 if(!page)return {title:copyText('ui.9d102cedd80c56da6c37','Puslapis nerastas'),robots:{index:false,follow:false}};
 const meta=legacyMetadata(page);if(!fullSelectionPaths.includes(path))return meta;
 const raw=await searchParams,query=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,typeof v==='string'?v:undefined]));
 const policy=catalogSeoQuery(path,query);
 return {...meta,alternates:{canonical:'https://ergonomic.lt'+policy.canonical},openGraph:{...meta.openGraph,url:'https://ergonomic.lt'+policy.canonical},robots:policy.noindex?{index:false,follow:true}:meta.robots};
}
export default async function Page({params,searchParams}:Props){const {slug}=await params;const page=findLegacy('/'+slug.join('/')+'/');if(!page)notFound();return <LegacyPage page={page} query={await searchParams}/>;}
