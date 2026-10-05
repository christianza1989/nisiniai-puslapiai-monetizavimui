import {readFile,writeFile} from 'node:fs/promises';
const file='C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/auksarankiams-site.tsx';let t=await readFile(file,'utf8');
const replacements=[
['<a className={s.button} href="/gidai">Išsirinkti pirmą projektą</a>','{has("gidai")&&<a className={s.button} href="/gidai">Išsirinkti pirmą projektą</a>}'],
['<a className={s.buttonLight} href="/kontaktai">Pasiūlyti temą</a>','{has("kontaktai")&&<a className={s.buttonLight} href="/kontaktai">Pasiūlyti temą</a>}'],
['<a className={s.textLink} href={nichePagePath(guides.find(g=>g.slug==="popieriaus-rankdarbiai-pradedantiesiems")||guides[0])}>Pradėti nuo turimų priemonių</a>','{guides.length>0&&<a className={s.textLink} href={nichePagePath(guides.find(g=>g.slug==="popieriaus-rankdarbiai-pradedantiesiems")||guides[0])}>Pradėti nuo turimų priemonių</a>}'],
['<a href="/privatumas">privatumo informacija</a>','{has("privatumas")?<a href="/privatumas">privatumo informacija</a>:"privatumo informacija"}']
];for(const [a,b] of replacements){if(!t.includes(a))throw Error('Target missing');t=t.replace(a,b);}await writeFile(file,t);
