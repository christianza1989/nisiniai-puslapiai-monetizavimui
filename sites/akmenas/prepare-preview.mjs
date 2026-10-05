import {mkdir,readFile,writeFile,copyFile,readdir,stat,symlink} from 'node:fs/promises';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'../..'),core='C:/Users/lenovo/Documents/dovanos-memorycasting',fonts=path.join(core,'public/fonts/akmenas');
await mkdir(fonts,{recursive:true});
const fontCss='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&display=swap';
const resp=await fetch(fontCss,{headers:{'user-agent':'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36'}});if(!resp.ok)throw new Error('Font CSS '+resp.status);
let css=await resp.text();const fontSources=[];
for(const url of new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)||[])){
 const filename='fraunces-'+fontSources.length+'.woff2';const r=await fetch(url);if(!r.ok)throw new Error('Font '+r.status);await writeFile(path.join(fonts,filename),new Uint8Array(await r.arrayBuffer()));fontSources.push({url,file:filename});css=css.split(url).join('/fonts/akmenas/'+filename);
}
for(const f of ['manrope-latin-a30ddcd34970.woff2','manrope-latin-ext-3911b66d9f2e.woff2','manrope-OFL.txt'])await copyFile(path.join(core,'public/fonts/traktoriupadangos',f),path.join(fonts,f));
const oldCss=await readFile(path.join(core,'public/fonts/traktoriupadangos/fonts.css'),'utf8');
const manrope=(oldCss.match(/@font-face\s*\{[^}]*font-family:[^}]*Manrope[^}]*\}/g)||[]).join('\n').replaceAll('/fonts/traktoriupadangos/','/fonts/akmenas/');
await writeFile(path.join(fonts,'fonts.css'),css+'\n'+manrope);
const license=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt');if(!license.ok)throw new Error('OFL');await writeFile(path.join(fonts,'fraunces-OFL.txt'),await license.text());
await writeFile(path.join(fonts,'provenance.json'),JSON.stringify({retrievedAt:new Date().toISOString(),sourceCss:fontCss,fontSources,bodyFont:'Existing licensed Manrope from Google Fonts; OFL retained',license:'SIL Open Font License 1.1'},null,2));
const studies=path.join(import.meta.dirname,'studies');await mkdir(studies,{recursive:true});
await copyFile(path.join(import.meta.dirname,'media/hero.png'),path.join(studies,'hero.png'));
await copyFile(path.join(import.meta.dirname,'media/materials.png'),path.join(studies,'materials.png'));
const common=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f5f1e9;color:#28241f;font:18px/1.6 Arial,sans-serif}header{display:flex;justify-content:space-between;padding:24px 5%;border-bottom:1px solid #b5a99b}a{color:#87472f}h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.05}h1{font-size:clamp(44px,6vw,84px);max-width:950px}main{padding:40px 5%}img{width:100%;object-fit:cover}a.cta{display:inline-block;background:#87472f;color:white;padding:12px 24px;text-decoration:none}.split{display:grid;grid-template-columns:1fr 1fr;gap:40px}.hero{height:440px}.board{display:grid;grid-template-columns:1fr 1.2fr;gap:50px}p{max-width:65ch}@media(max-width:700px){.split,.board{display:block}.hero{height:240px}h1{font-size:48px}}</style><header><strong>akmenas.lt</strong><a href="#gidai">Pasirinkimo gidai</a></header>`;
const copy='<h1>Akmuo virtuvei.<br>Aiškumas pasirinkimui.</h1><p>Raštas patraukia akį. Pasirinkimą palengvina tai, ką žinote apie medžiagą ir savo virtuvę.</p><a class="cta" href="#poreikis">Aprašyti poreikį</a>';
const end='<section id="gidai"><h2>Trys klausimai prieš pasirinkimą</h2><p>Medžiagų palyginimas · Pasiruošimas užklausai · Kasdienė priežiūra</p></section><section id="poreikis"><h2>Pirmiausia — klausimas.</h2><p>Informacinis projektas. Užklausa nėra gamybos ar montavimo užsakymas.</p></section>';
await writeFile(path.join(studies,'a.html'),common+'<main>'+copy+'<img class="hero" src="hero.png" alt="Akmens paviršius">'+end+'</main>');
await writeFile(path.join(studies,'b.html'),common+'<main class="board"><div><h1>Rinkitės pagal savo kasdienybę.</h1><p>Keturi paviršiai, skirtingi klausimai. Pirmiausia supraskite medžiagą.</p><a class="cta" href="#gidai">Palyginti medžiagas</a></div><img src="materials.png" alt="Paviršių pavyzdžiai"></main><main>'+end+'</main>');
await writeFile(path.join(studies,'c.html'),common+'<main><h1>Ką žinote apie savo virtuvę?</h1><div class="split"><div><p>Forma ir matmenys</p><hr><p>Plautuvė ir kaitlentė</p><hr><p>Medžiaga ir priežiūra</p><hr><a class="cta" href="#poreikis">Paruošti poreikio aprašą</a></div><img class="hero" src="hero.png" alt="Stalviršio interjeras"></div>'+end+'</main>');
const target=path.join(base,'output/akmenas-production');await mkdir(target,{recursive:true});
const allowed=['app','build','components','config','content-packages','db','drizzle','lib','public','scripts','tests','.openai'];
async function copyDir(src,dst){await mkdir(dst,{recursive:true});for(const item of await readdir(src,{withFileTypes:true})){if(item.isSymbolicLink()||item.name.startsWith('.env')||item.name.startsWith('.dev.vars')||/credential|secret|prisijung/i.test(item.name))continue;const s=path.join(src,item.name),d=path.join(dst,item.name);if(item.isDirectory())await copyDir(s,d);else await copyFile(s,d);}}
for(const name of allowed)await copyDir(path.join(core,name),path.join(target,name));
for(const name of ['package.json','package-lock.json','vite.config.ts','next.config.ts','tsconfig.json','next-env.d.ts','proxy.ts','eslint.config.mjs','postcss.config.mjs','components.json']){try{await copyFile(path.join(core,name),path.join(target,name));}catch(e){if(e.code!=='ENOENT')throw e;}}
try{await stat(path.join(target,'node_modules'));}catch{await symlink(path.join(core,'node_modules'),path.join(target,'node_modules'),'junction');}
console.log(JSON.stringify({target,fontSources:fontSources.length,studies,secretFilesCopied:false}));
