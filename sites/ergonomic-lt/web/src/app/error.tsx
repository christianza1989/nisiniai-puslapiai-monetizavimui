'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="not-found container"><h1>{copyText("ui.550a02a369afd42b8d38","Nepavyko įkelti puslapio.")}</h1><p>Bandykite dar kartą arba susisiekite el. paštu info@ergonomic.lt.</p><button className="button dark" onClick={reset}>{copyText("ui.9b6dd1a2e70b58ac82ea","Bandyti dar kartą")}</button></section>;}
