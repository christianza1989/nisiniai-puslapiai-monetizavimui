
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {QuoteForm} from '@/components/quote-form';
import {pageMetadata} from '@/lib/metadata';
export const metadata={...pageMetadata(copyText("ui.98693095e997e9ecd8c4","Užklausa dėl pasiūlymo"),'/uzklausa/'),robots:{index:false,follow:true}};
export default async function Page({searchParams}:{searchParams:Promise<{tema?:string}>}){const {tema}=await searchParams;const topics:Record<string,string>={Priedai:copyText("ui.41be7433529d8914a4f8","Domina darbo vietos priedai. "),Gamyba:copyText("ui.c119fe790759a598d785","Domina kietųjų biuro baldų gamyba pagal užsakymą. Paskirtis, matmenys ir kiekis: "),STEAM:copyText("ui.eea07e9dc5bc08e14c68","Domina STEAM baldai pagal užsakymą. Erdvė, paskirtis, matmenys ir kiekis: "),Mokyklai:copyText("ui.9375e8ad287f5f53d165","Domina baldai mokymo erdvėms. Naudotojų amžius, paskirtis ir kiekis: ")};return <section className="section container"><div className="page-heading"><h1>{copyText("ui.4b3c41de7a33864a18f2","Pasirinkti baldai.")}<br/>{copyText("ui.86838ad52c1b33d8b7fc","Jūsų darbo erdvei.")}</h1><p>{copyText("ui.216f0fc49cebbe5feeec","Pateikite užklausą dėl modelių, komplektacijos ir kainos.")}</p></div><QuoteForm initialMessage={topics[tema||'']||''}/></section>;}
