
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {seoFaqRows} from '@/lib/seo-faq-copy';
export function SeoFaq({path}:{path:string}){const rows=seoFaqRows(path);if(!rows.length)return null;return <section className="section container seo-faq"><h2>{copyText("ui.91f494cb3277cdd847df","Dažniausi pasirinkimo klausimai")}</h2>{rows.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>;}
