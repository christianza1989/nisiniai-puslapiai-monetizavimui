import {readFile,writeFile,copyFile,cp} from 'node:fs/promises';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting',stem='/components/niche/laiptucentras-site';
let css=await readFile(core+stem+'.module.css','utf8');css=css.replace('newsreader-0.woff2','newsreader-400.woff2').replace('newsreader-1.woff2','newsreader-500.woff2').replaceAll("format('truetype')","format('woff2')");await writeFile(core+stem+'.module.css',css);
let code=await readFile(core+stem+'.tsx','utf8');const from='<div className={styles.shell}><InterestTracking/>';
if(!code.includes(from))throw Error('Expected scoped renderer root');
code=code.replace(from,`<div className={styles.shell}>{['newsreader-400.woff2','manrope-latin-a30ddcd34970.woff2','manrope-latin-ext-3911b66d9f2e.woff2'].map(font=><link key={font} rel="preload" href={'/fonts/laiptucentras/'+font} as="font" type="font/woff2" crossOrigin="anonymous"/>)}<InterestTracking/>`);
await writeFile(core+stem+'.tsx',code);
for(const ext of ['.tsx','.module.css'])await copyFile(core+stem+ext,core+'/output/laiptucentras-production'+stem+ext);
await cp(core+'/public/fonts/laiptucentras',core+'/output/laiptucentras-production/public/fonts/laiptucentras',{recursive:true});
// The concurrent niche has added its missing schema since our isolated snapshot.
// Refresh only this snapshot; no other domain's source or running build is edited.
for(const ext of ['.tsx','.module.css'])await copyFile(core+'/components/niche/auksarankiams-site'+ext,core+'/output/laiptucentras-production/components/niche/auksarankiams-site'+ext);
console.log('Scoped font compression/preloads and current concurrent renderer snapshot copied.');
