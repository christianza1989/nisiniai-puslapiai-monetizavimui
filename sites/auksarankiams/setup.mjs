import { mkdir, writeFile, copyFile, readFile, readdir, stat, symlink } from 'node:fs/promises';
import path from 'node:path';
import { saveResponsiveAsset } from '../../content-studio/src/model.mjs';
const dir=import.meta.dirname, core='C:/Users/lenovo/Documents/dovanos-memorycasting';
await mkdir(path.join(dir,'media'),{recursive:true});
const prompts=JSON.parse(await readFile(path.join(dir,'media/prompts.json'),'utf8'));
const files=['exec-fdec9b42-6f9c-468e-a7aa-d0a33d28177b.png','exec-a9b52367-aed0-4354-a79d-aa885f7c571a.png','exec-d2b90e60-5b64-4531-aa97-eba28de4b8b0.png','exec-c89fefe2-d69a-41a0-8431-6fa691317016.png'];
const names=['hero','priemones','atvirukas','mastelis'];
const alts=['Popieriniai lapų motyvai ant kreminio atviruko, žirklės ir popieriaus atraižos','Žirklės, liniuotė, pieštukas, klijų pieštukas ir spalvoto popieriaus lapai','Pastatytas rankų darbo atvirukas su dviem popieriniais lapais','Atspausdintas kontūras, liniuotė ir iškirpta popierinė lapo forma'];
const assets=[];
for(let i=0;i<files.length;i++){
 const original=path.join('C:/Users/lenovo/.codex/generated_images/01a0f579-aaf9-7cb2-a0fc-8f0ed6c30d63',files[i]);
 await copyFile(original,path.join(dir,'media',names[i]+'.png'));
 const family=await saveResponsiveAsset('auksarankiams',{mime:'image/png',alt:alts[i],rights:'Originalus šiam projektui integruotu ImageGen sukurtas redakcinis vaizdas. Ne kliento darbas ir ne parduodama prekė.',prompt:prompts[i],credit:''},await readFile(original));
 assets.push({name:names[i],...family});
}
await writeFile(path.join(dir,'media/assets.json'),JSON.stringify(assets,null,2));
const fontDir=path.join(core,'public/fonts/auksarankiams');await mkdir(fontDir,{recursive:true});
const cssUrl='https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap';
const response=await fetch(cssUrl,{headers:{'user-agent':'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36'}});if(!response.ok)throw new Error('fonts '+response.status);
let css=await response.text();let n=0;const sources=[];
for(const url of new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)||[])){
 const file='newsreader-'+n+++'.woff2';const r=await fetch(url);if(!r.ok)throw new Error('font source');await writeFile(path.join(fontDir,file),new Uint8Array(await r.arrayBuffer()));css=css.replaceAll(url,'/fonts/auksarankiams/'+file);sources.push({url,file});
}
const license=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt');if(!license.ok)throw new Error('font license');await writeFile(path.join(fontDir,'OFL.txt'),await license.text());
await writeFile(path.join(fontDir,'fonts.css'),css);
await writeFile(path.join(dir,'FONT-PROVENANCE.json'),JSON.stringify({at:new Date().toISOString(),cssUrl,sources,license:'SIL OFL 1.1',body:'system-ui',lithuanian:'Latin extended range included'},null,2));
console.log(JSON.stringify(assets.map(a=>({name:a.name,keys:Object.keys(a)}))));
