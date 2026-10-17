import Link from 'next/link';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {previewMode,visibleModelsAsync,productPath} from '@/lib/catalog';
export const dynamic='force-dynamic';
export const metadata={title:'Gemini aprašų peržiūra | Ergonomic.lt',robots:{index:false,follow:false}};
const groups=[
 {name:'Cadeira',ids:['16088247','16088246','16088241','16088242']},
 {name:'Cafe',ids:['19840262','23530295','19840263','19840265','19840266','23530297','19868169','19868167']},
 {name:'Calado',ids:['28425984','28425985','28425986','28425987','28427625','28427626','28427627','28427628']},
 {name:'Fondo',ids:['23530747','19857766','19857765']},
 {name:'Bjarg',ids:['15722415','15722414','15722419']},
 {name:'4ME',ids:['20402097']},
 {name:'Xilium DUO-BACK',ids:['23636152']},
];
export default async function DescriptionPreview(){
 const host=(await headers()).get('host')||'';
 if(!previewMode()||!(/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)||host==='ergonomic-preview.pinet-azprekyba.workers.dev'))notFound();
 const ids=groups.flatMap(g=>g.ids);
 const products=(await visibleModelsAsync()).filter(p=>ids.includes(p.modelConfigurationId||''));
 products.sort((a,b)=>ids.indexOf(a.modelConfigurationId!)-ids.indexOf(b.modelConfigurationId!));
 return <section className="container section"><div className="duo-product-reading"><h1>Gemini parengtų aprašų peržiūra</h1><p>Šiame atnaujinime – 28 Gemini parengti aprašymai, patikrinti ir redaguoti pagal konkrečių modelių techninius šaltinius. Pasirinkite modelį ir peržiūrėkite jo aprašymą bei konfigūratoriaus pasirinkimus.</p>{groups.map(g=><div key={g.name}><h2>{g.name}</h2><ol>{products.filter(p=>g.ids.includes(p.modelConfigurationId!)).map(p=><li key={p.modelConfigurationId}><p><Link className="text-link" href={productPath(p)}>{p.name} · {p.modelConfigurationId}</Link><br/>{p.description}</p></li>)}</ol></div>)}</div></section>;
}
