
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {pageMetadata} from '@/lib/metadata';
export const metadata=pageMetadata(copyText("ui.8e9f4267042683306efa","Kontaktai"),'/kontaktai/',copyText("ui.f66b303967a6d04a0698","Susisiekite dėl ergonominių baldų ir pasiūlymo jūsų darbo erdvei."));
export default function Page(){return <section className="section container"><div className="page-heading"><h1>{copyText("ui.b59e7b1ea46398a971b3","Susisiekime.")}</h1><p>{copyText("ui.1049e5748a7ecae40a29","Aptarkime jūsų darbo erdvės poreikius.")}</p></div><div className="contact-layout"><div><a className="contact-large" href="mailto:info@ergonomic.lt">info@ergonomic.lt<ArrowUpRight/></a><a className="contact-large" href="tel:+37069199833">+370 691 99833<ArrowUpRight/></a></div><div><h2>UAB A-Z Prekyba</h2><p>Buivydiškių g. 22<br/>{copyText("ui.450f072078cbeb8b4e87","Vilnius, LT-07195")}</p><Link className="button dark" href="/uzklausa/">{copyText("ui.f9c495fe1eef348c6795","Pateikti užklausą")}<ArrowUpRight size={18}/></Link></div></div></section>;}
