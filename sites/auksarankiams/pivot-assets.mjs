import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {saveResponsiveAsset} from '../../content-studio/src/model.mjs';
const dir=path.join(import.meta.dirname,'media-handyman');await mkdir(dir,{recursive:true});
const files=['exec-22b99d60-82a5-4a57-bd07-ca775edeb187.png','exec-f4d18120-0793-4e3d-b97c-fd877fea6e2a.png','exec-9f33de4c-ab44-4caa-a1d5-485d318e5dba.png','exec-a31bfeae-7f56-4729-bace-194bf2218bed.png'];
const names=['hero','baldai','sarasas','detale'];
const alts=['Darbo laukianti lentyna, paveikslas ir karnizas šviesiame kambaryje','Baldo plokštės, supakuotos detalės ir iliustracinė surinkimo instrukcija','Trys nedideli namų darbai ir užrašų lapas jų sąrašui','Nuimta baldo durelė su metaliniu vyriu ant apsauginio pagrindo'];
const prompts=JSON.parse(await readFile(path.join(dir,'prompts.json'),'utf8')),assets=[];
for(let i=0;i<files.length;i++){const src='C:/Users/lenovo/.codex/generated_images/01a0f579-aaf9-7cb2-a0fc-8f0ed6c30d63/'+files[i];await copyFile(src,path.join(dir,names[i]+'.png'));const family=await saveResponsiveAsset('auksarankiams',{mime:'image/png',alt:alts[i],rights:'Originalus AI sukurtas redakcinis vaizdas. Iliustracija, ne klientų darbų įrodymas, gaminio instrukcija ar išmatuota detalė.',prompt:prompts[i],credit:''},await readFile(src));assets.push({name:names[i],...family});}
await writeFile(path.join(dir,'assets.json'),JSON.stringify(assets,null,2));
const fontDir='C:/Users/lenovo/Documents/dovanos-memorycasting/public/fonts/auksarankiams';
const cssUrl='https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&display=swap';
let css=await(await fetch(cssUrl,{headers:{'user-agent':'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36'}})).text();let n=0;const sources=[];
for(const url of new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)||[])){const filename='bricolage-'+n+++'.woff2';await writeFile(path.join(fontDir,filename),Buffer.from(await(await fetch(url)).arrayBuffer()));css=css.replaceAll(url,'/fonts/auksarankiams/'+filename);sources.push({url,filename});}
await writeFile(path.join(fontDir,'handyman.css'),css);const license='https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt';await writeFile(path.join(fontDir,'Bricolage-OFL.txt'),await(await fetch(license)).text());await writeFile(path.join(import.meta.dirname,'FONT-PROVENANCE-HANDYMAN.json'),JSON.stringify({cssUrl,sources,license,at:new Date().toISOString()},null,2));console.log('Imported four responsive families and self-hosted Bricolage Grotesque');
