
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {findLegacy} from '@/lib/catalog';
import {pageMetadata} from '@/lib/metadata';
import {ArrowUpRight} from 'lucide-react';
export const metadata=pageMetadata(copyText("ui.c55d53bcf1df3a653399","Ergonomikos gidai"),'/gidai/',copyText("ui.423be1d0e1795a4b54da","Darbo vietos, kėdžių, stalų ir aktyvaus sėdėjimo gidai."));
const paths=['/biuro-kedes/','/ergonominiai-stalai/','/ergonomines-kedes/','/ergonomika-darbo-vietoje-reikalavimai/','/aktyvus-sedejimas/','/shop/balansines-kedes/','/mokykliniai-baldai/','/shop/priedai/'];
export default function Guides(){return <section className="container section">
  <div className="breadcrumbs"><Link href="/">{copyText("ui.719328db9e74695316ff","Pradžia")}</Link><span>/</span><span>{copyText("ui.26f5e37998e07df2770f","Gidai")}</span></div>
  <div className="page-intro"><h1>{copyText("ui.c55d53bcf1df3a653399","Ergonomikos gidai")}</h1><p>{copyText("ui.6b9fb5f95cfa56da1ab6","Darbo vietos pasirinkimo ir ergonomikos informacija.")}</p></div>
  <nav className="guides-index" aria-label={copyText("ui.c55d53bcf1df3a653399","Ergonomikos gidai")}>{paths.map(path=>{const guide=findLegacy(path)!;return <Link className="guides-index-item" href={path} key={path}><h2>{guide.h1}</h2>{guide.description&&<p>{guide.description}</p>}<ArrowUpRight size={20}/></Link>;})}</nav>
</section>;}
