
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {CatalogPage} from '@/components/catalog-page';
import {catalogAsync as catalog} from '@/lib/catalog';
import {pageMetadata} from '@/lib/metadata';
import {catalogSeoQuery} from '@/lib/catalog-metadata';
type Props={params:Promise<{category:string}>;searchParams:Promise<Record<string,string|undefined>>};
export async function generateMetadata({params,searchParams}:Props){const {category}=await params,c=(await catalog()).categories.find(c=>c.slug===category&&!c.parentId),query=await searchParams,seo=catalogSeoQuery('/produktai/'+category+'/',query);const metadata=pageMetadata(c?.name||copyText("ui.c9dad7a4cc9c154eba1d","Produktai"),seo.canonical,copyText("ui.24a5a3193d2a6b3c9c4d","{{p0}} iš gamintojo katalogo. Modeliai, komplektacijos ir užklausa dėl pasiūlymo.",{p0:(c?.name||'Baldai')}));if(seo.noindex)metadata.robots={index:false,follow:true};return metadata;}
export default async function Page({params,searchParams}:Props){return <CatalogPage categorySlug={(await params).category} query={await searchParams}/>;}
