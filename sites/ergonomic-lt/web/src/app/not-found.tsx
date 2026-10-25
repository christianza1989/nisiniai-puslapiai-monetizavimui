
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
export default function NotFound(){return <section className="not-found container"><h1>{copyText("ui.7a61a6f14a4f0815e98e","Puslapis nerastas.")}</h1><p>{copyText("ui.4d8e440a2a0453664aa3","Šis adresas nepasiekiamas. Atraskite naują baldų katalogą arba susisiekite dėl pasiūlymo.")}</p><div><Link className="button dark" href="/produktai/">{copyText("ui.77c9cb60f7af33964d46","Atidaryti katalogą")}</Link><Link className="button outline" href="/kontaktai/">{copyText("ui.8e9f4267042683306efa","Kontaktai")}</Link></div></section>;}
