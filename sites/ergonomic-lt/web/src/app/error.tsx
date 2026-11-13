'use client';

// editorial-copy-wired
import {usePublicContactEmail} from '@/components/public-contact-provider';
import {copyText} from '@/lib/editorial-copy';
export default function ErrorPage({reset}:{reset:()=>void}){const contactEmail=usePublicContactEmail();return <section className="not-found container"><h1>{copyText("ui.550a02a369afd42b8d38","Nepavyko įkelti puslapio.")}</h1><p>Bandykite dar kartą arba susisiekite el. paštu <a href={'mailto:'+contactEmail}>{contactEmail}</a>.</p><button className="button dark" onClick={reset}>{copyText("ui.9b6dd1a2e70b58ac82ea","Bandyti dar kartą")}</button></section>;}
