
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {CatalogPage} from '@/components/catalog-page';
import {pageMetadata} from '@/lib/metadata';
import {catalogSeoQuery} from '@/lib/catalog-metadata';
type Props={searchParams:Promise<Record<string,string|undefined>>};
export async function generateMetadata({searchParams}:Props){const query=await searchParams,seo=catalogSeoQuery('/produktai/',query);const metadata=pageMetadata(copyText("ui.85fe8d20301e1e641ecd","Biuro baldai – baldų katalogas"),seo.canonical,copyText("ui.3916d9602fcac6a20957","Biuro baldai darbui, susitikimams ir bendroms erdvėms. Modeliai, komplektacijos ir užklausa dėl pasiūlymo."));if(seo.noindex)metadata.robots={index:false,follow:true};return metadata;}
export default async function Page({searchParams}:Props){return <CatalogPage query={await searchParams}/>;}
