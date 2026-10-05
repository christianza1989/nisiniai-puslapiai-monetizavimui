import fs from 'node:fs/promises';
import path from 'node:path';
const file='C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/laiptucentras-site.tsx';
let text=await fs.readFile(file,'utf8');
text=text.replace("import styles from './laiptucentras-site.module.css';","import styles from './laiptucentras-site.module.css';\nimport {LaiptucentrasQuoteCheck} from './laiptucentras-quote-check';");
const guide=`function GuideList({livePages,headingLevel=3}:{livePages:NichePage[];headingLevel?:2|3}){const Heading=headingLevel===2?'h2':'h3';return <div className={styles.guideGrid}>{livePages.filter(p=>p.type==='guide').map(p=><article key={p.id}><a className={styles.guideImage} href={nichePagePath(p)} tabIndex={-1} aria-hidden="true"><Picture page={p} asset={p.media[0]} sizes="(max-width: 700px) calc(100vw - 44px), 360px"/></a><div className={styles.guideCopy}><Heading><a href={nichePagePath(p)}>{p.title}</a></Heading><p>{p.description}</p></div><a className={styles.textLink} href={nichePagePath(p)}>Skaityti gidą <Arrow/></a></article>)}</div>;}`;
const home=`function Home(props:Props){
 const {page,livePages}=props;const images=uniqueMedia(page),sections=groups(page.body),intro=page.body.filter((b,i)=>b.type==='paragraph'&&i<2);
 const needs=sections[0]?.blocks.find(b=>b.type==='list');const quotePage=livePages.find(p=>p.slug==='laiptu-kaina');const quoteItems=quotePage?.body.find(b=>b.type==='list');
 return <>
 <section className={styles.hero} aria-labelledby="home-title"><figure className={styles.heroVisual}><Picture page={page} asset={images[0]} sizes="(max-width: 800px) 100vw, (max-width: 1600px) 54vw, 864px" priority className={styles.heroImage}/></figure><h1 id="home-title" className={styles.heroTitle}>{page.title}</h1><div className={styles.heroLead}><Blocks blocks={intro.slice(0,1)} page={page} livePages={livePages}/><div className={styles.actions}><a className={styles.button} href="/kontaktai#poreikis">Aprašyti laiptų poreikį <Arrow/></a><a className={styles.textLink} href="/gidai">Pradėti nuo gidų</a></div></div><div className={styles.pilotNotice}><Blocks blocks={intro.slice(1)} page={page} livePages={livePages}/></div></section>
 <section className={styles.needs}><h2>{sections[0]?.title}</h2><div className={styles.needItems}>{needs?.type==='list'&&needs.items.map(item=>{const [label,...rest]=item.split(' – ');return <div key={item}><h3>{label}</h3><p>{rest.join(' – ')}</p></div>;})}<a className={styles.textLink} href="/vidaus-laiptu-irengimas">Kokį poreikį galite registruoti <Arrow/></a></div></section>
 <section className={styles.material}><figure><Picture page={page} asset={images[1]} sizes="(max-width: 800px) calc(100vw - 44px), (max-width: 1400px) 40vw, 560px"/><figcaption>Konstrukcija ir pakopos apdaila yra skirtingos dalys.</figcaption></figure><div className={styles.materialCopy}><Blocks blocks={sections[1]?.blocks??[]} offset={sections[1]?.offset??0} page={page} livePages={livePages}/><a className={styles.textLink} href="/laiptu-konstrukcijos">Suprasti konstrukcijų skirtumus <Arrow/></a></div></section>
 {quoteItems?.type==='list'&&<section className={styles.quoteSection} aria-labelledby="quote-title"><div className={styles.quoteIntro}><h2 id="quote-title">Ar pasiūlymuose ta pati apimtis?</h2><p>Pirmiausia palyginkite, kas įtraukta. Tik tada – bendras sumas.</p><a className={styles.textLink} href="/laiptu-kaina">Kaip palyginti sąmatas <Arrow/></a></div><LaiptucentrasQuoteCheck items={quoteItems.items}/></section>}
 <section className={styles.prepare}><Blocks blocks={sections[2]?.blocks??[]} offset={sections[2]?.offset??0} page={page} livePages={livePages}/></section>
 <section className={styles.guides}><div className={styles.sectionTitle}><h2>Aiškesnis sprendimas, žingsnis po žingsnio.</h2><a className={styles.textLink} href="/gidai">Visi gidai <Arrow/></a></div><GuideList livePages={livePages}/></section>
 <Contact {...props} blocks={sections[3]?.blocks}/></>;
}`;
if(!text.includes('function GuideList(')||!text.includes('function Home('))throw new Error('Unexpected renderer');
text=text.replace(/function GuideList\([\s\S]*?(?=\nfunction Contact)/,guide+'\n');
text=text.replace(/function Home\([\s\S]*?(?=\nfunction Inner)/,home+'\n');
text=text.replace('<figcaption>Iliustracija – ne kliento projektas</figcaption>','');
text=text.replace('<Blocks blocks={page.body} page={page} livePages={livePages}/>{Boolean(page.externalLinks?.length)', '<Blocks blocks={page.body} page={page} livePages={livePages}/>{page.slug===\'laiptu-kaina\'&&<section className={styles.articleCheck} aria-label="Sąmatos apimties patikra"><h2>Patikrinkite dviejų pasiūlymų apimtį</h2><LaiptucentrasQuoteCheck items={page.body.flatMap(b=>b.type===\'list\'&&b.items[0]?.startsWith(\'Matavimas ir projektas:\')?b.items:[])}/></section>}{Boolean(page.externalLinks?.length)');
text=text.replace("['newsreader-400.woff2','manrope-latin-a30ddcd34970.woff2','manrope-latin-ext-3911b66d9f2e.woff2']", "['manrope-latin-a30ddcd34970.woff2','manrope-latin-ext-3911b66d9f2e.woff2']");
await fs.writeFile(file,text);
await fs.copyFile(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')),'laiptucentras-v2.css'),file.replace('.tsx','.module.css'));
console.log('Updated only laiptucentras renderer and CSS.');
